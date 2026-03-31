from fastapi import APIRouter

router = APIRouter()

@router.get("/{txn_id}")
async def explain_transaction(txn_id: str):
    return {
        "explanation_markdown": f"### SatarkAI Context for {txn_id}\n\n- **Score:** 0.85\n- **Factors:** Graph signal showed 3 distinct devices logged in over a 24-hr period originating from diverse geo-locations.\n- **Action:** Flagged."
    }
