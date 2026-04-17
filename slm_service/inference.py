# slm_service/inference.py
import torch
import json
import logging
import re
from prompt_builder import build_prompt

logger = logging.getLogger(__name__)


def generate_narrative(
    model,
    tokenizer,
    transaction: dict,
    features: dict,
    graph_signals: dict
) -> dict:
    """
    Runs inference and returns a dict with keys:
    - score (float)
    - explanation (str)  ← matches the key compliance_service.py expects
    - provider (str)
    """
    prompt = build_prompt(transaction, features, graph_signals)

    inputs = tokenizer(
        prompt,
        return_tensors='pt',
        truncation=True,
        max_length=1024
    ).to('cuda')

    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=350,
            temperature=0.1,
            do_sample=False,
            repetition_penalty=1.1,
            pad_token_id=tokenizer.eos_token_id
        )

    # Decode only the new tokens (not the prompt)
    new_tokens = output_ids[0][inputs['input_ids'].shape[1]:]
    response_text = tokenizer.decode(new_tokens, skip_special_tokens=True).strip()

    logger.debug(f"Raw SLM output: {response_text[:200]}")

    return _parse_response(response_text)


def _parse_response(raw_text: str) -> dict:
    """
    Robustly parses the model output into a structured result.
    Tries JSON parse first, then regex extraction, then safe fallback.
    """
    # Attempt 1: Direct JSON parse
    try:
        result = json.loads(raw_text)
        return _build_result(result)
    except json.JSONDecodeError:
        pass

    # Attempt 2: Extract JSON block from markdown fences
    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw_text, re.DOTALL)
    if json_match:
        try:
            result = json.loads(json_match.group(1))
            return _build_result(result)
        except json.JSONDecodeError:
            pass

    # Attempt 3: Find raw JSON object in text
    brace_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
    if brace_match:
        try:
            result = json.loads(brace_match.group(0))
            return _build_result(result)
        except json.JSONDecodeError:
            pass

    # Attempt 4: Extract score and narrative with regex
    score_match = re.search(r'"score"\s*:\s*([0-9.]+)', raw_text)
    narrative_match = re.search(r'"modus_operandi"\s*:\s*"([^"]+)"', raw_text)

    if score_match and narrative_match:
        return {
            'score': float(score_match.group(1)),
            'explanation': narrative_match.group(1),
            'provider': 'local_slm'
        }

    # Final fallback: model produced unusable output — log it, return safe default
    logger.warning(f"SLM failed to produce parseable JSON. Raw: {raw_text[:300]}")
    return {
        'score': 0.5,
        'explanation': raw_text[:500] if raw_text else 'SLM narrative generation failed.',
        'provider': 'local_slm',
        'parse_warning': True
    }


def _build_result(parsed: dict) -> dict:
    """Normalises a successfully parsed dict to the expected schema."""
    score = parsed.get('score', 0.5)
    narrative = parsed.get('modus_operandi', parsed.get('explanation', ''))

    return {
        'score': max(0.0, min(1.0, float(score))),
        'explanation': narrative,
        'provider': 'local_slm'
    }
