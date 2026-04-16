from fastapi import APIRouter
from pydantic import BaseModel, Field
from services.calibration_service import calibration_service
from services.drift_service import get_drift_report

router = APIRouter()

@router.get("/{txn_id}")
async def explain_transaction(txn_id: str):
    return {
        "explanation_markdown": f"### SatarkAI Context for {txn_id}\n\n- **Score:** 0.85\n- **Factors:** Graph signal showed 3 distinct devices logged in over a 24-hr period originating from diverse geo-locations.\n- **Action:** Flagged."
    }

class AnalystFeedback(BaseModel):
    txn_id: str
    raw_score: float = Field(..., ge=0.0, le=1.0)
    analyst_label: int = Field(..., ge=0, le=1)  # 0=false_positive, 1=confirmed_fraud
    analyst_note: str | None = None

@router.post("/analyst/feedback")
async def submit_analyst_feedback(payload: AnalystFeedback):
    """
    Records analyst override and triggers Platt Scaling recalibration
    every 10 overrides.
    """
    stats = await calibration_service.record_feedback(
        raw_score=payload.raw_score,
        analyst_label=payload.analyst_label,
    )

    return {
        "status": "ok",
        "txn_id": payload.txn_id,
        "recalibration_triggered": stats["overrides_processed"] % 10 == 0,
        "calibration_stats": stats,
    }

@router.get("/calibration/stats")
async def get_calibration_stats():
    """Live calibration status — used by UI drift banner."""
    return calibration_service.get_stats()

@router.get("/drift/status")
async def get_drift_status():
    return get_drift_report()
