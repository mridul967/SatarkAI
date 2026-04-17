# slm_training/validate_data.py
"""
Validates training_data.jsonl before uploading to Colab for fine-tuning.
Run: python slm_training/validate_data.py
"""
import json
import os
import sys

def validate():
    path = os.getenv('TRAINING_DATA_PATH', './slm_training/training_data.jsonl')
    
    if not os.path.exists(path):
        print(f"❌ File not found: {path}")
        print("   Run the app with COLLECT_TRAINING_DATA=true for 30-60 minutes first.")
        sys.exit(1)

    records = []
    errors = []

    with open(path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            try:
                record = json.loads(line.strip())
                # Validate required keys
                assert 'instruction' in record, "Missing 'instruction' key"
                assert 'input' in record, "Missing 'input' key"
                assert 'output' in record, "Missing 'output' key"
                # Validate output is valid JSON with required keys
                output = json.loads(record['output'])
                assert 'score' in output, "Missing 'score' in output"
                assert 'modus_operandi' in output, "Missing 'modus_operandi' in output"
                assert 0.0 <= float(output['score']) <= 1.0, f"Score out of range: {output['score']}"
                assert len(output['modus_operandi']) > 20, "modus_operandi too short"
                records.append(record)
            except Exception as e:
                errors.append({'line': i+1, 'error': str(e)})

    print("=" * 50)
    print(" SatarkAI SLM Training Data Validation")
    print("=" * 50)
    print(f" File: {path}")
    print(f" ✅ Valid records: {len(records)}")
    print(f" ❌ Errors: {len(errors)}")
    
    if errors:
        print("\n Error Details (first 5):")
        for e in errors[:5]:
            print(f"   Line {e['line']}: {e['error']}")

    # Fraud type distribution
    from collections import Counter
    types = Counter(r.get('fraud_type', 'UNKNOWN') for r in records)
    print("\n Fraud Type Distribution:")
    for t, c in types.most_common():
        print(f"   {t}: {c}")

    # Readiness check
    print("\n" + "-" * 50)
    if len(records) >= 200:
        print(" ✅ READY FOR FINE-TUNING (200+ records)")
    elif len(records) >= 50:
        print(" ⚠️  MINIMUM MET — 50+ records (200+ recommended)")
    else:
        print(f" ❌ NOT ENOUGH DATA — need 200+, have {len(records)}")
    print("-" * 50)

if __name__ == '__main__':
    validate()
