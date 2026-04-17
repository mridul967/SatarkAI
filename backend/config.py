from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    anthropic_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None

    # SLM Integration (Phase 2.5) — all disabled by default
    USE_LOCAL_SLM: bool = False
    SLM_ENDPOINT: str = 'http://localhost:8765/generate'
    COLLECT_TRAINING_DATA: bool = False
    TRAINING_DATA_PATH: str = './slm_training/training_data.jsonl'
    
    class Config:
        env_file = ".env"

settings = Settings()
