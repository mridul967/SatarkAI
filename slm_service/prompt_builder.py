# slm_service/prompt_builder.py
import json


SYSTEM_INSTRUCTION = (
    "You are SatarkAI, a fraud intelligence system for Indian banks operating "
    "under RBI Master Directions on Fraud Risk Management (July 2024). "
    "Analyze the following transaction signals and return ONLY valid JSON with exactly "
    "two keys:\n"
    "- score: float between 0.0 and 1.0 representing fraud probability\n"
    "- modus_operandi: string containing the RBI FMR-1 compliant fraud description\n\n"
    "The modus_operandi must:\n"
    "1. Describe the fraud mechanism in 2-4 sentences\n"
    "2. Reference specific signals (device IDs, hop counts, amounts, timing)\n"
    "3. Include risk classification (CRITICAL / HIGH_ALERT / MEDIUM)\n"
    "4. Be written in formal English suitable for regulatory submission\n\n"
    "Return NOTHING except the JSON object. No preamble, no explanation."
)


def build_prompt(
    transaction: dict,
    features: dict,
    graph_signals: dict
) -> str:
    """
    Builds the full Mistral [INST] prompt for fraud narrative generation.
    """
    input_section = (
        f"transaction_id: {transaction.get('transaction_id', 'N/A')} | "
        f"amount: ₹{float(transaction.get('amount', 0)):,.0f} | "
        f"timestamp: {transaction.get('timestamp', 'N/A')} | "
        f"merchant_category: {transaction.get('merchant_category', 'N/A')} | "
        f"fraud_type: {transaction.get('fraud_type', 'UNKNOWN')} | "
        f"user_id: {transaction.get('user_id', 'N/A')}\n\n"
        f"ML Features: {json.dumps(features, ensure_ascii=False)}\n\n"
        f"Graph Signals: {json.dumps(graph_signals, ensure_ascii=False)}"
    )

    return (
        f"<s>[INST] {SYSTEM_INSTRUCTION}\n\n"
        f"{input_section} [/INST]"
    )
