"""
Compliance Service — FMR-1 Draft Generation (Phase B: RBI Compliance Engine v2.2)

Generates RBI-compliant Fraud Monitoring Return (FMR-1) draft reports.

LEGAL NOTES (RBI Master Directions July 2024):
  - No minimum threshold: FMR-1 required for ALL confirmed fraud amounts
    (₹1 lakh threshold removed in July 2024 Master Directions)
  - Timeline: 14 days for NBFCs/Cooperative Banks; 7 days for Commercial Banks
  - Three FMR returns: FMR-1 (individual case), FMR-3 (quarterly), RBR (theft/robbery)
  - IBA notification required if third-party service providers are involved
  - SatarkAI generates DRAFT only — regulated institution submits via RBI CIMS portal
"""
import io
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

import os

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (SimpleDocTemplate, Table, TableStyle,
                                Paragraph, Spacer)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm

from services.database_service import db_service


async def generate_fmr1_draft(
    transaction: dict,
    fraud_score: float,
    graph_data: dict,
    llm_explanation: str,
    institution_type: str = "NBFC",  # "NBFC", "COOPERATIVE_BANK", "COMMERCIAL_BANK"
) -> bytes:
    """
    Auto-generates a pre-filled FMR-1 draft PDF.

    LEGAL NOTE: This is a DRAFT for compliance officer review only.
    SatarkAI is not a regulated entity. The compliance officer must
    validate and submit via RBI CIMS portal (https://cims.rbi.org.in).

    Reporting timeline (RBI Master Directions July 2024):
      - Commercial Banks: 7 days from date of fraud classification
      - NBFCs + Cooperative Banks: 14 days from date of fraud classification
      - Threshold: NONE — all confirmed fraud amounts must be reported
    """
    deadline_days = 7 if institution_type == "COMMERCIAL_BANK" else 14
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            rightMargin=20 * mm, leftMargin=20 * mm,
                            topMargin=15 * mm, bottomMargin=15 * mm)
    S = getSampleStyleSheet()
    H = ParagraphStyle("H", parent=S["Heading1"], fontSize=13,
                        textColor=colors.HexColor("#0C447C"))
    WARN = ParagraphStyle("W", parent=S["Normal"], fontSize=8,
                          textColor=colors.HexColor("#A32D2D"))
    BODY = ParagraphStyle("B", parent=S["Normal"], fontSize=9)
    FOOT = ParagraphStyle("F", parent=S["Normal"], fontSize=7,
                          textColor=colors.gray)
    els = []

    # ── Header ──────────────────────────────────────────────
    els += [
        Paragraph("FRAUD MONITORING RETURN — FMR-1 DRAFT", H),
        Paragraph(
            "⚠ AI-GENERATED DRAFT — Compliance officer must review, validate, "
            "and submit via RBI CIMS portal. SatarkAI is not a regulated entity "
            "and cannot submit on your behalf.", WARN),
        Spacer(1, 5 * mm),
    ]

    # ── Section 1: Transaction & Classification ────────────
    now = datetime.now()
    try:
        ts = transaction.get("timestamp", "")
        if isinstance(ts, str) and ts:
            det = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        elif isinstance(ts, (int, float)):
            det = datetime.fromtimestamp(ts)
        else:
            det = now
    except Exception:
        det = now

    els += [
        Paragraph("Section 1: Transaction & Classification Details", H),
        _table([
            ["Field", "Value", "Data Source"],
            ["Report date", now.strftime("%d/%m/%Y"), "Auto"],
            ["Date of occurrence", det.strftime("%d/%m/%Y"), "Transaction record"],
            ["Date of detection", now.strftime("%d/%m/%Y %H:%M"), "SatarkAI detection"],
            ["Date of classification", now.strftime("%d/%m/%Y"), "Compliance officer to confirm"],
            ["Reporting deadline", (now + timedelta(days=deadline_days)).strftime("%d/%m/%Y"),
             f"RBI MD 2024 — {deadline_days} days"],
            ["Transaction ID", transaction.get("transaction_id", "N/A"), "System"],
            ["Amount involved", f"₹{transaction.get('amount', 0):,.2f}", "Transaction record"],
            ["User / Sender ID", transaction.get("user_id", transaction.get("sender", "N/A")), "Transaction record"],
            ["Merchant / Receiver", transaction.get("merchant_id", transaction.get("receiver", "N/A")), "Transaction record"],
            ["Transaction type", transaction.get("merchant_category", "UPI P2P/P2M"), "Transaction metadata"],
            ["Fraud classification", _classify(transaction, fraud_score), "SatarkAI GNN"],
            ["Fraud sub-category", _subclassify(transaction), "SatarkAI scenario detection"],
            ["SatarkAI risk score", f"{fraud_score:.3f} ({fraud_score * 100:.1f}%)", "GNN inference"],
            ["Reporting institution type", institution_type, "Configuration"],
            ["IBA notification required", "Yes — if third-party provider involved", "RBI MD 2024 Clause 8.12.4"],
        ]),
        Spacer(1, 5 * mm),
    ]

    # ── Section 2: Network / GNN Relational Fields ─────────
    parties = graph_data.get("associated_accounts", [])
    devices = graph_data.get("device_ids", [transaction.get("device_id", "N/A")])
    els += [
        Paragraph("Section 2: Associated Parties (GNN Graph Analysis)", H),
        _table([
            ["Field", "Value", "Data Source"],
            ["Hops in fraud chain", str(graph_data.get("hop_count", "2")), "GNN 2-hop traversal"],
            ["Intermediate accounts", ", ".join(str(p) for p in parties[:5]) or "None detected", "GNN graph nodes"],
            ["Shared device fingerprints", ", ".join(str(d) for d in devices[:3]) or "None", "Device ring detector"],
            ["Merchant risk category", graph_data.get("merchant_risk", transaction.get("merchant_category", "Unknown")), "Merchant classifier"],
            ["IP risk score", str(graph_data.get("ip_risk_score", "N/A")), "IP reputation"],
            ["Location", transaction.get("location", "N/A"), "GeoIP"],
            ["Velocity (txns/10 min)", str(graph_data.get("velocity", "N/A")), "Feature engineering"],
            ["Amount Z-score", str(graph_data.get("amount_zscore", "N/A")), "Statistical baseline"],
        ]),
        Spacer(1, 5 * mm),
    ]

    # ── Section 3: LLM Modus Operandi ─────────────────────
    els += [
        Paragraph("Section 3: Modus Operandi (AI-Generated Narrative)", H),
        Paragraph(
            "Generated by 4-LLM consensus engine (Claude + Gemini Pro + GPT-4o + Groq Llama). "
            "Compliance officer must verify accuracy before submission.", WARN),
        Spacer(1, 2 * mm),
        Paragraph(llm_explanation or "LLM consensus pending — submit transaction for full analysis.", BODY),
        Spacer(1, 5 * mm),
    ]

    # ── Section 4: Preventative Action & Audit Trail ───────
    els += [
        Paragraph("Section 4: Preventative Action & Audit Trail", H),
        _table([
            ["Field", "Value"],
            ["Immediate action", "Transaction BLOCKED by SatarkAI pre-debit intercept"],
            ["Account status", "Flagged — pending compliance officer review"],
            ["Blockchain audit hash", graph_data.get("blockchain_hash", "Pending Polygon confirmation")],
            ["Cross-bank registry", "Hashed device fingerprint published to FraudSignalRegistry"],
            ["ML retraining queue", "Queued for active learning review cycle"],
            ["FMR-3 follow-up", "Quarterly progress update required — add to compliance calendar"],
        ]),
        Spacer(1, 8 * mm),
        Paragraph(
            "Generated by SatarkAI v2.2 | FMR-1 DRAFT ONLY | Ref: RBI Master Directions on "
            "Fraud Risk Management 2024 (DOS.CO.FMG.SEC.No.5/23.04.001/2024-25) | "
            "Submit via RBI CIMS portal only.", FOOT),
    ]

    doc.build(els)
    return buf.getvalue()


def queue_fmr1(transaction_id: str, pdf_bytes: bytes, transaction: dict,
               fraud_score: float, llm_explanation: str = "",
               institution_type: str = "NBFC"):
    """Save FMR-1 draft to database + disk for permanent storage."""
    risk_level = "CRITICAL" if fraud_score > 0.9 else "HIGH" if fraud_score > 0.8 else "MEDIUM" if fraud_score > 0.6 else "SAFE"
    db_service.save_compliance_report(
        transaction_id=transaction_id,
        user_id=transaction.get("user_id", "N/A"),
        amount=transaction.get("amount", 0),
        fraud_score=fraud_score,
        risk_level=risk_level,
        institution_type=institution_type,
        llm_explanation=llm_explanation,
        pdf_bytes=pdf_bytes,
    )


def get_queue() -> List[dict]:
    """Return all compliance reports from the database."""
    rows = db_service.get_compliance_reports()
    items = []
    for r in rows:
        items.append({
            "transaction_id": r["transaction_id"],
            "fraud_score": r["fraud_score"],
            "queued_at": r["created_at"],
            "status": r["status"],
            "amount": r["amount"],
            "user_id": r["user_id"],
            "institution_type": r["institution_type"],
        })
    return items


def get_fmr1_draft(transaction_id: str) -> Optional[dict]:
    """Retrieve a stored FMR-1 draft by transaction ID. Returns dict with pdf bytes."""
    report = db_service.get_compliance_report(transaction_id)
    if not report:
        return None
    # Read PDF from disk
    pdf_path = report.get("pdf_path", "")
    if pdf_path and os.path.exists(pdf_path):
        with open(pdf_path, 'rb') as f:
            report["pdf"] = f.read()
    else:
        report["pdf"] = None
    return report


def resolve_draft(transaction_id: str):
    """Mark a compliance draft as RESOLVED (Submitted)."""
    db_service.update_compliance_status(transaction_id, "RESOLVED")


# ── Private helpers ────────────────────────────────────────
def _classify(txn, score=0):
    s = txn.get("scenario", "")
    if s == "mule_ring":
        return "Internet Banking Related Fraud"
    if s == "device_ring":
        return "Account Takeover / Unauthorised Transaction"
    if score > 0.85:
        return "Suspicious Transaction — AI Detected"
    return "Suspicious Transaction — Pending Classification"


def _subclassify(txn):
    s = txn.get("scenario", "")
    if s == "mule_ring":
        return "Money Mule Chain (multi-hop layering)"
    if s == "device_ring":
        return "Device Fingerprint Sharing Ring"
    return "GNN Anomaly — Manual review required"


def _table(data):
    w = [60 * mm, 90 * mm, 30 * mm] if len(data[0]) == 3 else [70 * mm, 110 * mm]
    t = Table(data, colWidths=w)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E6F1FB")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0C447C")),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8F8F5")]),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#D3D1C7")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return t
