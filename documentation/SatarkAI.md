# SatarkAI Technical Documentation

SatarkAI is a next-generation fraud detection platform combining Graph Neural Networks (GNN) with a Multi-LLM Consensus Engine for real-time transaction intelligence.

## 🏗️ Architecture Overview

The system is built as a microservice-ready stack:

- **Frontend**: React 18, Tailwind CSS, D3.js (Topology Graph), Lucide icons.
- **Backend**: FastAPI (Python), SQLite (Persistence), WebSocket (Live Streaming).
- **Inference Layers**: 
  - **Graph Layer**: Maintains a real-time adjacency matrix of Users, Devices, and IPs.
  - **Ensemble Layer**: Parallelized consensus between 4 LLMs (Gemini, Groq, Claude, GPT-4o).

## 🚀 Key Features

### 1. Real-time Node Correlation
Visualizes relationships between disparate entities to detect "Account Takeovers" and "Sybil Attacks" where multiple users share one device or IP.

### 2. Multi-LLM Consensus Logic
Rather than relying on a single model, SatarkAI calls up to 4 AI providers. It automatically filters offline models (missing keys) and calculates a weighted average "Anomaly Score".

### 3. Dynamic API Hot-Reloading
Integrated via the **Account Settings** page. You can update your API credentials for Google, Groq, Anthropic, or OpenAI, and the backend re-initializes clients instantly in memory without a restart.

### 4. System Persistence & Logs
Every transaction, reasoning block, and graph signal is stored in a `satarkai.db` SQLite database. The **System Logs** tab provides date-range filtering for audit-ready compliance reporting.

## 🛠️ Setup & Deployment

1. **Environment**: Copy `.env.example` to `.env`.
2. **Build**: Run `docker-compose up --build`.
3. **Login**: Access `http://localhost:5173`. Any default admin credential works for this prototype.
4. **Configure**: Go to `Settings` to add your live API keys for real model inference.

---
&copy; 2026 SatarkAI Engineering. "Har len-den par nazar."
