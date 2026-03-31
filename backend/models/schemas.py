from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Transaction(BaseModel):
    transaction_id: str
    user_id: str
    amount: float
    merchant_id: str
    device_id: str
    ip_address: str
    timestamp: datetime
    location: str
    merchant_category: str

class FraudPrediction(BaseModel):
    transaction_id: str
    fraud_score: float
    risk_level: str
    explanation: str
    graph_signals: List[str]
    model_used: str
    processing_time_ms: float
