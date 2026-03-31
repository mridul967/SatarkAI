import numpy as np
from collections import deque

class DriftDetector:
    def __init__(self, window_size=1000, psi_threshold=0.2):
        self.window_size = window_size
        self.psi_threshold = psi_threshold
        self.reference_window = deque(maxlen=window_size)
        self.current_window = deque(maxlen=window_size)
        self.drift_count = 0
    
    def psi(self, expected, actual, bins=10):
        expected_hist, edges = np.histogram(expected, bins=bins)
        actual_hist, _ = np.histogram(actual, bins=edges)
        
        expected_pct = (expected_hist + 0.0001) / len(expected)
        actual_pct = (actual_hist + 0.0001) / len(actual)
        
        return np.sum((actual_pct - expected_pct) * np.log(actual_pct / expected_pct))
    
    def add_transaction(self, features: dict):
        amount = features.get('amount_log', 0)
        if len(self.reference_window) < self.window_size:
            self.reference_window.append(amount)
        else:
            self.current_window.append(amount)
    
    def check_drift(self) -> bool:
        if len(self.current_window) < 100:
            return False
        psi_score = self.psi(list(self.reference_window), list(self.current_window))
        if psi_score > self.psi_threshold:
            self.drift_count += 1
            print(f"[DRIFT DETECTED] PSI={psi_score:.3f} > {self.psi_threshold}. Drift count: {self.drift_count}")
            self.reference_window = deque(self.current_window, maxlen=self.window_size)
            self.current_window.clear()
            return True
        return False

drift_detector = DriftDetector()
