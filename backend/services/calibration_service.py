# backend/services/calibration_service.py

import numpy as np
import asyncio
from collections import deque
from sklearn.linear_model import LogisticRegression
from datetime import datetime


class LiveCalibrationService:
    """
    Platt Scaling recalibration layer on top of the frozen GAT+LightGBM ensemble.

    How it works:
    - Analyst marks a transaction as false_positive or confirmed_fraud
    - That (raw_score, label) pair is added to a sliding feedback buffer
    - Every 10 overrides, a LogisticRegression(1 feature) is refit on the buffer
    - All subsequent scores pass through this scaler before reaching the UI

    Why Platt Scaling and not full retraining:
    - Full GAT retraining takes 20–40 minutes on CPU
    - Platt Scaling refits in <50ms on the feedback buffer
    - Produces well-calibrated probabilities (not just rankings)
    - Industry standard for post-hoc model calibration (used by Google, Stripe)
    """

    def __init__(self, recalibrate_every: int = 10, buffer_size: int = 500):
        self.feedback_buffer: deque = deque(maxlen=buffer_size)
        self.recalibrate_every = recalibrate_every
        self.override_count = 0
        self.platt_scaler: LogisticRegression | None = None
        self.last_calibrated_at: str | None = None
        self.calibration_history: list[dict] = []
        self._lock = asyncio.Lock()

    def apply(self, raw_score: float) -> float:
        """
        Apply calibration to a raw ensemble score.
        Returns raw_score unchanged if calibration has not been triggered yet.
        """
        if self.platt_scaler is None:
            return raw_score
        calibrated = float(self.platt_scaler.predict_proba([[raw_score]])[0][1])
        return round(calibrated, 4)

    async def record_feedback(self, raw_score: float, analyst_label: int) -> dict:
        """
        Record analyst override and trigger recalibration if threshold is met.

        Args:
            raw_score: The original model score before calibration (0.0–1.0)
            analyst_label: 1 = confirmed fraud | 0 = false positive

        Returns:
            dict with current calibration stats
        """
        async with self._lock:
            self.feedback_buffer.append((raw_score, analyst_label))
            self.override_count += 1

            if self.override_count % self.recalibrate_every == 0:
                await self._recalibrate()

        return self.get_stats()

    async def _recalibrate(self):
        """Internal: refit Platt scaler on current feedback buffer."""
        if len(self.feedback_buffer) < 20:
            return

        scores = np.array([[s] for s, _ in self.feedback_buffer])
        labels = np.array([l for _, l in self.feedback_buffer])

        # Need both classes in buffer to fit
        if len(set(labels)) < 2:
            return

        scaler = LogisticRegression(C=1.0, max_iter=300, solver="lbfgs")
        scaler.fit(scores, labels)
        self.platt_scaler = scaler
        self.last_calibrated_at = datetime.utcnow().isoformat()

        # Record shift for audit trail and UI display
        test_points = [0.1, 0.3, 0.5, 0.7, 0.9]
        shift_map = {
            str(p): round(self.apply(p) - p, 4) for p in test_points
        }

        snapshot = {
            "triggered_at": self.last_calibrated_at,
            "buffer_size": len(self.feedback_buffer),
            "coef": round(float(scaler.coef_[0][0]), 4),
            "intercept": round(float(scaler.intercept_[0]), 4),
            "score_shifts": shift_map,
        }
        self.calibration_history.append(snapshot)

        print(f"[CalibrationService] Recalibrated at override #{self.override_count}")
        print(f"  Score shifts: {shift_map}")

    def get_stats(self) -> dict:
        return {
            "feedback_count": len(self.feedback_buffer),
            "overrides_processed": self.override_count,
            "calibration_active": self.platt_scaler is not None,
            "last_calibrated_at": self.last_calibrated_at,
            "recalibrate_every": self.recalibrate_every,
            "coef": round(float(self.platt_scaler.coef_[0][0]), 4)
                    if self.platt_scaler else None,
            "history": self.calibration_history[-5:],  # last 5 snapshots
        }


# Module-level singleton — import this everywhere
calibration_service = LiveCalibrationService(recalibrate_every=10)
