"""
Prepares training data for SatarkAI Phase A3.
1. Loads IEEE-CIS subset (50k rows, preserving fraud cases).
2. Performs Entity Resolution (hashing card info + addr + email).
3. Constructs Edges (connect transactions sharing the same entity).
4. Feature Engineering & Scaling.
5. Saves artifacts for training.
"""
import os
import pandas as pd
import numpy as np
import torch
from torch_geometric.data import Data
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
import hashlib

# Path handling for local vs container execution
BASE_PATH = "backend/" if os.path.exists("backend") else ""
DATA_DIR  = f"{BASE_PATH}ml/data/ieee_cis"
OUT_DIR   = f"{BASE_PATH}ml/data"

def prepare_data():
    if not os.path.exists(f"{DATA_DIR}/train_transaction.csv"):
        print(f"Error: Dataset not found in {DATA_DIR}. Please place IEEE-CIS CSVs there.")
        return

    print("Loading IEEE-CIS subset (50k rows)...")
    txn = pd.read_csv(f"{DATA_DIR}/train_transaction.csv", nrows=100000) # Load 100k, then sample back to 50k
    idn = pd.read_csv(f"{DATA_DIR}/train_identity.csv")
    df  = txn.merge(idn, on="TransactionID", how="left")
    
    # 1. Sample 50k rows to keep training fast, but KEEP ALL FRAUD
    fraud = df[df["isFraud"] == 1]
    legit = df[df["isFraud"] == 0].sample(n=min(50000-len(fraud), len(df[df["isFraud"] == 0])), random_state=42)
    df = pd.concat([fraud, legit]).sample(frac=1.0, random_state=42).reset_index(drop=True)
    
    print(f"Dataset sampled: {len(df)} rows ({len(fraud)} fraud cases)")

    # 2. Entity Resolution (Identify users)
    # We use card1-6 + P_emaildomain + addr1 as a proxy for a User Entity ID
    identity_cols = ['card1', 'card2', 'card3', 'card4', 'card5', 'card6', 'addr1', 'P_emaildomain']
    df['entity_string'] = df[identity_cols].fillna('missing').astype(str).agg('-'.join, axis=1)
    df['entity_id'] = df['entity_string'].map({val: i for i, val in enumerate(df['entity_string'].unique())})

    # 3. Construct Edges
    # Edge exists between transaction i and transaction j if they share the same entity_id
    print("Building transaction graph edges...")
    edge_list = []
    # This is an O(N^2) operation if done naively. We'll group by entity_id.
    for entity, group in df.groupby('entity_id'):
        indices = group.index.tolist()
        if len(indices) > 1:
            for i in range(len(indices)):
                for j in range(i + 1, len(indices)):
                    edge_list.append([indices[i], indices[j]])
                    edge_list.append([indices[j], indices[i]]) # Undirected
    
    if not edge_list:
        # Fallback to self-loops if no clusters found in small subset
        edge_index = torch.tensor([[i for i in range(len(df))], [i for i in range(len(df))]], dtype=torch.long)
    else:
        edge_index = torch.tensor(edge_list, dtype=torch.long).t().contiguous()
    
    print(f"Graph constructed with {edge_index.shape[1]} edges")

    # 4. Feature Engineering
    print("Engineering features...")
    # Numerical features
    num_cols = ['TransactionAmt', 'dist1', 'D1', 'D3', 'C1', 'C2', 'V1', 'V12', 'V36']
    df[num_cols] = df[num_cols].fillna(0)
    scaler = StandardScaler()
    df[num_cols] = scaler.fit_transform(df[num_cols])
    
    # Categorical features
    cat_cols = ['ProductCD', 'card4', 'card6', 'P_emaildomain', 'DeviceType']
    for col in cat_cols:
        df[col] = LabelEncoder().fit_transform(df[col].fillna('missing').astype(str))
    
    # Final feature set (Match ModelService expectations: 4 features in skeleton, expanded to 14 here)
    final_features = num_cols + cat_cols
    X_data = df[final_features].values.astype(np.float32)
    y_data = df['isFraud'].values.astype(np.float32)

    # 5. Save Artifacts
    print(f"Saving artifacts to {OUT_DIR}...")
    
    # Save graph for GNN
    indices = np.arange(len(df))
    train_idx, val_idx = train_test_split(indices, test_size=0.2, stratify=y_data, random_state=42)
    train_mask = torch.zeros(len(df), dtype=torch.bool)
    val_mask   = torch.zeros(len(df), dtype=torch.bool)
    train_mask[train_idx] = True
    val_mask[val_idx]     = True
    
    graph_data = Data(
        x=torch.tensor(X_data, dtype=torch.float),
        y=torch.tensor(y_data, dtype=torch.float),
        edge_index=edge_index,
        train_mask=train_mask,
        val_mask=val_mask
    )
    torch.save(graph_data, f"{OUT_DIR}/satark_train_graph.pt")
    
    # Save tabular for LGBM
    df['label'] = y_data
    df[final_features + ['label']].to_parquet(f"{OUT_DIR}/satark_train_tabular.parquet")
    
    # Save metadata for ModelService / export
    metadata = {
        "features": final_features,
        "num_features": len(final_features),
        "mean_amt": float(df['TransactionAmt'].mean()),
    }
    import json
    with open(f"{OUT_DIR}/training_metadata.json", "w") as f:
        json.dump(metadata, f)

    print("✓ Data preparation complete.")

if __name__ == "__main__":
    prepare_data()
