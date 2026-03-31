from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.llm_service import llm_service

router = APIRouter()

class KeyPayload(BaseModel):
    anthropic: Optional[str] = None
    openai: Optional[str] = None
    gemini: Optional[str] = None
    groq: Optional[str] = None

@router.post("/keys")
def update_llm_keys(keys: KeyPayload):
    # Map the incoming JSON to the format expected by our llm_service
    key_dict = {
        "anthropic_api_key": keys.anthropic,
        "openai_api_key": keys.openai,
        "google_api_key": keys.gemini,
        "groq_api_key": keys.groq
    }
    
    # Update running instances in memory. Subsequent calls to /compare will use new keys instantly.
    llm_service.update_keys(key_dict)
    
    return {"status": "success", "message": "Keys updated successfully and hot-reloaded into memory."}
