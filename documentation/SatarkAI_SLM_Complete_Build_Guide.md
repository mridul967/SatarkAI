# SatarkAI — Local SLM Complete Build Guide
**Antigravity Engineering · Phase 2.5 · April 2026**
**Classification: Internal / Confidential**

---

## Table of Contents

1. [What We Are Building & Why](#1-what-we-are-building--why)
2. [Architecture Overview](#2-architecture-overview)
3. [Repo Structure](#3-repo-structure)
4. [Isolation Strategy — Protecting Port 5173](#4-isolation-strategy--protecting-port-5173)
5. [Step 1 — Collect Training Data](#5-step-1--collect-training-data)
6. [Step 2 — Fine-Tune on Colab (QLoRA)](#6-step-2--fine-tune-on-colab-qlora)
7. [Step 3 — Build the SLM FastAPI Microservice](#7-step-3--build-the-slm-fastapi-microservice)
8. [Step 4 — Connect to Existing Backend](#8-step-4--connect-to-existing-backend)
9. [Step 5 — Docker Compose Integration](#9-step-5--docker-compose-integration)
10. [Step 6 — FMR-1 Compliance Wiring](#10-step-6--fmr-1-compliance-wiring)
11. [Environment Variables Reference](#11-environment-variables-reference)
12. [Testing & Validation](#12-testing--validation)
13. [Hardware Requirements](#13-hardware-requirements)
14. [Build Sequence & Timeline](#14-build-sequence--timeline)
15. [Checklists](#15-checklists)

---

## 1. What We Are Building & Why

### The Problem

SatarkAI v3.0 routes every high-risk transaction through four external LLM APIs — Claude 3, GPT-4o, Gemini 2.0 Flash, and Groq Llama 3.3. Each call sends transaction metadata over HTTPS to servers in the US and EU:

- Amount and merchant IDs
- Device fingerprints
- Account heuristics
- Graph signals (hop counts, shared device flags)

When a bank or NBFC deploys SatarkAI, this **immediately violates**:

- RBI Data Localisation requirements
- DPDP Act 2023 cross-border data transfer provisions
- Enterprise data residency contracts signed with banks

### The Solution

Replace the 4-LLM consensus engine with a single, locally-hosted Small Language Model (SLM) — fine-tuned on fraud narratives and RBI compliance language — that runs entirely on-premises. **No customer data ever leaves the bank's server.**

### What the SLM Does NOT Replace

The GNN + LightGBM fast-path (<50ms fraud decision) is **completely untouched**. The SLM only replaces `llm_service.py` — the slow-path narrative generator.

```
CURRENT FLOW (v3.0)
Transaction → [GNN + LightGBM <50ms] → score > 0.6
  → asyncio.gather([Claude, Gemini, GPT-4o, Groq])   ← data leaves server
  → consensus narrative → FMR-1 PDF

TARGET FLOW (SLM)
Transaction → [GNN + LightGBM <50ms] → score > 0.6
  → local_slm.generate(features, graph_signals)       ← stays on server
  → narrative → FMR-1 PDF
```

### The SLM's Three Jobs

1. **Forensic Narrative Generation** — Write the Modus Operandi paragraph (e.g., "A Money Mule Ring was detected across 4 accounts sharing device fingerprint d7f2a91...")
2. **Secondary Risk Score** — Return a 0.0–1.0 probability that enters the existing consensus arithmetic
3. **FMR-1 Report Sections** — Fill "Description of Fraud" and "Fraud Modus Operandi" fields in the RBI standardized form

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Bank Infrastructure                       │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────┐ │
│  │   React UI   │    │  FastAPI     │    │  SLM Service  │ │
│  │  Port 5173   │◄──►│  Backend     │◄──►│  Port 8765    │ │
│  │  (unchanged) │    │  Port 8000   │    │  (NEW)        │ │
│  └──────────────┘    └──────┬───────┘    └───────────────┘ │
│                             │                               │
│                    ┌────────┴────────┐                      │
│                    │   GNN + LGBM    │                      │
│                    │   Fast Path     │                      │
│                    │   <50ms         │                      │
│                    └─────────────────┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │ Only hashes go out (blockchain audit)
         ▼
    Polygon PoS
    (Phase 3)
```

### Key Design Decisions

- **SLM is a separate FastAPI microservice** — completely isolated from the main backend
- **SLM failure never crashes the main app** — a timeout triggers silent fallback to cloud APIs
- **Feature flag controls everything** — `USE_LOCAL_SLM=false` by default; flip when ready
- **`compliance_service.py` needs zero changes** — SLM returns the same `explanation` key

---

## 3. Repo Structure

Add exactly this to your existing repo. Do not touch anything else.

```
SatarkAI/
├── backend/                          ← EXISTING — do not touch
│   ├── routers/
│   │   └── predict.py
│   ├── services/
│   │   ├── llm_service.py            ← MODIFY (4 additions only)
│   │   ├── compliance_service.py     ← DO NOT TOUCH
│   │   ├── graph_service.py          ← DO NOT TOUCH
│   │   └── feature_service.py        ← DO NOT TOUCH
│   └── config.py                     ← MODIFY (2 additions only)
│
├── frontend/                         ← EXISTING — do not touch
│
├── slm_service/                      ← NEW — create this entire folder
│   ├── main.py
│   ├── model_loader.py
│   ├── inference.py
│   ├── prompt_builder.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── satark-slm-final/             ← fine-tuned weights (gitignored)
│
├── slm_training/                     ← NEW — training notebooks & data
│   ├── SatarkAI_SLM_FineTune.ipynb
│   ├── training_data.jsonl           ← gitignored
│   └── README.md
│
├── docker-compose.yml                ← MODIFY (add slm profile)
└── .gitignore                        ← MODIFY (add SLM paths)
```

### Update `.gitignore`

Add these lines to your existing `.gitignore`:

```gitignore
# SLM — never commit model weights or raw training data
slm_service/satark-slm-final/
slm_training/training_data.jsonl
slm_training/satark-slm-checkpoints/
*.bin
*.safetensors
```

---

## 4. Isolation Strategy — Protecting Port 5173

This is the most important section. Your existing app running on port 5173 will **never be affected** at any point during this build.

### How Isolation Works

The entire safety mechanism is a timeout-wrapped HTTP call in `llm_service.py`. Three states:

| State | What Happens | Impact on App |
|-------|-------------|---------------|
| `USE_LOCAL_SLM=false` (default now) | SLM code never executes | Zero. App runs exactly as today. |
| `USE_LOCAL_SLM=true`, SLM service not running | `aiohttp` times out in 30s, returns `offline: True`, falls through to cloud APIs | Zero. Cloud APIs handle it. |
| `USE_LOCAL_SLM=true`, SLM service running | SLM handles narrative generation | Cloud APIs not called. |

### The Fallback Logic (in `llm_service.py`)

```python
async def compare(self, txn, features, graph_signals):
    # Try SLM first — if it fails for ANY reason, fall through silently
    if self.config.USE_LOCAL_SLM:
        result = await self._call_local_slm(txn, features, graph_signals)
        if not result.get('offline'):
            return result
        # SLM offline, crashed, timed out → falls through to cloud path below
        # No exception raised, no crash, no log noise in the UI

    # Existing 4-LLM cloud path — runs exactly as before
    providers = ['claude', 'gemini', 'gpt4o', 'groq']
    results = await asyncio.gather(
        *(self.predict(txn, features, graph_signals, p) for p in providers)
    )
    active_results = [r for r in results if not r.get('offline') and not r.get('error')]
    # ... rest of existing consensus logic unchanged
```

**Set `USE_LOCAL_SLM=false` in `.env` right now** and leave it there until Step 4 is complete and tested.

---

## 5. Step 1 — Collect Training Data

Before fine-tuning, you need (prompt, completion) pairs. The fastest way is to **harvest them from your existing 4-LLM engine** while you still have cloud API access.

### 5.1 Add Logging Mode to `llm_service.py`

Add this method to your existing `LLMService` class. It writes a training pair every time a narrative is successfully generated:

```python
# In backend/services/llm_service.py
# Add this method to LLMService class

import json
import os
from datetime import datetime

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
    Call this after a successful consensus result.
    Only runs if COLLECT_TRAINING_DATA=true in .env
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

    output_path = os.getenv('TRAINING_DATA_PATH', './slm_training/training_data.jsonl')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, 'a', encoding='utf-8') as f:
        f.write(json.dumps(record, ensure_ascii=False) + '\n')
```

### 5.2 Call the Logger After Consensus

In the existing `compare()` method, add one line after the consensus result is computed:

```python
# In your existing compare() method, after computing narrative
# Find where you currently return the result and add:

best_narrative = next(
    (r.get('explanation', '') for r in active_results if r.get('explanation')),
    'Narrative unavailable'
)

# ADD THIS LINE:
await self.log_training_pair(txn, features, graph_signals, best_narrative, consensus_score)

# Then return as before
return {
    'score': consensus_score,
    'explanation': best_narrative,
    'consensus_class': consensus_class,
    ...
}
```

### 5.3 Add to `.env`

```env
# Training data collection — set true for 30-60 minutes, then set false
COLLECT_TRAINING_DATA=false
TRAINING_DATA_PATH=./slm_training/training_data.jsonl
```

### 5.4 Add to `config.py`

```python
# In your existing Settings class
COLLECT_TRAINING_DATA: bool = False
TRAINING_DATA_PATH: str = './slm_training/training_data.jsonl'
```

### 5.5 Run the Collector

```bash
# 1. Set COLLECT_TRAINING_DATA=true in .env
# 2. Start your app normally
docker-compose up

# 3. Let the WebSocket simulator run for 30-60 minutes
# 4. Watch the file grow:
wc -l slm_training/training_data.jsonl
# Target: 300+ lines before stopping

# 5. Set COLLECT_TRAINING_DATA=false in .env when done
```

### 5.6 Validate Training Data

Run this quick validation before fine-tuning:

```python
# slm_training/validate_data.py
import json

path = './slm_training/training_data.jsonl'
records = []
errors = []

with open(path, 'r') as f:
    for i, line in enumerate(f):
        try:
            record = json.loads(line.strip())
            # Validate required keys
            assert 'instruction' in record
            assert 'input' in record
            assert 'output' in record
            # Validate output is valid JSON with required keys
            output = json.loads(record['output'])
            assert 'score' in output
            assert 'modus_operandi' in output
            assert 0.0 <= float(output['score']) <= 1.0
            assert len(output['modus_operandi']) > 20
            records.append(record)
        except Exception as e:
            errors.append({'line': i+1, 'error': str(e)})

print(f"Valid records: {len(records)}")
print(f"Errors: {len(errors)}")
if errors:
    for e in errors[:5]:
        print(f"  Line {e['line']}: {e['error']}")

# Fraud type distribution
from collections import Counter
types = Counter(r.get('fraud_type', 'UNKNOWN') for r in records)
print("\nFraud type distribution:")
for t, c in types.most_common():
    print(f"  {t}: {c}")
```

---

## 6. Step 2 — Fine-Tune on Colab (QLoRA)

> **Run on:** Google Colab Pro with A100 GPU (recommended) or T4 GPU.
> **Time:** 2–4 hours for 1,000 examples, 3 epochs on A100. ~6–8 hours on T4.
> **Cost:** ~$2–5 on Colab Pro compute units.

### 6.1 Upload Training Data to Colab

```python
# In Colab — Cell 0: Upload training data
from google.colab import files
uploaded = files.upload()
# Upload your slm_training/training_data.jsonl file
```

### 6.2 Install Dependencies

```python
# Cell 1 — Install all dependencies
!pip install -q transformers==4.40.0
!pip install -q datasets==2.19.0
!pip install -q peft==0.10.0
!pip install -q trl==0.8.6
!pip install -q bitsandbytes==0.43.1
!pip install -q accelerate==0.29.3
!pip install -q torch torchvision --index-url https://download.pytorch.org/whl/cu118

# Verify GPU
import torch
print(f"GPU: {torch.cuda.get_device_name(0)}")
print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
```

### 6.3 Load Base Model in 4-bit

```python
# Cell 2 — Load Mistral 7B in 4-bit quantization
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
import torch

MODEL_ID = 'mistralai/Mistral-7B-Instruct-v0.3'

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type='nf4',
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True,
)

print("Loading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = 'right'  # Important for training stability

print("Loading model (this takes 3-5 minutes)...")
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    quantization_config=bnb_config,
    device_map='auto',
    trust_remote_code=True
)

print(f"Model loaded. Memory used: {torch.cuda.memory_allocated() / 1e9:.2f} GB")
```

### 6.4 Configure LoRA Adapters

```python
# Cell 3 — Configure QLoRA adapters
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

# Prepare model for 4-bit training
model = prepare_model_for_kbit_training(model)

lora_config = LoraConfig(
    r=16,                    # Rank — higher = more capacity, more VRAM
    lora_alpha=32,           # Scaling factor (usually 2x rank)
    target_modules=[
        'q_proj', 'v_proj', 'k_proj', 'o_proj',
        'gate_proj', 'up_proj', 'down_proj'
    ],
    lora_dropout=0.05,
    bias='none',
    task_type='CAUSAL_LM'
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# Expected output: trainable params: ~41M || all params: 3.7B || ~1.1%
```

### 6.5 Load and Format Training Dataset

```python
# Cell 4 — Load and format the SatarkAI dataset
from datasets import load_dataset

dataset = load_dataset('json', data_files='training_data.jsonl', split='train')
print(f"Total records: {len(dataset)}")

def format_prompt(example):
    """
    Format into Mistral instruction format.
    The model learns: given [INST]...[/INST] → produce output
    """
    text = (
        f"<s>[INST] {example['instruction']}\n\n"
        f"{example['input']} [/INST]"
        f"{example['output']} </s>"
    )
    return {'text': text}

dataset = dataset.map(format_prompt, remove_columns=dataset.column_names)
dataset = dataset.train_test_split(test_size=0.1, seed=42)

print(f"Train: {len(dataset['train'])} | Eval: {len(dataset['test'])}")
print("\nSample formatted prompt:")
print(dataset['train'][0]['text'][:500])
```

### 6.6 Train

```python
# Cell 5 — Train with SFTTrainer
from trl import SFTTrainer
from transformers import TrainingArguments

training_args = TrainingArguments(
    output_dir='./satark-slm-checkpoints',
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,      # Effective batch size = 4 * 4 = 16
    learning_rate=2e-4,
    fp16=True,
    logging_steps=10,
    save_steps=100,
    evaluation_strategy='steps',
    eval_steps=50,
    load_best_model_at_end=True,
    warmup_ratio=0.03,
    lr_scheduler_type='cosine',
    report_to='none',                   # Set to 'wandb' if you use W&B
    optim='paged_adamw_32bit',          # Memory-efficient optimizer for QLoRA
)

trainer = SFTTrainer(
    model=model,
    train_dataset=dataset['train'],
    eval_dataset=dataset['test'],
    dataset_text_field='text',
    max_seq_length=1024,
    packing=False,
    args=training_args,
)

print("Starting training...")
trainer.train()

# Save the fine-tuned LoRA adapters (~80MB, not the full 7B model)
trainer.model.save_pretrained('./satark-slm-final')
tokenizer.save_pretrained('./satark-slm-final')
print("Model saved to ./satark-slm-final")
```

### 6.7 Test the Fine-Tuned Model

```python
# Cell 6 — Test before downloading
from peft import PeftModel
import json

# Load fine-tuned model
base_model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID, quantization_config=bnb_config, device_map='auto'
)
ft_model = PeftModel.from_pretrained(base_model, './satark-slm-final')
ft_model.eval()

def test_inference(transaction_summary: str) -> dict:
    instruction = (
        "You are SatarkAI, a fraud intelligence system for Indian banks. "
        "Analyze the transaction signals and return ONLY valid JSON with keys: "
        "score (float 0.0-1.0), modus_operandi (string)."
    )
    prompt = f"<s>[INST] {instruction}\n\n{transaction_summary} [/INST]"

    inputs = tokenizer(prompt, return_tensors='pt').to('cuda')
    with torch.no_grad():
        output = ft_model.generate(
            **inputs,
            max_new_tokens=300,
            temperature=0.1,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id
        )

    text = tokenizer.decode(output[0], skip_special_tokens=True)
    response = text.split('[/INST]')[-1].strip()

    try:
        return json.loads(response)
    except:
        return {'raw_output': response, 'parse_error': True}

# Test Case 1: Mule Ring
result = test_inference(
    "transaction_id: TXN_TEST_001 | amount: ₹47,200 | "
    "fraud_type: MULE_RING | graph_signals: {shared_device: 4_accounts, "
    "hop_count: 6, velocity_burst: true} | gnn_score: 0.94"
)
print("Test 1 - Mule Ring:")
print(json.dumps(result, indent=2, ensure_ascii=False))

# Test Case 2: SIM Swap
result = test_inference(
    "transaction_id: TXN_TEST_002 | amount: ₹1,20,000 | "
    "fraud_type: SIM_SWAP | graph_signals: {sim_id_mismatch: true, "
    "new_device: true, rapid_transfer: true} | gnn_score: 0.96"
)
print("\nTest 2 - SIM Swap:")
print(json.dumps(result, indent=2, ensure_ascii=False))
```

### 6.8 Download Weights to Your Repo

```python
# Cell 7 — Zip and download
import shutil
shutil.make_archive('satark-slm-final', 'zip', '.', 'satark-slm-final')

from google.colab import files
files.download('satark-slm-final.zip')
```

After downloading, unzip into `slm_service/satark-slm-final/` in your repo.

---

## 7. Step 3 — Build the SLM FastAPI Microservice

Create all these files inside `slm_service/`.

### `slm_service/requirements.txt`

```txt
fastapi==0.111.0
uvicorn[standard]==0.29.0
pydantic==2.7.0
torch==2.2.2
transformers==4.40.0
peft==0.10.0
bitsandbytes==0.43.1
accelerate==0.29.3
aiohttp==3.9.5
python-dotenv==1.0.1
```

### `slm_service/prompt_builder.py`

```python
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
```

### `slm_service/model_loader.py`

```python
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
```

### `slm_service/inference.py`

```python
# slm_service/inference.py
import torch
import json
import logging
import re
from .prompt_builder import build_prompt

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
```

### `slm_service/main.py`

```python
# slm_service/main.py
import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from .model_loader import load_model
from .inference import generate_narrative

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
```

### `slm_service/__init__.py`

```python
# slm_service/__init__.py
# Empty — marks slm_service as a Python package
```

### `slm_service/Dockerfile`

```dockerfile
FROM python:3.11-slim

# Install system deps for PyTorch + bitsandbytes
RUN apt-get update && apt-get install -y \
    gcc g++ git curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy service code
COPY . .

# Expose port
EXPOSE 8765

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:8765/health || exit 1

# Start the service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8765", "--workers", "1"]
```

---

## 8. Step 4 — Connect to Existing Backend

These are the **only two files** in your existing backend that need changes.

### 8.1 Update `config.py`

Add exactly two lines to your existing `Settings` class:

```python
# In backend/config.py — add to existing Settings class

class Settings(BaseSettings):
    # --- ALL YOUR EXISTING SETTINGS STAY EXACTLY AS THEY ARE ---

    # SLM Integration (Phase 2.5)
    # Set USE_LOCAL_SLM=false (default) to run app with no SLM changes
    # Set USE_LOCAL_SLM=true only after slm_service is running and tested
    USE_LOCAL_SLM: bool = False
    SLM_ENDPOINT: str = 'http://localhost:8765/generate'

    # --- rest of existing settings unchanged ---
```

### 8.2 Update `llm_service.py`

Add one method and modify `compare()`. Every other method stays untouched.

**Add the `_call_local_slm` method** (add anywhere in the `LLMService` class):

```python
# Add to LLMService class in backend/services/llm_service.py

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
        timeout = aiohttp.ClientTimeout(total=30)  # 30s max — longer than cloud APIs

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

    except aiohttp.ClientConnectorError:
        # SLM service not running — silent fallback, expected during development
        return {'offline': True, 'error': 'SLM service not reachable', 'provider': 'local_slm'}

    except asyncio.TimeoutError:
        return {'offline': True, 'error': 'SLM timeout (>30s)', 'provider': 'local_slm'}

    except Exception as e:
        return {'offline': True, 'error': str(e), 'provider': 'local_slm'}
```

**Modify `compare()`** — add the SLM branch at the top:

```python
# In LLMService.compare() — add these lines at the TOP of the method
# Everything below this block stays exactly as it is

async def compare(self, txn, features, graph_signals):

    # ── SLM Fast Path (Phase 2.5) ──────────────────────────────
    # If SLM is enabled and available, use it exclusively.
    # If SLM is offline/disabled, fall through to cloud APIs below.
    if self.config.USE_LOCAL_SLM:
        slm_result = await self._call_local_slm(txn, features, graph_signals)
        if not slm_result.get('offline'):
            # SLM succeeded — return in the same format as cloud consensus
            return {
                'score': slm_result['score'],
                'explanation': slm_result['explanation'],
                'consensus_class': self._score_to_class(slm_result['score']),
                'provider': 'local_slm',
                'models_used': 1,
                'slm_latency_ms': slm_result.get('latency_ms')
            }
        # SLM offline — log once and fall through (no UI impact)
        import logging
        logging.getLogger(__name__).warning(
            f"SLM offline: {slm_result.get('error')} — falling back to cloud APIs"
        )
    # ── END SLM BLOCK ──────────────────────────────────────────

    # YOUR EXISTING CODE CONTINUES HERE — DO NOT CHANGE ANYTHING BELOW
    providers = ["claude", "gemini", "gpt4o", "groq"]
    results = await asyncio.gather(
        *(self.predict(txn, features, graph_signals, p) for p in providers)
    )
    # ... rest of existing method unchanged
```

**Add helper method** (if not already present):

```python
def _score_to_class(self, score: float) -> str:
    """Maps a 0.0-1.0 score to a risk class string."""
    if score >= 0.90:
        return 'CRITICAL'
    elif score >= 0.80:
        return 'HIGH_ALERT'
    elif score >= 0.60:
        return 'MEDIUM'
    else:
        return 'LOW'
```

---

## 9. Step 5 — Docker Compose Integration

### Update `docker-compose.yml`

Add the SLM as a **profile** — it never starts unless you explicitly request it:

```yaml
# docker-compose.yml — ADD slm_service block, keep everything else exactly as-is

version: '3.8'

services:
  # ── YOUR EXISTING SERVICES — DO NOT TOUCH ────────────────────────────
  backend:
    build: ./backend
    ports:
      - '8000:8000'
    env_file: .env
    # ... your existing backend config

  frontend:
    build: ./frontend
    ports:
      - '5173:5173'
    # ... your existing frontend config

  # ── NEW: SLM Service (only starts with --profile slm) ────────────────
  slm_service:
    profiles:
      - slm                            # NEVER starts with plain `docker-compose up`
    build:
      context: ./slm_service
      dockerfile: Dockerfile
    ports:
      - '8765:8765'
    volumes:
      - ./slm_service/satark-slm-final:/app/satark-slm-final:ro   # Read-only model weights
    environment:
      - SLM_BASE_MODEL=mistralai/Mistral-7B-Instruct-v0.3
      - SLM_ADAPTER_PATH=/app/satark-slm-final
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:8765/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 120s             # Give model time to load into GPU
    restart: unless-stopped
```

### Start Commands

```bash
# Normal startup — your app today, completely unaffected
docker-compose up

# Start everything including SLM (only when weights are ready)
docker-compose --profile slm up

# Start only the SLM service for isolated testing
docker-compose --profile slm up slm_service

# Rebuild SLM service after code changes
docker-compose --profile slm build slm_service
docker-compose --profile slm up slm_service

# Local development without Docker
cd slm_service
uvicorn main:app --host 0.0.0.0 --port 8765 --reload
```

---

## 10. Step 6 — FMR-1 Compliance Wiring

### `compliance_service.py` — Zero Changes Required

The SLM returns `explanation` as the key. `compliance_service.py` reads `llm_result.get('explanation', ...)`. They already match. You need to change nothing.

For confirmation, this is what the existing code reads:

```python
# compliance_service.py — EXISTING CODE, shown here for reference only
# DO NOT CHANGE THIS FILE

narrative = llm_result.get('explanation', 'Narrative unavailable')

# This narrative goes into:
# → FMR-1 Section: "Description of Fraud"
# → FMR-1 Section: "Fraud Modus Operandi"
# → ReportLab PDF generation (all unchanged)
```

### FMR-1 Field Mapping

| FMR-1 Section | Source Before SLM | Source After SLM |
|---------------|-------------------|------------------|
| Description of Fraud | First valid cloud LLM `explanation` | SLM `explanation` field |
| Fraud Modus Operandi | Cloud LLM narrative fallback chain | SLM `explanation` field |
| Risk Classification | Consensus score tier | GNN + LightGBM (unchanged) |
| Transaction Metadata | DB record | DB record (unchanged) |
| Reporting Deadline | Calculated from txn date | Calculated from txn date (unchanged) |
| AI Confidence Score | Cloud consensus mean | SLM `score` (0.0–1.0) |

---

## 11. Environment Variables Reference

### `.env` — Full Reference

```env
# ════════════════════════════════════════════════════════════════════
# EXISTING VARIABLES — DO NOT CHANGE
# ════════════════════════════════════════════════════════════════════
GOOGLE_API_KEY=xxx
GROQ_API_KEY=gsk_xxx
ANTHROPIC_API_KEY=sk-ant_xxx
OPENAI_API_KEY=sk-proj_xxx

# ════════════════════════════════════════════════════════════════════
# PHASE 2.5 — SLM INTEGRATION
# ════════════════════════════════════════════════════════════════════

# Master switch — set false during build, flip true when SLM is tested
USE_LOCAL_SLM=false

# Where the SLM FastAPI service is running
# Development: http://localhost:8765/generate
# Docker: http://slm_service:8765/generate
SLM_ENDPOINT=http://localhost:8765/generate

# ════════════════════════════════════════════════════════════════════
# TRAINING DATA COLLECTION (temporary — disable after collection)
# ════════════════════════════════════════════════════════════════════
COLLECT_TRAINING_DATA=false
TRAINING_DATA_PATH=./slm_training/training_data.jsonl
```

---

## 12. Testing & Validation

### Test 1 — SLM Service Health

```bash
# Should return: {"status": "ok", "model_loaded": true, ...}
curl http://localhost:8765/health | python -m json.tool
```

### Test 2 — Direct SLM Inference

```bash
curl -X POST http://localhost:8765/generate \
  -H "Content-Type: application/json" \
  -d '{
    "transaction": {
      "transaction_id": "TXN_TEST_001",
      "amount": 47200,
      "fraud_type": "MULE_RING",
      "merchant_category": "transfer",
      "user_id": "usr_1003",
      "timestamp": "2026-04-17T10:30:00Z"
    },
    "features": {
      "amount_zscore": 4.2,
      "velocity_score": 0.87,
      "diversity_score": 3
    },
    "graph_signals": {
      "shared_device_accounts": 4,
      "hop_count": 6,
      "velocity_burst": true,
      "device_age_days": 2
    }
  }' | python -m json.tool
```

**Expected response:**

```json
{
  "score": 0.93,
  "explanation": "A structured money mule operation was detected across 4 accounts sharing a common device fingerprint...",
  "provider": "local_slm",
  "latency_ms": 287.4,
  "parse_warning": null
}
```

### Test 3 — Full Pipeline Test (SLM + FMR-1)

```python
# Run from your backend directory
# backend/tests/test_slm_pipeline.py

import asyncio
import aiohttp
import json

async def test_full_pipeline():
    """
    Sends a test transaction through the full SatarkAI pipeline
    and verifies the FMR-1 PDF is generated using the SLM narrative.
    """
    async with aiohttp.ClientSession() as session:
        # 1. Trigger a high-risk transaction
        test_txn = {
            "transaction_id": "TXN_PIPELINE_TEST",
            "amount": 95000,
            "user_id": "usr_1003",
            "merchant_category": "transfer",
            "device_id": "dev_farm_001",
            "fraud_type": "MULE_RING"
        }

        async with session.post(
            'http://localhost:8000/api/predict',
            json=test_txn
        ) as resp:
            result = await resp.json()
            print(f"Prediction score: {result.get('score')}")
            print(f"Provider used: {result.get('provider')}")
            print(f"Narrative: {result.get('explanation', '')[:200]}")

            # Verify SLM was used
            assert result.get('provider') == 'local_slm', \
                f"Expected local_slm, got {result.get('provider')}"
            assert result.get('score', 0) > 0.8, "Expected high risk score"
            assert len(result.get('explanation', '')) > 50, "Narrative too short"

        print("\n✅ Full pipeline test passed — SLM narrative in FMR-1")

asyncio.run(test_full_pipeline())
```

### Test 4 — Fallback Test (SLM Offline)

```bash
# 1. Set USE_LOCAL_SLM=true in .env
# 2. Make sure slm_service is NOT running
# 3. Trigger a transaction
# 4. Verify the app still works and used cloud APIs

# In FastAPI logs you should see:
# WARNING | SLM offline: SLM service not reachable — falling back to cloud APIs

# The React dashboard on port 5173 should behave exactly as normal
```

---

## 13. Hardware Requirements

| Tier | Hardware | Inference Latency | Suitable For |
|------|----------|-------------------|--------------|
| Minimum | CPU only, 8GB RAM (Phi-3 Mini) | ~2,000ms | Development / testing only |
| Standard | NVIDIA T4 16GB + 16GB RAM | 200–400ms | Mid-size bank PoC |
| Recommended | NVIDIA A10G 24GB + 32GB RAM | 80–150ms | Production, large banks |
| Air-gapped | On-prem A100 40GB | ~50ms | Full offline, national banks |

### Development Machine Check

```bash
# Check GPU availability
python -c "import torch; print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU only')"

# Check available VRAM
python -c "import torch; print(f'{torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB VRAM')"

# Minimum for Mistral 7B 4-bit: 6GB VRAM
# Minimum for Phi-3 Mini (fallback): CPU with 8GB RAM
```

---

## 14. Build Sequence & Timeline

### Phase 2.5 Timeline: ~5 Working Days

```
Day 1 (2 hours) — Training Data Collection
  ├── Add log_training_pair() to llm_service.py
  ├── Set COLLECT_TRAINING_DATA=true
  ├── Run simulator for 30-60 minutes
  ├── Run validate_data.py — verify 200+ clean records
  └── Set COLLECT_TRAINING_DATA=false, commit changes

Day 2 (4-6 hours) — Fine-Tuning
  ├── Upload training_data.jsonl to Colab
  ├── Run Cells 1-5 (install, load, configure, format, train)
  ├── Run Cell 6 (test inference — verify score + modus_operandi)
  ├── Download satark-slm-final.zip
  └── Unzip into slm_service/satark-slm-final/

Day 3 (3 hours) — Build SLM Microservice
  ├── Create slm_service/ folder and all files
  ├── Test locally: uvicorn main:app --port 8765
  ├── Hit /health — verify model_loaded: true
  └── Hit /generate with curl test — verify response

Day 4 (2 hours) — Connect to Backend
  ├── Add 2 lines to config.py
  ├── Add _call_local_slm() to llm_service.py
  ├── Add SLM branch to compare()
  ├── Set USE_LOCAL_SLM=true in .env
  └── Restart backend — run Test 3 (full pipeline)

Day 5 (2 hours) — Docker + Validation
  ├── Add slm profile to docker-compose.yml
  ├── docker-compose --profile slm up
  ├── Run Test 4 (fallback test — SLM offline)
  ├── Verify FMR-1 PDF contains SLM narrative
  └── Set USE_LOCAL_SLM=false, document latency numbers
```

---

## 15. Checklists

### Training Data Checklist
- [ ] `log_training_pair()` method added to `llm_service.py`
- [ ] `COLLECT_TRAINING_DATA=true` set in `.env`
- [ ] Simulator ran for at least 30 minutes
- [ ] `validate_data.py` reports 0 errors and 200+ records
- [ ] Distribution covers all fraud types: MULE_RING, SIM_SWAP, MERCHANT_COLLUSION, VELOCITY_BURST
- [ ] `COLLECT_TRAINING_DATA=false` restored after collection
- [ ] `training_data.jsonl` in `.gitignore`

### Fine-Tuning Checklist
- [ ] Colab runtime set to A100 or T4 GPU
- [ ] All Cell 1 dependencies install without error
- [ ] Mistral 7B loads in 4-bit (VRAM < 6GB used)
- [ ] `model.print_trainable_parameters()` shows ~0.2–1.1%
- [ ] Training runs all 3 epochs without OOM error
- [ ] Eval loss decreasing (not increasing) by epoch 2
- [ ] Cell 6 test — Mule Ring case returns `score > 0.85` and non-empty `modus_operandi`
- [ ] Cell 6 test — SIM Swap case returns `score > 0.90` and mentions SIM
- [ ] `satark-slm-final/` downloaded and placed in `slm_service/`

### SLM Service Checklist
- [ ] All files created in `slm_service/`
- [ ] `uvicorn main:app --port 8765` starts without error
- [ ] `GET /health` returns `{"model_loaded": true}`
- [ ] `POST /generate` curl test returns valid JSON with `score` and `explanation`
- [ ] `explanation` field is a non-empty string > 50 characters
- [ ] Latency measured and logged (`latency_ms` in response)

### Backend Integration Checklist
- [ ] 2 lines added to `config.py` Settings class
- [ ] `_call_local_slm()` method added to `LLMService`
- [ ] SLM branch added at top of `compare()` method
- [ ] `USE_LOCAL_SLM=true` in `.env`
- [ ] Backend restarted — no startup errors
- [ ] Test transaction triggers SLM call (check logs for "Generated narrative for txn")
- [ ] FMR-1 PDF generated with SLM narrative (not cloud API narrative)
- [ ] Fallback test passes: SLM offline → cloud APIs used → UI unaffected

### Docker Checklist
- [ ] `slm_service` block added to `docker-compose.yml` with `profiles: [slm]`
- [ ] `docker-compose up` (no profile) starts app normally — SLM NOT included
- [ ] `docker-compose --profile slm up` starts SLM service
- [ ] GPU passthrough works (check with `docker exec slm_service nvidia-smi`)
- [ ] Health check passes after 120s startup window

### Bank Delivery Checklist
- [ ] `satark-slm-final/` weights on secure media or private repo
- [ ] `slm_service/` Dockerfile builds cleanly
- [ ] `SLM_SETUP.md` written for bank IT team (single-command startup)
- [ ] Hardware requirements documented for bank CISO
- [ ] Privacy architecture diagram ready (data never leaves bank diagram)
- [ ] Mistral license confirmed — Apache 2.0, commercial use permitted
- [ ] Latency benchmarks documented: P50, P95, P99

---

## Appendix — Key Files Changed Summary

| File | Change Type | What Changes |
|------|-------------|--------------|
| `backend/config.py` | Add 2 lines | `USE_LOCAL_SLM`, `SLM_ENDPOINT` settings |
| `backend/services/llm_service.py` | Add 1 method + modify 1 method | `_call_local_slm()`, SLM branch in `compare()` |
| `docker-compose.yml` | Add 1 service block | `slm_service` with `profiles: [slm]` |
| `.env` | Add 2 variables | `USE_LOCAL_SLM`, `SLM_ENDPOINT` |
| `.gitignore` | Add 4 lines | Ignore model weights and training data |
| `slm_service/` | Create entire folder | New FastAPI microservice |
| `slm_training/` | Create entire folder | Training notebook and data |

**Files with zero changes:**
- `compliance_service.py` — untouched
- `graph_service.py` — untouched
- `feature_service.py` — untouched
- `predict.py` — untouched
- All React frontend files — untouched
- Port 5173 — unaffected throughout

---

*SatarkAI — Antigravity Internal Document*
*"Har len-den par nazar." — Every transaction. On your servers.*
*Confidential — Antigravity Internal Use Only | Phase 2.5 | April 2026*
