import math
from models.schemas import Transaction

def extract_features(txn: Transaction) -> dict:
    # Feature extraction logic as required by SatarkAI
    dt = txn.timestamp
    seconds_in_day = 86400
    current_second = dt.hour * 3600 + dt.minute * 60 + dt.second
    fract = current_second / seconds_in_day
    
    hour_sin = math.sin(2 * math.pi * fract)
    hour_cos = math.cos(2 * math.pi * fract)
    amount_log = math.log1p(txn.amount)
    
    # In production, lookups would be used to find proper statistics and merchant risk.
    # We are simulating z-scores or risks for the sake of real-time prediction
    amount_zscore = (txn.amount - 100) / 50.0  # mock representation
    merchant_risk = float(hash(txn.merchant_id) % 100) / 100.0
    velocity_flag = False
    
    # Mock deterministic account age for Census logic
    account_age_days = (hash(txn.user_id) % 180) + 1  # 1 to 180 days
    
    return {
        "amount_log": amount_log,
        "hour_sin": hour_sin,
        "hour_cos": hour_cos,
        "amount_zscore": amount_zscore,
        "merchant_risk": merchant_risk,
        "velocity_flag": velocity_flag,
        "account_age_days": account_age_days
    }
