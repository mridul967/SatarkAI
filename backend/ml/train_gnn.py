import os
import torch
import torch.nn.functional as F
from torch_geometric.nn import GATConv
from torch_geometric.data import Data
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import mlflow
from typing import Optional

# Set device
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

class SatarkGAT(torch.nn.Module):
    def __init__(self, in_channels, hidden=64, heads=4, dropout=0.3):
        super().__init__()
        self.conv1 = GATConv(in_channels, hidden, heads=heads, dropout=dropout)
        self.conv2 = GATConv(hidden * heads, 32, heads=1, dropout=dropout)
        self.classifier = torch.nn.Linear(32, 1)
        self.dropout = torch.nn.Dropout(dropout)
    
    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index)
        x = F.elu(x)
        x = self.dropout(x)
        x = self.conv2(x, edge_index)
        x = F.elu(x)
        return torch.sigmoid(self.classifier(x)).squeeze(-1)

def train_model(data, model, epochs=100, lr=0.001):
    model.to(device)
    data = data.to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    criterion = torch.nn.BCELoss()
    
    model.train()
    for epoch in range(epochs):
        optimizer.zero_grad()
        out = model(data.x, data.edge_index)
        loss = criterion(out[data.train_mask], data.y[data.train_mask])
        loss.backward()
        optimizer.step()
        
        if epoch % 10 == 0:
            print(f'Epoch {epoch:03d}, Loss: {loss.item():.4f}')
            if mlflow.active_run():
                mlflow.log_metric("loss", loss.item(), step=epoch)

def load_ieee_cis_to_graph(data_path='data/'):
    """
    Simplified IEEE-CIS loader. In a real scenario, this would involve 
    sophisticated feature engineering and edge construction between Users, IPs, and Devices.
    """
    print("Loading IEEE-CIS dataset...")
    # This is a sample logic; actual file names may vary if not yet downloaded
    try:
        train_txn = pd.read_csv(os.path.join(data_path, 'train_transaction.csv'), nrows=10000)
        # Placeholder for complex graph construction:
        # 1. Nodes: Transactions
        # 2. Edges: Shared IP, Device, or Card
        
        # Simple feature set for demonstration
        features = train_txn[['TransactionAmt', 'dist1', 'dist2', 'C1']].fillna(0).values
        y = train_txn['isFraud'].values
        
        x = torch.tensor(features, dtype=torch.float)
        y = torch.tensor(y, dtype=torch.float)
        
        # Self-loop edges for skeleton
        edge_index = torch.tensor([[i for i in range(len(features))], 
                                   [i for i in range(len(features))]], dtype=torch.long)
        
        data = Data(x=x, y=y, edge_index=edge_index)
        
        # Basic mask
        indices = np.arange(len(features))
        train_idx, test_idx = train_test_split(indices, test_size=0.2)
        train_mask = torch.zeros(len(features), dtype=torch.bool)
        train_mask[train_idx] = True
        data.train_mask = train_mask
        
        return data
    except Exception as e:
        print(f"Dataset loading failed: {e}")
        return None

def load_or_init_model(in_channels=4):
    model_path = 'models/satark_gat_best.pt'
    model = SatarkGAT(in_channels=in_channels)
    if not os.path.exists('models'):
        os.makedirs('models')
        
    try:
        if os.path.exists(model_path):
            model.load_state_dict(torch.load(model_path, map_location=device))
            print("Successfully loaded pre-trained SatarkGAT checkpoint.")
        else:
            print("No checkpoint found. Initialized fresh SatarkGAT.")
    except Exception as e:
        print(f"Error loading model checkpoint: {e}")
    
    return model

if __name__ == "__main__":
    mlflow.start_run(run_name="SatarkGAT_Phase2")
    data = load_ieee_cis_to_graph()
    if data:
        model = load_or_init_model(in_channels=data.x.shape[1])
        train_model(data, model)
        torch.save(model.state_dict(), 'models/satark_gat_best.pt')
    mlflow.end_run()

# Global singleton for inference
# Not initialized here to avoid double training in child processes
# satark_gat = load_or_init_model()
