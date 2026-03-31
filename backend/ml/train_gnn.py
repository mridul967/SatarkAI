import os
import torch
import torch.nn.functional as F
from torch_geometric.nn import SAGEConv, GATConv
from torch_geometric.data import HeteroData
from torch_geometric.loader import NeighborLoader
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score, average_precision_score, roc_auc_score
import mlflow

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

def load_or_init_model(in_channels=4):
    model_path = 'models/satark_gat_best.pt'
    model = SatarkGAT(in_channels=in_channels)
    try:
        if os.path.exists(model_path):
            model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
            print("Successfully loaded pre-trained SatarkGAT checkpoint.")
        else:
            print("No checkpoint found. Initialized fresh SatarkGAT.")
    except Exception as e:
        print(f"Error loading model checkpoint: {e}")
    model.eval()
    return model

# Global singleton
satark_gat = load_or_init_model()
