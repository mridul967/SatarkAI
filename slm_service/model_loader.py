# slm_service/model_loader.py
import torch
import logging
import os
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import PeftModel

logger = logging.getLogger(__name__)

MODEL_ID = os.getenv('SLM_BASE_MODEL', 'mistralai/Mistral-7B-Instruct-v0.3')
ADAPTER_PATH = os.getenv('SLM_ADAPTER_PATH', './satark-slm-final')


def load_model():
    """
    Loads the base model + LoRA adapters into GPU memory.
    Called once at FastAPI startup — stays resident.
    Returns: (model, tokenizer)
    """
    logger.info(f"Loading base model: {MODEL_ID}")
    logger.info(f"Loading LoRA adapters from: {ADAPTER_PATH}")

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type='nf4',
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    tokenizer.pad_token = tokenizer.eos_token

    base_model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        quantization_config=bnb_config,
        device_map='auto',
        trust_remote_code=True
    )

    model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)
    model.eval()

    vram_used = torch.cuda.memory_allocated() / 1e9
    logger.info(f"Model loaded successfully. VRAM used: {vram_used:.2f} GB")

    return model, tokenizer
