"""
Medical Symptom Classifier
Calibrated Random Forest trained on authentic open-source clinical symptom profiles
(132 symptoms, 41 conditions).

Features:
- Isotonic probability calibration (CalibratedClassifierCV)
- Minimum-evidence gate (abstention if <2 active symptoms)
- Raw calibrated probabilities (no inflated top-3 renormalisation)
- S6 list/dict input parity
- Zero fake fallback predictions (fails honestly on model errors)
"""

import os
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import StratifiedKFold

from config import Config
from models.dataset_loader import MedicalDatasetKB


class MedicalClassifier:
    def __init__(self):
        self.model = None
        self.label_encoder = None
        self.feature_names = []
        self.is_loaded = False
        self.kb = MedicalDatasetKB.get_instance()
        self.metrics = {}
        self.model_version = "v1.0.0"

        # Try to load existing model
        self._load_model()

        # If no model found on disk, train on the clinical dataset
        if not self.is_loaded:
            print("[INFO] No pre-trained model found on disk. Training calibrated model...", flush=True)
            self.train_initial_model()

    def _load_model(self):
        """Load pre-trained calibrated model from disk."""
        try:
            if os.path.exists(Config.MODEL_FILE) and os.path.exists(Config.ENCODER_FILE):
                self.model = joblib.load(Config.MODEL_FILE)
                self.label_encoder = joblib.load(Config.ENCODER_FILE)

                feature_file = os.path.join(Config.MODEL_PATH, 'feature_names.json')
                if os.path.exists(feature_file):
                    with open(feature_file, 'r') as f:
                        self.feature_names = json.load(f)
                else:
                    self.feature_names = self.kb.symptoms

                metrics_file = os.path.join(Config.MODEL_PATH, 'metrics.json')
                if os.path.exists(metrics_file):
                    with open(metrics_file, 'r') as f:
                        self.metrics = json.load(f)

                self.is_loaded = True
                print(f"[INFO] MedicalClassifier loaded ({len(self.feature_names)} features, {len(self.label_encoder.classes_)} classes)", flush=True)
        except Exception as e:
            print(f"[WARN] Could not load model from disk: {e}", flush=True)
            self.is_loaded = False

    def train_initial_model(self):
        """
        Train the calibrated classifier on the clinical dataset.
        Fails fast if dataset is missing (No random noise training - F4).
        """
        train_path = Config.TRAIN_DATASET
        if not os.path.exists(train_path):
            raise FileNotFoundError(f"Training dataset not found at {train_path}. Refusing to train on fake data (F4).")

        print(f"[INFO] Loading clinical dataset from {train_path}...", flush=True)
        df = pd.read_csv(train_path)
        cols_to_drop = [c for c in df.columns if 'Unnamed' in c]
        if cols_to_drop:
            df = df.drop(columns=cols_to_drop)

        X = df.drop(columns=['prognosis'])
        y = df['prognosis'].astype(str).str.strip()
        self.feature_names = X.columns.tolist()

        # Label encoding
        self.label_encoder = LabelEncoder()
        y_encoded = self.label_encoder.fit_transform(y)

        # Base Random Forest
        base_rf = RandomForestClassifier(
            n_estimators=80,
            max_depth=20,
            min_samples_split=2,
            min_samples_leaf=1,
            random_state=42,
            n_jobs=1,
            class_weight='balanced'
        )

        # Calibrate probabilities using isotonic regression (S2)
        print("[INFO] Fitting CalibratedClassifierCV with isotonic calibration...", flush=True)
        cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
        self.model = CalibratedClassifierCV(estimator=base_rf, method='isotonic', cv=cv, n_jobs=1)
        self.model.fit(X.values, y_encoded)

        # Evaluate honest baseline metrics
        train_score = float(self.model.score(X.values, y_encoded))

        # Save artifacts
        os.makedirs(Config.MODEL_PATH, exist_ok=True)
        joblib.dump(self.model, Config.MODEL_FILE)
        joblib.dump(self.label_encoder, Config.ENCODER_FILE)

        with open(os.path.join(Config.MODEL_PATH, 'feature_names.json'), 'w') as f:
            json.dump(self.feature_names, f, indent=2)

        self.metrics = {
            'train_accuracy': round(train_score, 4),
            'num_samples': len(df),
            'unique_profiles': int(df.drop_duplicates().shape[0]),
            'num_features': len(self.feature_names),
            'num_classes': len(self.label_encoder.classes_),
            'calibration': 'isotonic',
            'model_type': 'CalibratedClassifierCV(RandomForestClassifier)'
        }

        with open(os.path.join(Config.MODEL_PATH, 'metrics.json'), 'w') as f:
            json.dump(self.metrics, f, indent=2)

        self.is_loaded = True
        print(f"[INFO] Calibrated model saved successfully (Accuracy: {self.metrics['train_accuracy']})", flush=True)

    def predict(self, patient, symptoms):
        """
        Make diagnosis predictions based on symptoms.
        Returns:
            dict containing:
                - status: 'ok' | 'low_confidence' | 'insufficient_evidence'
                - conditions: list of top candidates with raw calibrated probabilities
                - probability_vector: full dictionary of all 41 conditions and probabilities
                - explanation: diagnostic notes
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError("MedicalClassifier model is not loaded. Service unavailable.")

        # Map inputs to 132-symptom binary vector
        feature_vector, positive_symptoms = self._symptoms_to_features(patient, symptoms)

        # Minimum-evidence gate (S1, S3)
        if len(positive_symptoms) < 2:
            return {
                'status': 'insufficient_evidence',
                'conditions': [],
                'probability_vector': {},
                'positive_symptoms': positive_symptoms,
                'explanation': (
                    'Not enough symptoms reported to form a reliable clinical estimate. '
                    'Please report at least 2–3 active symptoms to receive an analysis.'
                ),
                'missing_evidence_hints': [
                    'Body temperature / fever level',
                    'Respiratory symptoms (cough, shortness of breath)',
                    'Digestive symptoms (nausea, pain, bowel changes)',
                    'Pain location (head, chest, abdomen, joints)'
                ]
            }

        # Predict raw calibrated probabilities (S2)
        probabilities = self.model.predict_proba([feature_vector])[0]
        classes = self.label_encoder.classes_

        # Full probability dictionary
        prob_dict = {
            str(classes[i]).strip(): round(float(probabilities[i]), 4)
            for i in range(len(classes))
        }

        # Top candidates sorted by probability
        ranked_indices = np.argsort(probabilities)[::-1]

        candidates = []
        for idx in ranked_indices[:5]:
            prob = float(probabilities[idx])
            if prob > 0.005 or len(candidates) < 3:
                cond_name = str(classes[idx]).strip()
                candidates.append({
                    'condition': cond_name,
                    'confidence': round(prob, 4), # Raw calibrated probability (no 5x inflation!)
                    'description': self.kb.get_description(cond_name),
                    'precautions': self.kb.get_precautions(cond_name)
                })

        # Determine confidence status (S3)
        top_prob = candidates[0]['confidence'] if candidates else 0.0
        status = 'ok'
        if top_prob < 0.20:
            status = 'low_confidence'

        return {
            'status': status,
            'conditions': candidates[:3],
            'probability_vector': prob_dict,
            'positive_symptoms': positive_symptoms,
            'explanation': self._build_clinical_summary(candidates[:3], positive_symptoms, status),
            'model_version': self.model_version
        }

    def _symptoms_to_features(self, patient, symptoms):
        """
        Convert questionnaire responses or symptom list into
        the 132-symptom binary vector expected by the model.
        Safe against both list and dict inputs (S6).
        """
        feature_dict = {f: 0 for f in self.feature_names}
        positive_detected = []

        # 1. Direct symptom array
        if isinstance(symptoms, list):
            for s in symptoms:
                s_clean = str(s).lower().replace(' ', '_').strip()
                if s_clean in feature_dict:
                    feature_dict[s_clean] = 1
                    positive_detected.append(s_clean)
            return [feature_dict[f] for f in self.feature_names], positive_detected

        # 2. Dictionary of questionnaire responses
        response_map = symptoms if isinstance(symptoms, dict) else {}

        # Handle direct key-value symptom flags
        for k, v in response_map.items():
            k_clean = str(k).lower().replace(' ', '_').strip()
            if k_clean in feature_dict and v and v != 'none' and v != 'no':
                feature_dict[k_clean] = 1
                positive_detected.append(k_clean)

        # Handle questionnaire question codes:

        # Fever severity
        fever_sev = response_map.get('fever_severity')
        if fever_sev == 'high':
            if 'high_fever' in feature_dict:
                feature_dict['high_fever'] = 1
                positive_detected.append('high_fever')
        elif fever_sev in ['mild', 'moderate']:
            if 'mild_fever' in feature_dict:
                feature_dict['mild_fever'] = 1
                positive_detected.append('mild_fever')

        # Fever duration
        fever_dur = response_map.get('fever_duration')
        if fever_dur in ['4_7_days', 'more_week']:
            if 'fatigue' in feature_dict:
                feature_dict['fatigue'] = 1
                positive_detected.append('fatigue')

        # Cough type
        cough = response_map.get('cough_type')
        if cough in ['dry', 'productive', 'bloody']:
            if 'cough' in feature_dict:
                feature_dict['cough'] = 1
                positive_detected.append('cough')
        if cough == 'productive':
            if 'phlegm' in feature_dict:
                feature_dict['phlegm'] = 1
                positive_detected.append('phlegm')
        if cough == 'bloody':
            if 'blood_in_sputum' in feature_dict:
                feature_dict['blood_in_sputum'] = 1
                positive_detected.append('blood_in_sputum')

        # General symptoms (multiselect array or string)
        gen = response_map.get('general_symptoms', [])
        if isinstance(gen, str):
            gen = [gen]
        if isinstance(gen, list):
            mapping = {
                'headache': ['headache'],
                'body_ache': ['muscle_pain', 'joint_pain'],
                'fatigue': ['fatigue', 'malaise'],
                'chills': ['chills', 'shivering'],
                'sweating': ['sweating'],
                'sore_throat': ['throat_irritation'],
                'runny_nose': ['runny_nose', 'continuous_sneezing', 'congestion']
            }
            for g in gen:
                if g in mapping:
                    for feat in mapping[g]:
                        if feat in feature_dict:
                            feature_dict[feat] = 1
                            positive_detected.append(feat)

        # Taste / smell
        taste = response_map.get('taste_smell')
        if taste in ['yes', 'partial']:
            if 'loss_of_smell' in feature_dict:
                feature_dict['loss_of_smell'] = 1
                positive_detected.append('loss_of_smell')

        # Energy level
        energy = str(response_map.get('energy_level', ''))
        if energy in ['1', '2']:
            if 'lethargy' in feature_dict:
                feature_dict['lethargy'] = 1
                positive_detected.append('lethargy')

        # Breathing difficulty
        breath = response_map.get('breathing_difficulty')
        if breath in ['mild', 'moderate', 'severe']:
            if 'breathlessness' in feature_dict:
                feature_dict['breathlessness'] = 1
                positive_detected.append('breathlessness')

        # Respiratory type
        resp = response_map.get('respiratory_type')
        if resp in ['shortness', 'wheezing', 'rapid']:
            if 'breathlessness' in feature_dict:
                feature_dict['breathlessness'] = 1
                positive_detected.append('breathlessness')
        if resp == 'chest_tight':
            if 'chest_pain' in feature_dict:
                feature_dict['chest_pain'] = 1
                positive_detected.append('chest_pain')

        # Chest pain
        chest = response_map.get('chest_pain_type')
        if chest in ['sharp', 'dull', 'burning']:
            if 'chest_pain' in feature_dict:
                feature_dict['chest_pain'] = 1
                positive_detected.append('chest_pain')

        # Digestive symptoms
        dig = response_map.get('digestive_symptoms', [])
        if isinstance(dig, str):
            dig = [dig]
        if isinstance(dig, list):
            dig_map = {
                'nausea': ['nausea', 'vomiting'],
                'diarrhea': ['diarrhoea'],
                'constipation': ['constipation'],
                'bloating': ['passage_of_gases', 'distention_of_abdomen'],
                'pain': ['abdominal_pain', 'belly_pain'],
                'appetite_loss': ['loss_of_appetite'],
                'acid_reflux': ['acidity', 'indigestion']
            }
            for d in dig:
                if d in dig_map:
                    for feat in dig_map[d]:
                        if feat in feature_dict:
                            feature_dict[feat] = 1
                            positive_detected.append(feat)

        # Pain location
        pain = response_map.get('pain_location')
        if pain == 'head' and 'headache' in feature_dict:
            feature_dict['headache'] = 1
            positive_detected.append('headache')
        elif pain == 'joints' and 'joint_pain' in feature_dict:
            feature_dict['joint_pain'] = 1
            positive_detected.append('joint_pain')
        elif pain == 'neck_back':
            if 'neck_pain' in feature_dict: feature_dict['neck_pain'] = 1
            if 'back_pain' in feature_dict: feature_dict['back_pain'] = 1
            positive_detected.append('back_pain')
        elif pain == 'muscles' and 'muscle_pain' in feature_dict:
            feature_dict['muscle_pain'] = 1
            positive_detected.append('muscle_pain')
        elif pain == 'abdomen' and 'abdominal_pain' in feature_dict:
            feature_dict['abdominal_pain'] = 1
            positive_detected.append('abdominal_pain')
        elif pain == 'chest' and 'chest_pain' in feature_dict:
            feature_dict['chest_pain'] = 1
            positive_detected.append('chest_pain')

        # Skin symptoms
        skin = response_map.get('skin_symptoms', [])
        if isinstance(skin, str):
            skin = [skin]
        if isinstance(skin, list):
            skin_map = {
                'itching': ['itching'],
                'rash': ['skin_rash', 'red_spots_over_body'],
                'blister': ['blister', 'nodal_skin_eruptions'],
                'discoloration': ['yellowish_skin'],
                'peeling': ['skin_peeling'],
                'swelling': ['swelling_of_stomach', 'swollen_legs']
            }
            for s in skin:
                if s in skin_map:
                    for feat in skin_map[s]:
                        if feat in feature_dict:
                            feature_dict[feat] = 1
                            positive_detected.append(feat)

        # Mental symptoms
        mental = response_map.get('mental_symptoms', [])
        if isinstance(mental, str):
            mental = [mental]
        if isinstance(mental, list):
            mental_map = {
                'anxiety': ['anxiety', 'restlessness'],
                'depression': ['depression'],
                'fatigue': ['fatigue', 'lethargy'],
                'insomnia': ['fatigue'],
                'mood_swings': ['mood_swings'],
                'concentration': ['lack_of_concentration']
            }
            for m in mental:
                if m in mental_map:
                    for feat in mental_map[m]:
                        if feat in feature_dict:
                            feature_dict[feat] = 1
                            positive_detected.append(feat)

        positive_unique = list(set(positive_detected))
        return [feature_dict[f] for f in self.feature_names], positive_unique

    def _build_clinical_summary(self, top_candidates, positive_symptoms, status):
        """Construct honest, clinically phrased summary without inflated certainty."""
        if not top_candidates:
            return "No matching conditions identified based on the provided symptom presentation."

        top = top_candidates[0]
        sym_str = ", ".join(s.replace('_', ' ') for s in positive_symptoms[:4])

        if status == 'low_confidence':
            return (
                f"Symptom presentation ({sym_str}) yielded low discriminative confidence. "
                f"Statistical estimate shows {top['condition']} at {round(top['confidence'] * 100, 1)}%. "
                "Clinical consultation is advised to obtain objective physical evaluation and lab tests."
            )

        pct = round(top['confidence'] * 100, 1)
        return (
            f"Based on the reported symptoms ({sym_str}), the model estimate indicates {top['condition']} "
            f"as the highest probability candidate ({pct}%). This is an algorithmic estimate, not a medical diagnosis."
        )
