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

# Baseline: healthy score distribution (majority safe, small fraud tail)
_SCORE_BINS = [0.0, 0.10, 0.20, 0.30, 0.50, 0.70, 0.90, 1.01]
_BASELINE_DIST = np.array([0.35, 0.28, 0.15, 0.10, 0.07, 0.03, 0.02])

_recent_scores: deque = deque(maxlen=500)

def record_score(score: float):
    _recent_scores.append(score)

def compute_score_psi(recent_scores: list[float]) -> dict:
    """
    PSI on model score distribution.
    Call this every 5 minutes or every 200 transactions (whichever comes first).

    Returns:
        psi_value: float
        status: "STABLE" | "MONITOR" | "DRIFT_ALERT"
        flag_rate: fraction of scores > 0.5
    """
    if len(recent_scores) < 50:
        return {"psi_value": 0.0, "status": "INSUFFICIENT_DATA", "flag_rate": 0.0, "sample_size": len(recent_scores)}

    counts, _ = np.histogram(recent_scores, bins=_SCORE_BINS)
    actual = counts / counts.sum()

    # Avoid log(0)
    actual = np.where(actual == 0, 1e-4, actual)
    expected = np.where(_BASELINE_DIST == 0, 1e-4, _BASELINE_DIST)

    psi = float(np.sum((actual - expected) * np.log(actual / expected)))
    flag_rate = float(np.mean(np.array(recent_scores) > 0.5))

    if psi < 0.10:
        status = "STABLE"
    elif psi < 0.20:
        status = "MONITOR"
    else:
        status = "DRIFT_ALERT"

    return {
        "psi_value": round(psi, 4),
        "status": status,
        "flag_rate": round(flag_rate, 4),
        "sample_size": len(recent_scores),
    }

def get_drift_report() -> dict:
    return compute_score_psi(list(_recent_scores))
