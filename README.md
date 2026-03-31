# SatarkAI (सतर्क)

> India's first open-source, graph-neural-network fraud detection system with 4-model LLM explainability.

## Features Built
- Graph-Native execution detecting shared IPs, Devices, and Account rings.
- **FastAPI backend** running inference streams.
- Full UI dashboard for real time monitoring.
- D3.js Force graph interactions mapped dynamically.

## Run Locally
The project contains Docker composition. Simply execute:
```bash
docker-compose up --build
```
Or optionally run without Docker:
**Backend**:
\`\`\`bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
\`\`\`

**Frontend**:
\`\`\`bash
cd frontend
npm run dev
\`\`\`

## Naming Disclaimer
SatarkAI globally replaces the hackathon name 'NeuralWatch' per project mandates.
