import os
import torch
import torch.nn.functional as F
from torch_geometric.nn import GATv2Conv # Using GATv2 for more stable attention
from torch_geometric.data import Data
import numpy as np
import mlflow

# Path handling
BASE_PATH = "backend/" if os.path.exists("backend") else ""
MODEL_PATH = f"{BASE_PATH}models/satark_gat_best.pt"
DATA_FILE  = f"{BASE_PATH}ml/data/satark_train_graph.pt"

# Set device
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

class SatarkGAT(torch.nn.Module):
    def __init__(self, in_channels, hidden=32, heads=4, dropout=0.3):
        super().__init__()
        # Layer 1: Multi-head attention
        self.conv1 = GATv2Conv(in_channels, hidden, heads=heads, dropout=dropout)
        # Layer 2: Aggregate heads back to embedding
        self.conv2 = GATv2Conv(hidden * heads, hidden, heads=1, concat=False, dropout=dropout)
        # Classifier
        self.classifier = torch.nn.Linear(hidden, 1)
        self.dropout = torch.nn.Dropout(dropout)
    
    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index)
        x = F.elu(x)
        x = self.dropout(x)
        
        x = self.conv2(x, edge_index)
        x = F.elu(x)
        
        # Sigmoid for binary classification (Fraud vs Legit)
        return torch.sigmoid(self.classifier(x)).squeeze(-1)

def train_model(data, model, epochs=50, lr=0.005):
    model.to(device)
    data = data.to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=5e-4)
    criterion = torch.nn.BCELoss()
    
    best_val_loss = float('inf')
    
    print(f"Starting training for {epochs} epochs...")
    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()
        out = model(data.x, data.edge_index)
        loss = criterion(out[data.train_mask], data.y[data.train_mask])
        loss.backward()
        optimizer.step()
        
        # Validation
        model.eval()
        with torch.no_grad():
            val_out = model(data.x, data.edge_index)
            val_loss = criterion(val_out[data.val_mask], data.y[data.val_mask])
            
            # Simple metric: Accuracy (using 0.5 threshold)
            val_preds = (val_out[data.val_mask] > 0.5).float()
            val_acc = (val_preds == data.y[data.val_mask]).sum().item() / data.val_mask.sum().item()
        
        if epoch % 10 == 0:
            print(f'Epoch {epoch:03d} | Loss: {loss.item():.4f} | Val Loss: {val_loss.item():.4f} | Val Acc: {val_acc:.4f}')
            if mlflow.active_run():
                mlflow.log_metric("train_loss", loss.item(), step=epoch)
                mlflow.log_metric("val_loss", val_loss.item(), step=epoch)

        # Save best model
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
            torch.save(model.state_dict(), MODEL_PATH)

    print(f"✓ Training complete. Best Val Loss: {best_val_loss:.4f}")

if __name__ == "__main__":
    if not os.path.exists(DATA_FILE):
        print(f"Error: Training data {DATA_FILE} not found. Run prepare_training_data.py first.")
        exit(1)
        
    # Note: Using weights_only=False for internal generated graph data
    data = torch.load(DATA_FILE, weights_only=False)
    print(f"Loaded graph: {data.x.shape[0]} nodes, {data.edge_index.shape[1]} edges")
    
    mlflow.start_run(run_name="SatarkGAT_Phase3")
    
    in_channels = data.x.shape[1]
    model = SatarkGAT(in_channels=in_channels)
    
    train_model(data, model)
    mlflow.end_run()
