import torch
import onnx
import onnxruntime as ort
import numpy as np
import os
import pickle
import json
from .train_gnn import SatarkGAT

# Path handling
BASE_PATH = "backend/" if os.path.exists("backend") else ""
MODELS_DIR = f"{BASE_PATH}models"
DATA_DIR   = f"{BASE_PATH}ml/data"

def export_gat_to_onnx():
    """Exports PyTorch GAT to ONNX."""
    checkpoint = f"{MODELS_DIR}/satark_gat_best.pt"
    onnx_path  = f"{MODELS_DIR}/satark_gat.onnx"
    metadata_path = f"{DATA_DIR}/training_metadata.json"
    
    if not os.path.exists(checkpoint):
        print(f"GAT Checkpoint {checkpoint} not found.")
        return

    with open(metadata_path, 'r') as f:
        meta = json.load(f)
    in_channels = meta["num_features"]

    print(f"Loading GAT with {in_channels} channels...")
    model = SatarkGAT(in_channels=in_channels)
    model.load_state_dict(torch.load(checkpoint, map_location='cpu', weights_only=False))
    model.eval()

    dummy_x = torch.randn(1, in_channels)
    dummy_edge_index = torch.tensor([[0], [0]], dtype=torch.long)

    print(f"Exporting GAT to {onnx_path}...")
    torch.onnx.export(
        model,
        (dummy_x, dummy_edge_index),
        onnx_path,
        export_params=True,
        opset_version=12,
        input_names=['x', 'edge_index'],
        output_names=['output'],
        dynamic_axes={'x': {0: 'num_nodes'}, 'edge_index': {1: 'num_edges'}, 'output': {0: 'num_nodes'}}
    )
    print("✓ GAT Export Complete.")

def export_lgbm_to_onnx():
    """Exports LightGBM to ONNX using onnxmltools."""
    import onnxmltools
    from skl2onnx.common.data_types import FloatTensorType

    pickle_path = f"{MODELS_DIR}/satark_lgbm.pkl"
    onnx_path   = f"{MODELS_DIR}/satark_lgbm.onnx"
    
    if not os.path.exists(pickle_path):
        print(f"LGBM Pickle {pickle_path} not found.")
        return

    print(f"Loading LGBM from {pickle_path}...")
    with open(pickle_path, 'rb') as f:
        data = pickle.load(f)
        model = data['model']
        feature_count = len(data['features'])

    print(f"Exporting LGBM to {onnx_path}...")
    initial_type = [('input', FloatTensorType([None, feature_count]))]
    onnx_model = onnxmltools.convert_lightgbm(model, initial_types=initial_type, target_opset=14)
    
    onnxmltools.utils.save_model(onnx_model, onnx_path)
    print("✓ LightGBM Export Complete.")

if __name__ == "__main__":
    export_gat_to_onnx()
    try:
        export_lgbm_to_onnx()
    except ImportError:
        print("onnxmltools/skl2onnx not installed. Please rebuild container or install manually.")
