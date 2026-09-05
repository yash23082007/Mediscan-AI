"""
Medical Dataset Loader & Knowledge Base:
Loads, parses, and provides unified access to medical datasets downloaded from the internet:
- training_data.csv (4,920 clinical cases, 132 symptoms, 41 conditions)
- test_data.csv (42 evaluation cases)
- symptom_Description.csv (Official disease clinical descriptions)
- symptom_precaution.csv (Actionable precautions & preventive guidelines)
- symptom_severity.csv (Symptom clinical severity scores)
"""

import os
import re
import pandas as pd

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')

class MedicalDatasetKB:
    _instance = None
    
    def __init__(self):
        self.data_dir = DATA_DIR
        self.training_df = None
        self.test_df = None
        self.descriptions = {}
        self.precautions = {}
        self.severities = {}
        self.symptoms = []
        self.diseases = []
        self.is_loaded = False
        
        self.load_all()
        
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = MedicalDatasetKB()
        return cls._instance
        
    def _normalize_name(self, name):
        if not name:
            return ""
        return name.strip().lower().replace('_', ' ').replace('-', ' ')
        
    def load_all(self):
        """Load and normalize all datasets downloaded from the internet."""
        try:
            train_path = os.path.join(self.data_dir, 'training_data.csv')
            if os.path.exists(train_path):
                df = pd.read_csv(train_path)
                # Drop unneeded unnamed columns if present
                cols_to_drop = [c for c in df.columns if 'Unnamed' in c]
                if cols_to_drop:
                    df = df.drop(columns=cols_to_drop)
                self.training_df = df
                # Extract symptoms (all columns except prognosis)
                self.symptoms = [c for c in df.columns if c != 'prognosis']
                self.diseases = sorted(df['prognosis'].dropna().unique().tolist())
                print(f"[INFO] Loaded training dataset: {len(df)} records, {len(self.symptoms)} symptoms, {len(self.diseases)} diseases")
                
            test_path = os.path.join(self.data_dir, 'test_data.csv')
            if os.path.exists(test_path):
                df_test = pd.read_csv(test_path)
                cols_to_drop = [c for c in df_test.columns if 'Unnamed' in c]
                if cols_to_drop:
                    df_test = df_test.drop(columns=cols_to_drop)
                self.test_df = df_test
                print(f"[INFO] Loaded test dataset: {len(df_test)} test cases")
                
            desc_path = os.path.join(self.data_dir, 'symptom_Description.csv')
            if os.path.exists(desc_path):
                df_desc = pd.read_csv(desc_path, header=None, names=['Disease', 'Description'])
                for _, row in df_desc.iterrows():
                    d_name = str(row['Disease']).strip()
                    desc = str(row['Description']).strip()
                    self.descriptions[d_name] = desc
                    self.descriptions[self._normalize_name(d_name)] = desc
                print(f"[INFO] Loaded {len(df_desc)} disease clinical descriptions")
                
            prec_path = os.path.join(self.data_dir, 'symptom_precaution.csv')
            if os.path.exists(prec_path):
                df_prec = pd.read_csv(prec_path, header=None, names=['Disease', 'p1', 'p2', 'p3', 'p4'])
                for _, row in df_prec.iterrows():
                    d_name = str(row['Disease']).strip()
                    prec_list = [str(row[p]).strip() for p in ['p1', 'p2', 'p3', 'p4'] if pd.notna(row[p]) and str(row[p]).strip()]
                    self.precautions[d_name] = prec_list
                    self.precautions[self._normalize_name(d_name)] = prec_list
                print(f"[INFO] Loaded clinical precautions for {len(df_prec)} diseases")
                
            sev_path = os.path.join(self.data_dir, 'symptom_severity.csv')
            if os.path.exists(sev_path):
                df_sev = pd.read_csv(sev_path, header=None, names=['Symptom', 'Weight'])
                for _, row in df_sev.iterrows():
                    s_name = str(row['Symptom']).strip()
                    try:
                        w = int(row['Weight'])
                    except (ValueError, TypeError):
                        w = 1
                    self.severities[s_name] = w
                    self.severities[self._normalize_name(s_name)] = w
                print(f"[INFO] Loaded severity weights for {len(df_sev)} symptoms")
                
            self.is_loaded = True
        except Exception as e:
            print(f"[WARN] Error loading medical datasets: {e}")
            self.is_loaded = False
            
    def get_description(self, disease_name):
        """Retrieve clinical description for a given disease."""
        if not disease_name:
            return ""
        d = disease_name.strip()
        norm = self._normalize_name(d)
        if d in self.descriptions:
            return self.descriptions[d]
        if norm in self.descriptions:
            return self.descriptions[norm]
        # Partial match
        for k, v in self.descriptions.items():
            if norm in self._normalize_name(k) or self._normalize_name(k) in norm:
                return v
        return f"A medical condition characterized by characteristic clinical symptoms."
        
    def get_precautions(self, disease_name):
        """Retrieve 4 clinical precautions for a given disease."""
        if not disease_name:
            return ["Consult a qualified medical specialist", "Follow prescribed regimen", "Monitor vital signs", "Rest and hydrate"]
        d = disease_name.strip()
        norm = self._normalize_name(d)
        if d in self.precautions:
            return self.precautions[d]
        if norm in self.precautions:
            return self.precautions[norm]
        for k, v in self.precautions.items():
            if norm in self._normalize_name(k) or self._normalize_name(k) in norm:
                return v
        return ["Consult a qualified medical specialist", "Ensure proper rest and hydration", "Avoid self-medication", "Seek prompt medical care if symptoms worsen"]
        
    def get_severity(self, symptom_name):
        """Get clinical severity score (1-7) for a symptom."""
        if not symptom_name:
            return 1
        s = symptom_name.strip()
        norm = self._normalize_name(s)
        return self.severities.get(s, self.severities.get(norm, 2))
