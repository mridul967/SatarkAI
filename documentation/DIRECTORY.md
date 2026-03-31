# SatarkAI Project Directory & File Guide

This document provides a comprehensive overview of the SatarkAI repository structure, explaining the purpose of each directory and file to help developers navigate the codebase.

## 📂 Root Directory

| File / Folder | Purpose |
| :--- | :--- |
| `backend/` | Source code for the FastAPI server, ML models, and core logic. |
| `frontend/` | Source code for the React-based dashboard. |
| `documentation/` | Technical guides, simulation logic, and project overview. |
| `docker-compose.yml` | Orchestration for running the backend (Python), frontend (Node/Vite), and DB in parallel. |
| `.env` | Local environment variables (API keys, DB paths). |
| `README.md` | Quickstart guide and installation instructions. |

---

## 🐍 Backend Architecture (`/backend`)

The backend is organized into functional layers:

### Routers (`/backend/routers`)
Handle incoming HTTP and WebSocket requests.
- `predict.py`: Core logic for real-time transactions, history, and the **Realistic Simulator**.
- `graph.py`: Endpoints for querying the entity node data.
- `settings.py`: Endpoint for **Hot-Reloading API keys** without restarts.
- `explain.py`: Dedicated routes for fetching LLM-based reasoning.

### Services (`/backend/services`)
The "brains" of the application where business logic resides.
- `llm_service.py`: Orchestrates parallel calls to Gemini, Groq, Claude, and GPT-4o.
- `graph_service.py`: Manages the in-memory NetworkX graph for entity resolution.
- `database_service.py`: Manages all SQLite operations (persistence, logs, filtering).
- `drift_service.py`: Monitors for statistical shifts in fraud patterns.
- `feature_service.py`: Extracts signals from raw transactions for model consumption.

### ML & Data (`/backend/ml` & `/backend/models`)
- `train_gnn.py`: Training script for the Graph Neural Network.
- `train_lgbm.py`: Training script for the Gradient Boosted Tree model.
- `synthetic_fraud.py`: Logic for generating raw training data.
- `schemas.py`: Pydantic models for request/response validation (Validation Layer).

---

## ⚛️ Frontend Architecture (`/frontend`)

Built with Vite, React, and Tailwind CSS.

### Components (`/frontend/src/components`)
- `App.jsx`: The main layout engine (Tab management, Navigation, Auth check).
- `ScoreGauge.jsx`: D3/SVG-based gauge for the real-time fraud score.
- `FraudGraph.jsx`: Interactive **D3.js Force-Directed Graph** for entity visualization.
- `ModelCompare.jsx`: Side-by-side comparison of different LLM provider outputs.
- `TransactionHistory.jsx`: The **System Logs** dashboard with date filters.
- `AccountSettings.jsx`: UI for managing API keys and system preferences.
- `Login.jsx`: Entry screen for the platform.

### Contexts & Hooks (`/frontend/src/contexts` & `/hooks`)
- `AuthContext.jsx`: Global state for the user session and login/logout methods.
- `useWebSocket.js`: Custom hook for persistent real-time streaming from the backend.

---

## 🛠️ Data Storage (`/data`)
- `satarkai.db`: Persistent SQLite database storing all transaction history, anomaly scores, and reasoning.

## 📖 New Documentation (`/documentation`)
- `SatarkAI.md`: General system overview.
- `SIMULATION.md`: Explanation of behavioral simulator logic.
- `DIRECTORY.md`: This file (Project structure).

---
&copy; 2026 SatarkAI Engineering. "Har len-den par nazar."
