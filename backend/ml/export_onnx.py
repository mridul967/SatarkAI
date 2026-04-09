import torch
import onnx
import onnxruntime as ort
import numpy as np
import os
from train_gnn import SatarkGAT

def export_gat_to_onnx(model_path='models/satark_gat_best.pt', onnx_path='models/satark_gat.onnx', in_channels=4):
    """
    Exports the trained PyTorch GAT model to ONNX format.
    """
    if not os.path.exists(model_path):
        print(f"Model checkpoint {model_path} not found.")
        return

    # Initialize model and load weights
    model = SatarkGAT(in_channels=in_channels)
    model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
    model.eval()

    # Dummy input based on in_channels and dummy edge_index
    # Assuming batch of 1 for export (can handle variable or fixed)
    dummy_x = torch.randn(1, in_channels)
    dummy_edge_index = torch.tensor([[0], [0]], dtype=torch.long)

    print(f"Exporting model to {onnx_path}...")
    torch.onnx.export(
        model,
        (dummy_x, dummy_edge_index),
        onnx_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=['x', 'edge_index'],
        output_names=['output'],
        dynamic_axes={'x': {0: 'num_nodes'}, 'edge_index': {1: 'num_edges'}, 'output': {0: 'num_nodes'}}
    )

    print("Verification with ONNX Runtime...")
    ort_session = ort.InferenceSession(onnx_path)
    
    # Run inference
    input_x = dummy_x.numpy()
    input_edges = dummy_edge_index.numpy()
    
    ort_inputs = {
        'x': input_x,
        'edge_index': input_edges
    }
    ort_outs = ort_session.run(None, ort_inputs)
    
    print("Inference successful. Output shape:", ort_outs[0].shape)
    print("Export Complete.")

if __name__ == "__main__":
    # Note: real in_channels should match what was trained.
    # Defaulting to 4 for skeleton.
    export_gat_to_onnx(in_channels=4)
