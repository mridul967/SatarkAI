# SatarkAI Project Directory & File Guide

This document provides a comprehensive overview of the SatarkAI repository structure, explaining the purpose of each directory and file to help developers navigate the codebase.

## 📂 Root Directory

| File / Folder | Purpose |
| :--- | :--- |
| `backend/` | Source code for the FastAPI server, ML models, and core logic. |
| `frontend/` | Source code for the React-based dashboard. |
| `documentation/` | Technical guides, simulation logic, and project overview. |
| `contracts/` | Solidity smart contracts for blockchain-based forensic logging. |
| `scripts/` | Deployment and utility scripts (e.g., blockchain deployment). |
| `artifacts/` | Compiled smart contract artifacts and build outputs. |
| `cache/` | Temporary cache files and local persistence for ML models. |
| `data/` | SQLite database (`satarkai.db`) and raw datasets. |
| `docker-compose.yml` | Orchestration for running the stack (Python, React, Redis, Neo4j, Kafka). |
| `hardhat.config.js` | Configuration for Ethereum/Polygon development environment. |
| `generate_pdf_docs.py` | Utility to convert markdown technical docs into formatted PDFs. |
| `README.md` | Quickstart guide and installation instructions. |
| `.env` | Local environment variables (API keys, DB paths). |

---

## 🐍 Backend Architecture (`/backend`)

The backend is built with FastAPI and organized into functional layers:

### Core Files
- `main.py`: Entry point for the FastAPI application; handles initialization and mounting.
- `config.py`: Centralized configuration management using `pydantic-settings`.
- `Dockerfile`: Container configuration for the backend environment.

### Routers (`/backend/routers`)
Handle incoming HTTP and WebSocket requests.
- `predict.py`: Core logic for real-time transactions and the **Realistic Simulator**.
- `graph.py`: Endpoints for querying entity relationship data.
- `explain.py`: Fetches LLM-based reasoning for specific alert flags.
- `compliance.py`: Management of FMR-1 reports and regulatory queues.
- `demo.py`: Logic for the **Forensic Console** and scripted attack scenarios.
- `settings.py`: UI-driven configuration and live API key management.

### Services (`/backend/services`)
The "brains" of the application where business logic resides.
- `llm_service.py`: Orchestrates parallel inference across Gemini, Groq, Claude, and GPT-4o.
- `model_service.py`: Manages ONNX-based GNN and LGBM local inference sessions.
- `graph_service.py`: In-memory NetworkX operations and graph signal extraction.
- `database_service.py`: Handles all SQLite persistence and historical logging.
- `compliance_service.py`: PDF generation and regulatory reporting workflows.
- `blockchain_service.py`: Handles forensic hashing and on-chain verification (Web3.js/Infura).
- `calibration_service.py`: Implements Platt Scaling to ensure model scores are probabilistic.
- `drift_service.py`: Real-time monitoring of statistical shifts in the fraud pipeline.
- `i18n_service.py`: Multilingual support for alerts and forensic explanations.
- `attack_sampler.py`: Logic for generating realistic adversarial transaction patterns.
- `federated_service.py`: Simulation logic for cross-institution collaborative learning.

### ML & Models (`/backend/ml` & `/backend/models`)
- `train_gnn.py`: Training logic for the Graph Neural Network (Pytorch Geometric).
- `train_lgbm.py`: Training logic for the LightGBM ensemble layer.
- `export_onnx.py`: Converter for porting trained models to production-ready ONNX.
- `schemas.py`: Pydantic models for request/response validation.

---

## ⚛️ Frontend Architecture (`/frontend`)

Built with Vite, React, and Tailwind CSS.

### Components (`/frontend/src/components`)
- `App.jsx`: Main layout engine, tab orchestration, and authentication guardrails.
- `ForensicConsole.jsx`: Real-time CLI-style interface for neural narrative stream.
- `EntityMapper.jsx`: Interactive **D3.js Force-Directed Graph** for link analysis.
- `ScoreGauge.jsx`: Visual representation of real-time risk scores.
- `ModelCompare.jsx`: Multi-model consensus visualization.
- `ComplianceVault.jsx`: Management of generated PDF reports (FMR-1).

### State Management
- `AuthContext.jsx`: Global context for user sessions.
- `useWebSocket.js`: Custom hook for persistent real-time server-sent events.

---

## 📖 Documentation (`/documentation`)

- `SatarkAI.md`: Core system philosophy and high-level architecture.
- `technicaldeepdive.md`: Deep technical explanation of GNNs and LLM consensus.
- `SIMULATION.md`: Behavioral profiling and transaction generation logic.
- `livegraph.md`: Documentation for the real-time link analysis engine.
- `injector.md`: Logic behind the Forensic Console's manual attack injection.
- `PROJECT_PHASES.md`: Roadmap and implementation milestones.
- `judges_defense_package.md`: Curated guide for technical evaluation and FAQs.

---
&copy; 2026 SatarkAI Engineering. "Har len-den par nazar."
