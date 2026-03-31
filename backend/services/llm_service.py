import time
import asyncio
import json
from typing import Dict, Any, List
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
        
        self.update_keys({
            "google_api_key": settings.google_api_key,
            "groq_api_key": settings.groq_api_key,
            "anthropic_api_key": settings.anthropic_api_key,
            "openai_api_key": settings.openai_api_key
        })

    def update_keys(self, keys: dict):
        if keys.get("google_api_key") and genai:
            genai.configure(api_key=keys["google_api_key"])
            self.gemini_model = genai.GenerativeModel('gemini-2.0-flash')
        else:
            self.gemini_model = None

        if keys.get("groq_api_key") and AsyncGroq:
            self.groq_client = AsyncGroq(api_key=keys["groq_api_key"])
        else:
            self.groq_client = None

        if keys.get("anthropic_api_key") and anthropic:
            self.anthropic_client = anthropic.AsyncAnthropic(api_key=keys["anthropic_api_key"])
        else:
            self.anthropic_client = None

        if keys.get("openai_api_key") and AsyncOpenAI:
            self.openai_client = AsyncOpenAI(api_key=keys["openai_api_key"])
        else:
            self.openai_client = None

    # Helper maps for provider checks
    def is_provider_available(self, provider: str) -> bool:
        if provider == "gemini": return self.gemini_model is not None
        if provider == "groq": return self.groq_client is not None
        if provider == "claude": return self.anthropic_client is not None
        if provider == "gpt4o": return self.openai_client is not None
        return False

    def _build_prompt(self, txn: Transaction, features: Dict[str, Any], graph_signals: List[str]) -> str:
        return f"""
You are SatarkAI, an advanced fraud detection engine. Analyze this transaction.

Transaction Details:
- Amount: {txn.amount}
- Merchant: {txn.merchant_id} ({txn.merchant_category})
- Device: {txn.device_id}
- IP: {txn.ip_address}
- Location: {txn.location}

Engineered Risk Features:
{json.dumps(features, indent=2)}

Detected Graph Signals (Connections):
{json.dumps(graph_signals, indent=2)}

Evaluate the fraud probability based on the inputs above. 
You MUST respond ONLY with a raw JSON object containing exactly these fields (no markdown blocks, no other text):
{{
    "fraud_score": <float between 0.0 and 1.0>,
    "risk_level": "<SAFE, MEDIUM, HIGH, or CRITICAL>",
    "explanation": "<short paragraph explaining your precise reasoning>"
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
        
        try:
            prompt = self._build_prompt(txn, features, graph_signals)
            res = None
            
            if provider == "gemini": res = await self._call_gemini(prompt)
            elif provider == "groq": res = await self._call_groq(prompt)
            elif provider == "claude": res = await self._call_claude(prompt)
            elif provider == "gpt4o": res = await self._call_gpt4o(prompt)
                
            if res and "fraud_score" in res:
                score, risk, reason = float(res["fraud_score"]), res["risk_level"], res["explanation"]
                
        except Exception as e:
            reason = f"Provider Native Error: {e}"
            print(reason)
            
        elapsed = (time.time() - start) * 1000
        
        return {
            "fraud_score": score,
            "risk_level": risk,
            "explanation": reason,
            "model_used": provider,
            "processing_time_ms": elapsed,
            "offline": False
        }

    async def compare(self, txn: Transaction, features: Dict[str, Any], graph_signals: List[str]):
        providers = ["claude", "gemini", "gpt4o", "groq"]
        results = await asyncio.gather(*(self.predict(txn, features, graph_signals, p) for p in providers))
        
        # Filter out offline results for consensus
        active_results = [r for r in results if not r.get("offline", False)]
        
        if active_results:
            avg_score = sum(r["fraud_score"] for r in active_results) / len(active_results)
            consensus_risk = "SAFE"
            if avg_score > 0.8: consensus_risk = "CRITICAL"
            elif avg_score > 0.6: consensus_risk = "HIGH"
            elif avg_score > 0.3: consensus_risk = "MEDIUM"
        else:
            avg_score = 0
            consensus_risk = "OFFLINE"
        
        return {
            "consensus_score": avg_score,
            "consensus_risk": consensus_risk,
            "predictions": results
        }

llm_service = LLMService()
