import lightgbm as lgb
import pandas as pd
import numpy as np
import pickle
import os
import time
import json

# Path handling
BASE_PATH = "backend/" if os.path.exists("backend") else ""
DATA_FILE  = f"{BASE_PATH}ml/data/satark_train_tabular.parquet"
MODEL_PATH = f"{BASE_PATH}models/satark_lgbm.pkl"

def train_lgbm():
    if not os.path.exists(DATA_FILE):
        print(f"Error: Training data {DATA_FILE} not found. Run prepare_training_data.py first.")
        return
        
    print("Loading tabular data...")
    df = pd.read_parquet(DATA_FILE)
    
    # Identify label and features
    y = df['label']
    X = df.drop(columns=['label', 'entity_string', 'entity_id', 'TransactionID'], errors='ignore')
    
    print(f"Training LightGBM on {len(df)} rows with {X.shape[1]} features...")

    # Parameters optimized for fraud detection (high imbalance)
    params = {
        'objective': 'binary',
        'metric': 'auc',
        'learning_rate': 0.05,
        'num_leaves': 31,
        'feature_fraction': 0.8,
        'bagging_fraction': 0.7,
        'bagging_freq': 5,
        'scale_pos_weight': (y == 0).sum() / (y == 1).sum(), # Handle imbalance
        'verbose': -1,
        'seed': 42
    }
    
    # Split for simple validation
    train_size = int(0.8 * len(df))
    X_train, X_val = X[:train_size], X[train_size:]
    y_train, y_val = y[:train_size], y[train_size:]
    
    dtrain = lgb.Dataset(X_train, label=y_train)
    dval   = lgb.Dataset(X_val, label=y_val, reference=dtrain)
    
    model = lgb.train(
        params,
        dtrain,
        num_boost_round=500,
        valid_sets=[dval],
        callbacks=[
            lgb.early_stopping(stopping_rounds=30),
            lgb.log_evaluation(period=50)
        ]
    )
    
    print("✓ LightGBM training complete.")
    
    # Save model and feature names (critical for ONNX conversion)
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump({
            'model': model,
            'features': list(X.columns)
        }, f)
    print(f"Model saved to {MODEL_PATH}")

    # --- Neural Audit Ledger Generation ---
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
    import json
    
    print("Generating Neural Audit Ledger...")
    y_prob = model.predict(X_val)
    y_pred = (y_prob > 0.5).astype(int)
    
    audit_data = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "metrics": {
            "accuracy": float(accuracy_score(y_val, y_pred)),
            "precision": float(precision_score(y_val, y_pred)),
            "recall": float(recall_score(y_val, y_pred)),
            "f1": float(f1_score(y_val, y_pred)),
            "auc": float(roc_auc_score(y_val, y_prob))
        },
        "checkpoint": os.path.basename(MODEL_PATH)
    }
    
    audit_path = f"{BASE_PATH}models/audit_ledger.json"
    with open(audit_path, 'w') as f:
        json.dump(audit_data, f, indent=4)
    print(f"✓ Neural Audit Ledger updated: {audit_path}")

if __name__ == '__main__':
    train_lgbm()
