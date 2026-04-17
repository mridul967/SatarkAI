import time
import asyncio
import json
import os
import logging
from typing import Dict, Any, List
from datetime import datetime
from models.schemas import Transaction
from config import settings

try:
    import google.generativeai as genai
except ImportError:
    genai = None

try:
    from groq import AsyncGroq
except ImportError:
    AsyncGroq = None

try:
    import anthropic
except ImportError:
    anthropic = None

try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = None


class LLMService:
    def __init__(self):
        self.gemini_model = None
        self.groq_client = None
        self.anthropic_client = None
        self.openai_client = None
        self.config = settings
        self._slm_logger = logging.getLogger('slm_integration')
        
        self.update_keys({
            "google_api_key": settings.google_api_key,
            "groq_api_key": settings.groq_api_key,
            "anthropic_api_key": settings.anthropic_api_key,
            "openai_api_key": settings.openai_api_key
        })

    def _is_valid_key(self, key: str) -> bool:
        if not key: return False
        # Treat typical placeholders as invalid
        placeholders = ["sk-ant-xxx", "sk-proj-xxx", "your_key", "0x...", "xxx"]
        return not any(p in key.lower() for p in placeholders)

    def update_keys(self, keys: dict):
        if self._is_valid_key(keys.get("google_api_key")) and genai:
            genai.configure(api_key=keys["google_api_key"])
            self.gemini_model = genai.GenerativeModel('gemini-2.0-flash')
        else:
            self.gemini_model = None

        if self._is_valid_key(keys.get("groq_api_key")) and AsyncGroq:
            self.groq_client = AsyncGroq(api_key=keys["groq_api_key"])
        else:
            self.groq_client = None

        if self._is_valid_key(keys.get("anthropic_api_key")) and anthropic:
            self.anthropic_client = anthropic.AsyncAnthropic(api_key=keys["anthropic_api_key"])
        else:
            self.anthropic_client = None

        if self._is_valid_key(keys.get("openai_api_key")) and AsyncOpenAI:
            self.openai_client = AsyncOpenAI(api_key=keys["openai_api_key"])
        else:
            self.openai_client = None

    # Helper maps for provider checks
    def is_provider_available(self, provider: str) -> bool:
        # If Groq is available, all subsystems of the SLM engine are active
        if self.groq_client is not None:
            return True
        if provider == "gemini": return self.gemini_model is not None
        if provider == "groq": return self.groq_client is not None
        if provider == "claude": return self.anthropic_client is not None
        if provider == "gpt4o": return self.openai_client is not None
        return False

    def _build_prompt(self, txn: Transaction, features: Dict[str, Any], graph_signals: List[str], role: str = "core") -> str:
        role_instructions = {
            "claude": "ROLE: NARRATIVE LAYER. Synthesize transaction details into a concise summary highlighting ID, Amount (₹), and Merchant category. Explain where the transaction originated. Do NOT focus on risk, focus on metadata visibility.",
            "gemini": "ROLE: RISK SCORER. Focus on engineered risk features (z-scores, velocity) and graph signals. Explain the anomaly magnitude mathematically and why these specific patterns are statistical outliers.",
            "gpt4o": "ROLE: COMPLIANCE WRITER. Draft a formal RBI FMR-1 compliant 'Modus Operandi' description (2-3 sentences). Use clinical, regulatory English. State the mechanism of fraud explicitly.",
            "groq": "ROLE: INFERENCE CORE. Synthesize all data into a final high-level fraud consensus score and short executive summary of the threat."
        }
        
        instruction = role_instructions.get(role, role_instructions["groq"])

        return f"""
You are SatarkAI, an advanced fraud intelligence engine. 
{instruction}

Transaction Data:
- ID: {txn.transaction_id}
- Amount: ₹{txn.amount}
- Merchant: {txn.merchant_id} ({txn.merchant_category})
- Device: {txn.device_id}
- IP: {txn.ip_address}
- Signals: {json.dumps(graph_signals)}

Risk Vectors:
{json.dumps(features, indent=2)}

You MUST respond ONLY with a raw JSON object containing exactly these fields (no markdown):
{{
    "fraud_score": <float 0.0-1.0>,
    "risk_level": "<SAFE, MEDIUM, HIGH, or CRITICAL>",
    "explanation": "<your specialized response based on your role>"
}}
"""

    def _parse_json_text(self, text: str) -> dict:
        try:
            cleaned = text.replace("```json", "").replace("```", "").strip()
            start = cleaned.find("{")
            end = cleaned.rfind("}") + 1
            if start != -1 and end != -1:
                return json.loads(cleaned[start:end])
            return json.loads(cleaned)
        except Exception as e:
            print(f"Failed to parse LLM JSON: {e} -> Text: {text}")
            return None

    async def _call_gemini(self, prompt: str) -> dict:
        response = await self.gemini_model.generate_content_async(prompt)
        return self._parse_json_text(response.text)

    async def _call_groq(self, prompt: str) -> dict:
        response = await self.groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile"
        )
        return self._parse_json_text(response.choices[0].message.content)

    async def _call_claude(self, prompt: str) -> dict:
        response = await self.anthropic_client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=200,
            system="You are an AI that outputs pure JSON.",
            messages=[{"role": "user", "content": prompt}]
        )
        return self._parse_json_text(response.content[0].text)
        
    async def _call_gpt4o(self, prompt: str) -> dict:
        response = await self.openai_client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[{"role": "system", "content": "You are a JSON only output machine."},
                      {"role": "user", "content": prompt}]
        )
        return self._parse_json_text(response.choices[0].message.content)

    async def predict(self, txn: Transaction, features: Dict[str, Any], graph_signals: List[str], provider: str = "claude") -> dict:
        start = time.time()
        
        # If model is not configured, flag as offline immediately.
        if not self.is_provider_available(provider):
            return {
                "fraud_score": 0.0,
                "risk_level": "OFFLINE",
                "explanation": "No API Key provided. Set key in Account Settings.",
                "model_used": provider,
                "processing_time_ms": 0,
                "offline": True
            }

        score = 0.0
        risk = "SAFE"
        reason = "Execution error"
        error_occurred = False
        
        try:
            prompt = self._build_prompt(txn, features, graph_signals, role=provider)
            res = None
            
            # Use Groq as the universal fallback/fail-safe for all SLM layers
            try:
                if provider == "gemini" and self.gemini_model:
                    res = await self._call_gemini(prompt)
                elif provider == "claude" and self.anthropic_client:
                    res = await self._call_claude(prompt)
                elif provider == "gpt4o" and self.openai_client:
                    res = await self._call_gpt4o(prompt)
                elif provider == "groq":
                    res = await self._call_groq(prompt)
            except Exception as e:
                self._slm_logger.error(f"Layer {provider} failed ({e}). Rerouting to Groq Inference Core...")
                res = None

            # Final fail-safe: if primary failed or was skipped, use Groq
            if res is None and self.groq_client:
                res = await self._call_groq(prompt)
                
            if res and "fraud_score" in res:
                score, risk, reason = float(res["fraud_score"]), res["risk_level"], res["explanation"]
                
        except Exception as e:
            reason = f"Provider Native Error: {e}"
            error_occurred = True
            print(reason)
            
        elapsed = (time.time() - start) * 1000
        
        return {
            "fraud_score": score,
            "risk_level": risk,
            "explanation": reason,
            "model_used": provider,
            "processing_time_ms": elapsed,
            "offline": False,
            "error": error_occurred
        }

    async def compare(self, txn: Transaction, features: Dict[str, Any], graph_signals: List[str]):
        # ── SLM Fast Path (Phase 2.5) ──────────────────────────────
        # If SLM is enabled and available, use it exclusively.
        # If SLM is offline/disabled, fall through to cloud APIs below.
        if self.config.USE_LOCAL_SLM:
            slm_result = await self._call_local_slm(
                txn.model_dump() if hasattr(txn, 'model_dump') else txn,
                features, graph_signals
            )
            if not slm_result.get('offline'):
                # SLM succeeded — return in the same format as cloud consensus
                return {
                    "consensus_score": slm_result['score'],
                    "consensus_risk": self._score_to_class(slm_result['score']),
                    "predictions": [{
                        "fraud_score": slm_result['score'],
                        "risk_level": self._score_to_class(slm_result['score']),
                        "explanation": slm_result['explanation'],
                        "model_used": "local_slm",
                        "processing_time_ms": slm_result.get('latency_ms', 0),
                        "offline": False
                    }]
                }
            # SLM offline — log once and fall through (no UI impact)
            self._slm_logger.warning(
                f"SLM offline: {slm_result.get('error')} — falling back to cloud APIs"
            )
        # ── END SLM BLOCK ──────────────────────────────────────────

        providers = ["claude", "gemini", "gpt4o", "groq"]
        results = await asyncio.gather(*(self.predict(txn, features, graph_signals, p) for p in providers))
        
        # Filter out offline results or errors for consensus
        active_results = [r for r in results if not r.get("offline", False) and not r.get("error", False)]
        
        if active_results:
            avg_score = sum(r["fraud_score"] for r in active_results) / len(active_results)
            consensus_risk = "SAFE"
            if avg_score > 0.8: consensus_risk = "CRITICAL"
            elif avg_score > 0.6: consensus_risk = "HIGH"
            elif avg_score > 0.3: consensus_risk = "MEDIUM"
        else:
            avg_score = 0
            consensus_risk = "OFFLINE"
        
        # ── Training Data Collection (Phase 2.5) ──────────────────
        if active_results and self.config.COLLECT_TRAINING_DATA:
            best_narrative = next(
                (r.get('explanation', '') for r in active_results if r.get('explanation')),
                'Narrative unavailable'
            )
            await self.log_training_pair(
                txn.model_dump() if hasattr(txn, 'model_dump') else txn,
                features, graph_signals, best_narrative, avg_score
            )
        # ────────────────────────────────────────────────────────────

        return {
            "consensus_score": avg_score,
            "consensus_risk": consensus_risk,
            "predictions": results
        }

    # ── SLM Integration Methods (Phase 2.5) ────────────────────────────

    def _score_to_class(self, score: float) -> str:
        """Maps a 0.0-1.0 score to a risk class string."""
        if score >= 0.90:
            return 'CRITICAL'
        elif score >= 0.80:
            return 'HIGH'
        elif score >= 0.60:
            return 'MEDIUM'
        else:
            return 'SAFE'

    async def _call_local_slm(
        self,
        txn: dict,
        features: dict,
        graph_signals: dict
    ) -> dict:
        """
        Calls the locally-hosted SLM microservice.
        Returns offline=True on ANY failure — never raises an exception.
        The calling code in compare() gracefully falls through to cloud APIs.
        """
        try:
            import aiohttp
            payload = {
                'transaction': txn,
                'features': features,
                'graph_signals': graph_signals
            }
            timeout = aiohttp.ClientTimeout(total=30)  # 30s max

            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    self.config.SLM_ENDPOINT,
                    json=payload
                ) as resp:
                    if resp.status != 200:
                        return {
                            'offline': True,
                            'error': f'SLM returned HTTP {resp.status}',
                            'provider': 'local_slm'
                        }

                    data = await resp.json()

                    return {
                        'score': float(data.get('score', 0.5)),
                        'explanation': data.get('explanation', ''),
                        'provider': 'local_slm',
                        'offline': False,
                        'latency_ms': data.get('latency_ms')
                    }

        except Exception as e:
            return {'offline': True, 'error': str(e), 'provider': 'local_slm'}

    async def log_training_pair(
        self,
        txn: dict,
        features: dict,
        graph_signals: dict,
        best_narrative: str,
        fraud_score: float
    ):
        """
        Logs a (prompt, completion) training pair to JSONL.
        Only runs if COLLECT_TRAINING_DATA=true in .env.
        """
        if not self.config.COLLECT_TRAINING_DATA:
            return

        instruction = (
            "You are SatarkAI, a fraud intelligence system for Indian banks operating under RBI regulations. "
            "Analyze the following transaction signals and generate:\n"
            "1. A fraud risk score (0.0-1.0)\n"
            "2. A Modus Operandi narrative suitable for the RBI FMR-1 compliance report\n\n"
            "Return ONLY valid JSON with keys: score (float), modus_operandi (string)."
        )

        input_text = (
            f"transaction_id: {txn.get('transaction_id', 'N/A')} | "
            f"amount: ₹{txn.get('amount', 0):,.0f} | "
            f"fraud_type: {txn.get('fraud_type', 'UNKNOWN')} | "
            f"merchant_category: {txn.get('merchant_category', 'N/A')} | "
            f"graph_signals: {json.dumps(graph_signals)} | "
            f"gnn_score: {fraud_score:.3f}"
        )

        output_text = json.dumps({
            "score": round(fraud_score, 3),
            "modus_operandi": best_narrative
        }, ensure_ascii=False)

        record = {
            "instruction": instruction,
            "input": input_text,
            "output": output_text,
            "timestamp": datetime.utcnow().isoformat(),
            "fraud_type": txn.get('fraud_type', 'UNKNOWN')
        }

        output_path = self.config.TRAINING_DATA_PATH
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with open(output_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(record, ensure_ascii=False) + '\n')

llm_service = LLMService()
