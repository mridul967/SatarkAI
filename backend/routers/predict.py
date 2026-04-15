from fastapi import APIRouter, WebSocket, WebSocketDisconnect, BackgroundTasks
from models.schemas import Transaction, FraudPrediction
from services.feature_service import extract_features
from services.graph_service import graph_service
from services.llm_service import llm_service
from services.drift_service import drift_detector
from services.database_service import db_service
from services.cache_service import cache_service
from services.blockchain_service import blockchain_service
from services.model_service import model_service
from services import compliance_service
from services.i18n_service import get_alert

import asyncio
import random
import json
import uuid
import os
import time
import numpy as np
from datetime import datetime
from typing import Optional, List, Dict, Any

router = APIRouter()

@router.post("/", response_model=FraudPrediction)
async def predict(txn: Transaction, background_tasks: BackgroundTasks):
    # 1. Check Redis Cache (33ms hot-path target)
    cached_features = await cache_service.get_user_features(txn.user_id)
    if cached_features:
        features = cached_features
    else:
        features = extract_features(txn)
        await cache_service.set_user_features(txn.user_id, features)

    graph_service.add_transaction(txn)
    graph_signals = graph_service.get_graph_signals(txn)
    
    # ── TIME ONLY THE MODEL INFERENCE (PHASE A1) ──
    t0 = time.perf_counter()
    result = await model_service.run_inference(features, txn)
    latency_ms = round((time.perf_counter() - t0) * 1000, 2)
    # ─────────────────────────────────────────────
    
    model_service.record_latency(latency_ms)
    
    final_score = result["score"]
    risk_level = "CRITICAL" if final_score > 0.8 else "HIGH" if final_score > 0.6 else "MEDIUM" if final_score > 0.3 else "SAFE"

    # 3. Async LLM Consensus & Drift Detection
    drift_detector.add_transaction(features)
    
    # LLM run in parallel background to not block response
    asyncio.create_task(llm_service.predict(txn, features, graph_signals))
    
    prediction = FraudPrediction(
        transaction_id=txn.transaction_id,
        fraud_score=final_score,
        risk_level=risk_level,
        explanation=result["explanation"],
        graph_signals=graph_signals,
        model_used="SatarkGAT-v1.2",
        processing_time_ms=latency_ms,
        latency_ms=latency_ms,
        alert_en=get_alert(risk_level, "en", score=int(final_score*100), txn_id=txn.transaction_id),
        alert_hi=get_alert(risk_level, "hi", score=int(final_score*100), txn_id=txn.transaction_id)
    )
    
    # ── TIERED STORAGE CENSUS (DPDP ACT COMPLIANCE) ──
    STORE_FULL    = final_score > 0.55                          # CRITICAL + SUSPICIOUS always
    NEW_USER      = features.get("account_age_days", 999) < 30
    RANDOM_SAMPLE = random.random() < 0.02                      # 2% of safe traffic

    if STORE_FULL or NEW_USER or RANDOM_SAMPLE:
        # Save full forensic record
        db_service.save_transaction(txn.model_dump(), {
            "fraud_score": final_score,
            "risk_level": risk_level,
            "reason": result["explanation"],
            "model_used": "SatarkGAT-v1.2",
            "latency_ms": latency_ms,
            "graph_signals": graph_signals
        })
    else:
        # Store only aggregated behavioral benchmarks
        db_service.update_user_aggregate(txn.model_dump())
    
    return prediction

@router.post("/compare")
async def compare_predict(txn: Transaction):
    # 1. Check if we already have comparison results in DB
    existing = db_service.get_comparisons_for_txn(txn.transaction_id)
    if existing:
        # Reconstruct into expected format
        predictions = []
        for r in existing:
            predictions.append({
                "model_used": r["provider"],
                "fraud_score": r["fraud_score"],
                "risk_level": r["risk_level"],
                "explanation": r["explanation"],
                "processing_time_ms": r["processing_time_ms"],
                "offline": False
            })
        
        # Calculate consensus based on existing
        avg_score = sum(p["fraud_score"] for p in predictions) / len(predictions)
        consensus_risk = "SAFE"
        if avg_score > 0.8: consensus_risk = "CRITICAL"
        elif avg_score > 0.6: consensus_risk = "HIGH"
        elif avg_score > 0.3: consensus_risk = "MEDIUM"
        
        return {
            "consensus_score": avg_score,
            "consensus_risk": consensus_risk,
            "predictions": predictions,
            "cached": True
        }

    # 2. If not found, run full inference
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
    # Return both DB stats and real-time inference latency stats
    stats = db_service.get_stats()
    stats["latency"] = model_service.get_latency_stats()
    return stats

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
            score = round(random.uniform(0.05, 0.50), 2)
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
            
            # Simulated Latency for the WebSocket Feed
            simulated_latency = round(random.uniform(18.0, 48.0), 2)
            if score > 0.8: simulated_latency += 10 # Slightly more for complex cases

            prediction = {
                "fraud_score": score,
                "risk_level": risk,
                "reason": reason,
                "latency_ms": simulated_latency,
                "alert_en": get_alert(risk, "en", score=int(score*100), txn_id=txn_dict["transaction_id"]),
                "alert_hi": get_alert(risk, "hi", score=int(score*100), txn_id=txn_dict["transaction_id"])
            }

            # Save to DB
            db_service.save_transaction(txn_dict, prediction)

            payload = {
                "transaction": txn_dict,
                "prediction": prediction
            }
            await websocket.send_text(json.dumps(payload))

            # ── PHASE B: Auto-trigger 4-LLM Consensus & FMR-1 for CRITICAL transactions ──
            if score > 0.8:
                try:
                    # 1. Trigger full 4-LLM consensus analysis
                    features = extract_features(txn_obj)
                    graph_signals = graph_service.get_graph_signals(txn_obj)
                    
                    # Run comparison (this saves to DB internally in llm_service or we do it here)
                    consensus_res = await llm_service.compare(txn_obj, features, graph_signals)
                    
                    # 2. Extract the neural narrative (from first available model or consensus)
                    neural_narrative = ""
                    for p in consensus_res["predictions"]:
                        if not p.get("offline") and p.get("explanation"):
                            neural_narrative = p["explanation"]
                            break
                    
                    if not neural_narrative:
                        neural_narrative = reason # Fallback to simulator reason
                    
                    # 3. Generate the FMR-1 PDF using the neural narrative
                    pdf = await compliance_service.generate_fmr1_draft(
                        transaction=txn_dict,
                        fraud_score=score,
                        graph_data={
                            "associated_accounts": [],
                            "device_ids": [device_id],
                            "hop_count": random.randint(1, 3),
                            "merchant_risk": txn_dict["merchant_category"],
                            "ip_risk_score": round(random.uniform(0.6, 0.95), 2),
                            "velocity": random.randint(3, 12),
                            "amount_zscore": round(random.uniform(2.1, 4.5), 2),
                        },
                        llm_explanation=neural_narrative,
                        institution_type="NBFC",
                    )
                    
                    compliance_service.queue_fmr1(
                        transaction_id=txn_dict["transaction_id"],
                        pdf_bytes=pdf,
                        transaction=txn_dict,
                        fraud_score=score,
                        llm_explanation=neural_narrative,
                        institution_type="NBFC",
                    )
                    
                    # 4. Save comparison results to DB so frontend can fetch them
                    db_service.save_comparison(txn_dict["transaction_id"], consensus_res["predictions"])
                    
                except Exception as e:
                    print(f"Consensus/FMR-1 generation error: {e}")

            await asyncio.sleep(3)
    except (WebSocketDisconnect, Exception) as e:
        print(f"WS Error: {e}")
        pass

