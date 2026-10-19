"""
Dataset Fetcher:
Downloads open-source symptom-combination datasets from their configured sources,
including training data (4,920 records, 132 symptoms, 41 labels), testing data,
disease medical descriptions, clinical precautions/preventive guidelines, and severity weights.
"""

import os
import urllib.request

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

DATASETS = {
    'training_data.csv': 'https://raw.githubusercontent.com/anujdutt9/Disease-Prediction-from-Symptoms/master/dataset/training_data.csv',
    'test_data.csv': 'https://raw.githubusercontent.com/anujdutt9/Disease-Prediction-from-Symptoms/master/dataset/test_data.csv',
    'symptom_Description.csv': 'https://raw.githubusercontent.com/acedev97/health-consultant-app/master/MasterData/symptom_Description.csv',
    'symptom_precaution.csv': 'https://raw.githubusercontent.com/acedev97/health-consultant-app/master/MasterData/symptom_precaution.csv',
    'symptom_severity.csv': 'https://raw.githubusercontent.com/acedev97/health-consultant-app/master/MasterData/Symptom_severity.csv'
}

def download_datasets():
    print("[INFO] Initiating download of medical datasets from internet...", flush=True)
    for filename, url in DATASETS.items():
        dest_path = os.path.join(DATA_DIR, filename)
        if os.path.exists(dest_path) and os.path.getsize(dest_path) > 100:
            print(f"[INFO] {filename} already exists ({os.path.getsize(dest_path) / 1024:.1f} KB). Skipping.", flush=True)
            continue
        try:
            print(f"[INFO] Downloading {filename} from {url}...", flush=True)
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            with urllib.request.urlopen(req, timeout=30) as response, open(dest_path, 'wb') as out_file:
                out_file.write(response.read())
            size_kb = os.path.getsize(dest_path) / 1024
            print(f"[SUCCESS] {filename} saved ({size_kb:.1f} KB)", flush=True)
        except Exception as e:
            print(f"[ERROR] Failed to download {filename}: {e}", flush=True)

if __name__ == '__main__':
    download_datasets()
