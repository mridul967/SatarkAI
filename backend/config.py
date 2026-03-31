from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    anthropic_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    
    class Config:
        env_file = ".env"

settings = Settings()
