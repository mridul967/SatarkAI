import os
import zipfile
from kaggle.api.kaggle_api_extended import KaggleApi
from dotenv import load_dotenv

load_dotenv()

def download_ieee_cis_dataset(data_dir='data'):
    """
    Downloads the IEEE-CIS Fraud Detection dataset from Kaggle.
    Requires KAGGLE_USERNAME and KAGGLE_KEY in .env.
    """
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)

    # Check if files already exist
    files = ['train_transaction.csv', 'train_identity.csv', 'test_transaction.csv', 'test_identity.csv']
    if all(os.path.exists(os.path.join(data_dir, f)) for f in files):
        print("Dataset already present in", data_dir)
        return

    print("Initializing Kaggle API...")
    api = KaggleApi()
    api.authenticate()

    print("Downloading ieee-fraud-detection dataset...")
    # Dataset name: ieee-fraud-detection
    api.dataset_download_files('ieee-fraud-detection', path=data_dir, unzip=True)
    
    # Alternatively, it might be a competition
    # api.competition_download_files('ieee-fraud-detection', path=data_dir)
    # with zipfile.ZipFile(os.path.join(data_dir, 'ieee-fraud-detection.zip'), 'r') as zip_ref:
    #     zip_ref.extractall(data_dir)

    print("Download complete.")

if __name__ == "__main__":
    try:
        download_ieee_cis_dataset()
    except Exception as e:
        print(f"Error downloading dataset: {e}")
        print("Ensure KAGGLE_USERNAME and KAGGLE_KEY are set correctly in your environment.")
