from ctgan import CTGAN
import pandas as pd

def generate_synthetic_fraud(real_fraud_df: pd.DataFrame, n_samples: int = 5000):
    discrete_columns = ['merchant_category', 'device_id_bucket', 'hour_bucket']
    
    model = CTGAN(epochs=100, batch_size=500, verbose=True)
    model.fit(real_fraud_df, discrete_columns)
    
    synthetic = model.sample(n_samples)
    synthetic['label'] = 1
    synthetic['is_synthetic'] = True
    
    print(f"Generated {n_samples} synthetic fraud samples for SatarkAI augmentations.")
    return synthetic
