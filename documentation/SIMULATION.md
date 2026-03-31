# Transaction Simulation Engine (SatarkAI Logic)

SatarkAI provides a realistic synthetic transaction generator located in `backend/routers/predict.py`. Use this file to test your models with actual and adversarial behavior patterns.

## 👥 Engineered User Profiles

The simulator uses a `USER_PROFILES` dictionary to drive logic. Each entry defines a user's normal "footprint."

- **Consistent User (`usr_1001`)**: Has a single device and a single IP in Mumbai. Transactions are typically low-value (< ₹5,000) and are flagged as `SAFE`.
- **Traveling User (`usr_1002`)**: Uses the same device but rotates between IPs and locations (Delhi, Bengaluru). This simulates a frequent traveler and typically ranks as `SAFE` or `MEDIUM` depending on the velocity.
- **Fraudster (`usr_1003`)**: Operates from multiple high-velocity devices (`dev_103`, `dev_104`, `dev_105`) and switches between common IPs. Transactions are frequently > ₹15,000. These are automatically flagged as `CRITICAL` or `HIGH`.
- **Shared Device (`usr_1004`)**: This user shares `dev_101` with `usr_1001`. This simulates family-sharing or account hijacking. If the amount is > ₹8,000, it triggers a `MEDIUM` risk flag.

## 📊 Anomaly Scoring Algorithm

The simulator does not just pick a random number. It applies rule-based heuristic scoring to mimic real model behavior:

| Behavior | Amount | Probability Score | Resulting Risk |
| :--- | :--- | :--- | :--- |
| **Normal** | < ₹5,000 | 0.01 - 0.15 | `SAFE` |
| **Fraudster Profile** | > ₹15,000 | 0.80 - 0.99 | `CRITICAL` |
| **Shared Device** | > ₹8,000 | 0.50 - 0.75 | `MEDIUM` |
| **Standard Anomaly** | > ₹40,000 | 0.70 - 0.90 | `HIGH` |

## 🔗 Topology Mapping

The `websocket_endpoint` continuously calls `graph_service.add_transaction(txn_obj)`. This adds edges to the Graph database:
- **(User) -- [TRANS_ID] -- (Device)**
- **(User) -- [TRANS_ID] -- (IP)**

This ensures that the **Entity Graph** tab in the dashboard shows clusters forming wherever users share nodes, providing visual evidence of `shared_device` or `fraudster` clusters.

---
&copy; 2026 SatarkAI Engine Documentation.
