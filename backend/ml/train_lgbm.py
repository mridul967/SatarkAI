import lightgbm as lgb
import pandas as pd
import numpy as np
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import f1_score, average_precision_score
import pickle

def train_lgbm():
    try:
        df = pd.read_parquet('data/satark_train.parquet')
    except:
        print("Data source 'satark_train.parquet' missing. Cannot execute LightGBM training yet.")
        return [], 0.5
        
    feature_cols = ['amount_log', 'hour_sin', 'hour_cos', 'merchant_id']
    X = df[feature_cols].fillna(-999)
    y = df['label']
    
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    oof_preds = np.zeros(len(df))
    
    params = {
        'objective': 'binary',
        'metric': 'average_precision',
        'learning_rate': 0.05,
        'num_leaves': 63,
        'min_child_samples': 20,
        'scale_pos_weight': (y == 0).sum() / (y == 1).sum(),
        'feature_fraction': 0.8,
        'bagging_fraction': 0.8,
        'bagging_freq': 5,
        'verbose': -1,
    }
    
    models = []
    for fold, (train_idx, val_idx) in enumerate(skf.split(X, y)):
        X_tr, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_tr, y_val = y.iloc[train_idx], y.iloc[val_idx]
        
        model = lgb.train(
            params,
            lgb.Dataset(X_tr, y_tr),
            num_boost_round=1000,
            valid_sets=[lgb.Dataset(X_val, y_val)],
            callbacks=[lgb.early_stopping(50), lgb.log_evaluation(100)]
        )
        oof_preds[val_idx] = model.predict(X_val)
        models.append(model)
    
    auprc = average_precision_score(y, oof_preds)
    threshold = np.percentile(oof_preds[y == 1], 20)
    print(f"LightGBM OOF — AUPRC: {auprc:.4f} | Threshold: {threshold:.4f}")
    
    with open('models/satark_lgbm.pkl', 'wb') as f:
        pickle.dump({'models': models, 'threshold': threshold}, f)
    
    return models, threshold

if __name__ == '__main__':
    train_lgbm()
