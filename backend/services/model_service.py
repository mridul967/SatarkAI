import os
import time
import numpy as np
import onnxruntime as ort
from collections import deque
from typing import Dict, Any

class ModelService:
    def __init__(self):
        self._latency_window: deque = deque(maxlen=100)
        self.models_dir = "models"
        self.gat_session = None
        self.lgbm_session = None
        self._initialize_sessions()

    def _initialize_sessions(self):
        try:
            gat_path = os.path.join(self.models_dir, "satark_gat.onnx")
            lgbm_path = os.path.join(self.models_dir, "satark_lgbm.onnx")
            
            if os.path.exists(gat_path):
                self.gat_session = ort.InferenceSession(gat_path)
            if os.path.exists(lgbm_path):
                self.lgbm_session = ort.InferenceSession(lgbm_path)
            
            print("SatarkAI ModelService: ONNX sessions initialized.")
        except Exception as e:
            print(f"SatarkAI ModelService Warning: ONNX sessions not initialized: {e}")

    def record_latency(self, ms: float):
        self._latency_window.append(ms)

    def get_latency_stats(self) -> dict:
        if len(self._latency_window) < 2:
            return {"p50": 0.0, "p95": 0.0, "p99": 0.0, "count": len(self._latency_window)}
        w = sorted(self._latency_window)
        n = len(w)
        return {
            "p50": round(w[int(n * 0.50)], 1),
            "p95": round(w[int(n * 0.95)], 1),
            "p99": round(w[min(int(n * 0.99), n - 1)], 1),
            "count": n,
        }

    async def run_inference(self, features: Dict[str, Any], transaction: Any) -> Dict[str, Any]:
        """Runs the core model inference (Timed in the router)."""
        gat_score = 0.5
        lgbm_score = 0.5
        
        if self.gat_session and self.lgbm_session:
            try:
                # Prepare input
                input_data = np.array([list(features.values())], dtype=np.float32)
                
                # GAT Inference logic (mocking subgraph edges)
                dummy_edges = np.array([[0], [0]], dtype=np.int64)
                gat_out = self.gat_session.run(None, {'x': input_data, 'edge_index': dummy_edges})
                gat_score = float(gat_out[0][0])
                
                # LGBM Inference
                lgbm_out = self.lgbm_session.run(None, {'input': input_data})
                lgbm_score = float(lgbm_out[0][0])
            except Exception as e:
                print(f"ModelService Inference error: {e}")
        
        # Simple weighted ensemble (match logic in the old predict.py)
        # Note: final_score = 0.6 * gat_score + 0.4 * lgbm_score is done in router or here.
        # User's provided snippet returns 'score', I'll calculate it here.
        score = float(0.6 * gat_score + 0.4 * lgbm_score)
        
        return {
            "score": score,
            "gat_score": gat_score,
            "lgbm_score": lgbm_score,
            "explanation": "Real-time GNN + LGBM Ensemble"
        }

model_service = ModelService()
