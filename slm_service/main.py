# slm_service/main.py
import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from model_loader import load_model
from inference import generate_narrative

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(name)s | %(levelname)s | %(message)s'
)
logger = logging.getLogger(__name__)

# Global model store
ml_models = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup, clean up on shutdown."""
    logger.info("SatarkAI SLM Service starting...")
    try:
        ml_models['model'], ml_models['tokenizer'] = load_model()
        logger.info("✅ Model ready — SLM Service is live")
    except Exception as e:
        logger.error(f"❌ Model failed to load: {e}")
        # Service starts anyway — /health will report not ready
    yield
    ml_models.clear()
    logger.info("SLM Service shut down")


app = FastAPI(
    title='SatarkAI Local SLM Service',
    description='Privacy-first local fraud narrative generator for RBI FMR-1 compliance',
    version='1.0.0',
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:8000', 'http://backend:8000'],
    allow_methods=['GET', 'POST'],
    allow_headers=['*'],
)


# ── Request / Response Schemas ─────────────────────────────────────────────

class InferenceRequest(BaseModel):
    transaction: dict
    features: dict
    graph_signals: dict


class InferenceResponse(BaseModel):
    score: float
    explanation: str
    provider: str
    latency_ms: Optional[float] = None
    parse_warning: Optional[bool] = None


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    service: str


# ── Endpoints ──────────────────────────────────────────────────────────────

@app.get('/health', response_model=HealthResponse)
async def health():
    """Health check — used by main backend to verify SLM availability."""
    return HealthResponse(
        status='ok' if 'model' in ml_models else 'degraded',
        model_loaded='model' in ml_models,
        service='SatarkAI Local SLM v1.0.0'
    )


@app.post('/generate', response_model=InferenceResponse)
async def generate(req: InferenceRequest):
    """
    Generate a fraud narrative and risk score for a flagged transaction.
    Called by llm_service.py in the main SatarkAI backend.
    """
    if 'model' not in ml_models:
        raise HTTPException(
            status_code=503,
            detail='Model not loaded. Check SLM service startup logs.'
        )

    t_start = time.perf_counter()

    result = generate_narrative(
        ml_models['model'],
        ml_models['tokenizer'],
        req.transaction,
        req.features,
        req.graph_signals
    )

    latency_ms = (time.perf_counter() - t_start) * 1000
    logger.info(
        f"Generated narrative for txn {req.transaction.get('transaction_id', 'N/A')} "
        f"| score={result['score']:.3f} | latency={latency_ms:.0f}ms"
    )

    return InferenceResponse(
        score=result['score'],
        explanation=result['explanation'],
        provider=result['provider'],
        latency_ms=round(latency_ms, 2),
        parse_warning=result.get('parse_warning')
    )


@app.get('/')
async def root():
    return {
        'service': 'SatarkAI Local SLM',
        'status': 'running',
        'endpoints': ['/health', '/generate']
    }
