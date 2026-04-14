"""
Run once: python -m backend.ml.extract_fraud_distributions
Extracts statistical distributions of fraud cases from IEEE-CIS dataset.
Saves to backend/ml/data/fraud_distributions.json
Used by the demo attack engine to sample realistic fraud payloads.
"""
import json, os
import pandas as pd
import numpy as np

# Path handling for local vs container execution
BASE_PATH = "backend/" if os.path.exists("backend") else ""
DATA_DIR  = f"{BASE_PATH}ml/data/ieee_cis"
OUT_FILE  = f"{BASE_PATH}ml/data/fraud_distributions.json"

def extract():
    print("Loading IEEE-CIS dataset (optimized memory mode)...")
    
    # 1. Define only necessary columns to save ~80% memory
    txn_cols = [
        "TransactionID", "isFraud", "TransactionAmt", "card4", "card6", "ProductCD", 
        "P_emaildomain", "R_emaildomain", "addr1", "D1", "D3", "C1", "C2",
        "V1", "V2", "V3", "V4", "V12", "V13", "V14", "V15", "V17", "V20", "V23", "V36"
    ]
    idn_cols = ["TransactionID", "DeviceType"]

    # 2. Load with column filtering
    txn = pd.read_csv(f"{DATA_DIR}/train_transaction.csv", usecols=txn_cols)
    idn = pd.read_csv(f"{DATA_DIR}/train_identity.csv", usecols=idn_cols)
    
    print("Merging datasets...")
    df  = txn.merge(idn, on="TransactionID", how="left")
    
    # Clear memory of original loads
    del txn
    del idn

    # 3. Calculate aggregate stats for legit before deleting df
    legit_mean = float(df[df["isFraud"] == 0]["TransactionAmt"].mean())
    df_len = len(df)
    
    print("Filtering fraud cases...")
    fraud = df[df["isFraud"] == 1].copy()
    
    # We can drop the full df now to save more space
    del df

    print(f"Fraud cases: {len(fraud):,} | Total cases: {df_len:,}")

    def dist(series):
        s = series.dropna()
        return {
            "mean":  float(s.mean()),
            "std":   float(s.std()),
            "p10":   float(s.quantile(0.10)),
            "p25":   float(s.quantile(0.25)),
            "p50":   float(s.quantile(0.50)),
            "p75":   float(s.quantile(0.75)),
            "p90":   float(s.quantile(0.90)),
            "min":   float(s.min()),
            "max":   float(s.max()),
        }

    def top_values(series, n=5):
        return series.dropna().value_counts().head(n).index.tolist()

    distributions = {
        "fraud": {
            "TransactionAmt":   dist(fraud["TransactionAmt"]),
            "card4":            top_values(fraud["card4"]),       # visa/mastercard/etc
            "card6":            top_values(fraud["card6"]),       # debit/credit
            "ProductCD":        top_values(fraud["ProductCD"]),   # W/H/C/S/R
            "P_emaildomain":    top_values(fraud["P_emaildomain"], 8),
            "R_emaildomain":    top_values(fraud["R_emaildomain"], 8),
            "DeviceType":       top_values(fraud["DeviceType"]),
            "addr1_dist":       dist(fraud["addr1"].dropna()),
            "D1_dist":          dist(fraud["D1"].dropna()),   # days since last txn
            "D3_dist":          dist(fraud["D3"].dropna()),   # days since last addr change
            "C1_dist":          dist(fraud["C1"].dropna()),   # num addresses
            "C2_dist":          dist(fraud["C2"].dropna()),   # num payment methods
            "V_features":       {
                f"V{i}": dist(fraud[f"V{i}"].dropna())
                for i in [1,2,3,4,12,13,14,15,17,20,23,36]
                if f"V{i}" in fraud.columns
            },
        },
        "high_alert": {
            # 80th-90th percentile of fraud — less extreme signatures
            "TransactionAmt": dist(fraud[
                fraud["TransactionAmt"].between(
                    fraud["TransactionAmt"].quantile(0.5),
                    fraud["TransactionAmt"].quantile(0.85)
                )
            ]["TransactionAmt"]),
            "D1_dist": dist(fraud[fraud["D1"] < fraud["D1"].quantile(0.7)]["D1"].dropna()),
        },
        "metadata": {
            "total_fraud_cases": int(len(fraud)),
            "total_legit_cases": int(df_len - len(fraud)),
            "fraud_rate":        round(len(fraud) / df_len, 4),
            "amt_mean_fraud":    float(fraud["TransactionAmt"].mean()),
            "amt_mean_legit":    legit_mean,
        }
    }

    os.makedirs(f"{BASE_PATH}ml/data", exist_ok=True)
    with open(OUT_FILE, "w") as f:
        json.dump(distributions, f, indent=2)

    print(f"✓ Distributions saved to {OUT_FILE}")
    print(f"  Fraud avg amount: ₹{distributions['metadata']['amt_mean_fraud']:,.2f}")
    print(f"  Fraud rate: {distributions['metadata']['fraud_rate']*100:.1f}%")

if __name__ == "__main__":
    extract()
