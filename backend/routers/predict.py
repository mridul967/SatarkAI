from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from models.schemas import Transaction, FraudPrediction
from services.feature_service import extract_features
from services.graph_service import graph_service
from services.llm_service import llm_service
from services.drift_service import drift_detector
from services.database_service import db_service

import asyncio
import random
import json
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

router = APIRouter()

@router.post("/", response_model=FraudPrediction)
async def predict(txn: Transaction):
    graph_service.add_transaction(txn)
    graph_signals = graph_service.get_graph_signals(txn)
    features = extract_features(txn)
    
    drift_detector.add_transaction(features)
    drift_detector.check_drift()
    
    result = await llm_service.predict(txn, features, graph_signals)
    
    prediction = FraudPrediction(
        transaction_id=txn.transaction_id,
        fraud_score=result["fraud_score"],
        risk_level=result["risk_level"],
        explanation=result["explanation"],
        graph_signals=graph_signals,
        model_used=result["model_used"],
        processing_time_ms=result["processing_time_ms"]
    )
    
    # Persist to DB
    db_service.save_transaction(txn.model_dump(), result)
    
    return prediction

@router.post("/compare")
async def compare_predict(txn: Transaction):
    graph_service.add_transaction(txn)
    graph_signals = graph_service.get_graph_signals(txn)
    features = extract_features(txn)
    result = await llm_service.compare(txn, features, graph_signals)
    
    # Save each model's prediction
    db_service.save_comparison(txn.transaction_id, result["predictions"])
    db_service.save_transaction(txn.model_dump(), {
        "fraud_score": result["consensus_score"],
        "risk_level": result["consensus_risk"],
        "reason": "4-model consensus",
        "model_used": "consensus"
    })
    
    return result

@router.get("/history")
async def get_history(limit: int = 50, start_date: Optional[str] = None, end_date: Optional[str] = None):
    return db_service.get_recent_transactions(limit, start_date, end_date)

@router.get("/stats")
async def get_stats():
    return db_service.get_stats()

# Realistic Simulator Pools & Profiles
USER_PROFILES = {
    "usr_1001": {"devices": ["dev_101"], "ips": ["103.21.244.1"], "locations": ["Mumbai"], "behavior": "consistent"},
    "usr_1002": {"devices": ["dev_102"], "ips": ["103.21.244.2", "45.33.32.156"], "locations": ["Delhi", "Bengaluru"], "behavior": "traveler"},
    "usr_1003": {"devices": ["dev_103", "dev_104", "dev_105"], "ips": ["192.168.1.50", "103.21.244.1"], "locations": ["Mumbai", "Chennai"], "behavior": "fraudster"},
    "usr_1004": {"devices": ["dev_101", "dev_102"], "ips": ["45.33.32.156"], "locations": ["Hyderabad"], "behavior": "shared_device"},
}

# Fallback pools for other users
USER_POOL = [f"usr_{i}" for i in range(1001, 1009)]
DEVICE_POOL = [f"dev_{i}" for i in range(101, 106)]
IP_POOL = ["103.21.244.1", "103.21.244.2", "192.168.1.50", "45.33.32.156"]
MERCHANT_POOL = ["mcht_crypto_1", "mcht_grocery_2", "mcht_electronics_3", "mcht_gaming_4"]
CATEGORY_POOL = ["crypto_exchange", "grocery", "electronics", "online_gaming"]
LOCATION_POOL = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai"]

async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            user_id = random.choice(USER_POOL)
            profile = USER_PROFILES.get(user_id)
            
            if profile:
                device_id = random.choice(profile["devices"])
                ip_address = random.choice(profile["ips"])
                location = random.choice(profile["locations"])
                behavior = profile["behavior"]
            else:
                device_id = random.choice(DEVICE_POOL)
                ip_address = random.choice(IP_POOL)
                location = random.choice(LOCATION_POOL)
                behavior = "random"

            merch_idx = random.randint(0, len(MERCHANT_POOL) - 1)
            
            # Base amount by behavior
            if behavior == "fraudster":
                amount = round(random.uniform(5000.0, 80000.0), 2)
            else:
                amount = round(random.uniform(50.0, 5000.0), 2)

            txn_dict = dict(
                transaction_id=f"txn_{uuid.uuid4().hex[:6]}",
                user_id=user_id,
                amount=amount,
                merchant_id=MERCHANT_POOL[merch_idx],
                device_id=device_id,
                ip_address=ip_address,
                timestamp=datetime.utcnow().isoformat() + "Z",
                location=location,
                merchant_category=CATEGORY_POOL[merch_idx],
            )

            txn_obj = Transaction(**txn_dict)
            graph_service.add_transaction(txn_obj)

            # Realistic Scoring Logic for Simulator
            score = 0.1
            reason = "Legitimate profile"
            
            if behavior == "fraudster" and amount > 15000:
                score = round(random.uniform(0.8, 0.99), 2)
                reason = "High risk behavior: Multiple devices and extreme amount."
            elif behavior == "shared_device" and amount > 8000:
                score = round(random.uniform(0.5, 0.75), 2)
                reason = "Medium risk: Shared device detected with unusual volume."
            elif amount > 40000:
                score = round(random.uniform(0.7, 0.9), 2)
                reason = "High risk: Large transaction outside normal bounds."
            elif amount < 500:
                score = round(random.uniform(0.01, 0.15), 2)
                reason = "Safe: Small transaction within typical bounds."
                
            risk = "CRITICAL" if score > 0.8 else "HIGH" if score > 0.6 else "MEDIUM" if score > 0.3 else "SAFE"

            prediction = {
                "fraud_score": score,
                "risk_level": risk,
                "reason": reason
            }

            # Save to DB
            db_service.save_transaction(txn_dict, prediction)

            payload = {
                "transaction": txn_dict,
                "prediction": prediction
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(3)
    except (WebSocketDisconnect, Exception) as e:
        print(f"WS Error: {e}")
        pass
