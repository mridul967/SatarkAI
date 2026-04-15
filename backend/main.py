from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import predict, explain, graph, settings, demo, compliance

app = FastAPI(
    title="SatarkAI Backend API",
    description="Real-time graph-based fraud detection API.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For React dev server port 5173
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix="/api/predict", tags=["Predict"])
app.include_router(explain.router, prefix="/api/explain", tags=["Explain"])
app.include_router(graph.router, prefix="/api/graph", tags=["Graph"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(demo.router, prefix="/api/demo", tags=["Demo"])
app.include_router(compliance.router, prefix="/api/compliance", tags=["Compliance"])

# WS routing for fast websocket operations (typically defined in router or here)
from routers.predict import websocket_endpoint
app.add_api_websocket_route("/ws/transactions", websocket_endpoint)

@app.get("/api/health")
def health_check():
    return {"status": "SatarkAI Engine Online"}
