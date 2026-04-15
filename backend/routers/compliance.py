"""
Compliance Router — FMR-1 Draft endpoints
Phase B: RBI Compliance Engine v2.2 (Persistent Storage)
"""
from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import Response
from services import compliance_service
from services.database_service import db_service
from typing import Optional

router = APIRouter()


@router.get("/queue")
async def get_compliance_queue():
    """Returns the full compliance report history from the database."""
    queue = compliance_service.get_queue()
    stats = db_service.get_compliance_stats()
    return {
        "queue": queue,
        "total": stats["total_reports"],
        "pending": stats["pending_review"],
    }


@router.get("/download/{txn_id}")
async def download_fmr1(txn_id: str):
    """Download FMR-1 draft PDF for a specific transaction."""
    item = compliance_service.get_fmr1_draft(txn_id)
    if not item or not item.get("pdf"):
        return {"error": "Report not ready or not found"}
    return Response(
        content=item["pdf"],
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="FMR1_DRAFT_{txn_id}.pdf"'},
    )


@router.post("/generate/{txn_id}")
async def force_generate_fmr1(txn_id: str, background_tasks: BackgroundTasks):
    """Force-regenerate an FMR-1 draft for any transaction in the compliance queue."""
    item = compliance_service.get_fmr1_draft(txn_id)
    if not item:
        return {"error": "Transaction not found in compliance database"}

    async def _regen():
        pdf = await compliance_service.generate_fmr1_draft(
            transaction={"transaction_id": txn_id, "user_id": item.get("user_id"), 
                         "amount": item.get("amount")},
            fraud_score=item.get("fraud_score", 0),
            graph_data={},
            llm_explanation=item.get("llm_explanation", ""),
            institution_type=item.get("institution_type", "NBFC"),
        )
        # Re-save to DB + disk
        compliance_service.queue_fmr1(
            transaction_id=txn_id,
            pdf_bytes=pdf,
            transaction={"transaction_id": txn_id, "user_id": item.get("user_id"),
                        "amount": item.get("amount")},
            fraud_score=item.get("fraud_score", 0),
            llm_explanation=item.get("llm_explanation", ""),
            institution_type=item.get("institution_type", "NBFC"),
        )

    background_tasks.add_task(_regen)
    return {"status": "Regeneration queued", "transaction_id": txn_id}
