"""
MediscanAI Clinical AI Engine
REST API for calibrated symptom classification, TreeSHAP explainability,
and Expected Information Gain (EIG) adaptive questioning.
"""

import os
import hmac
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv



load_dotenv()

from config import Config
from models.classifier import MedicalClassifier
from models.explainer import DiagnosisExplainer
from models.eig import EIGSelector

app = Flask(__name__)

# Strict CORS: Only allow localhost during local dev; in production, accessed via private network (SEC11)
CORS(app, origins=[
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001"
])

# Initialize AI components
classifier = MedicalClassifier()
explainer = DiagnosisExplainer()
eig_selector = EIGSelector(classifier)

AI_API_KEY = os.getenv('AI_API_KEY', 'internal_mediscan_ai_engine_key_secret_32')

def verify_api_key():
    """Verify internal service API key in constant time (SEC11)."""
    if not AI_API_KEY:
        return True # Dev mode without key
    auth_header = request.headers.get('X-API-Key')
    if not auth_header or not hmac.compare_digest(auth_header, AI_API_KEY):
        return False
    return True

# ============================================
# HEALTH CHECK
# ============================================
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'mediscan-ai',
        'model_loaded': classifier.is_loaded,
        'model_version': classifier.model_version
    })

# ============================================
# PREDICTION ENDPOINT
# ============================================
@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict diagnoses based on patient symptoms.
    Supports honest abstention (status: 'insufficient_evidence')
    and calibrated probabilities.
    """
    if not verify_api_key():
        return jsonify({'error': 'Unauthorized service access'}), 401

    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'error': 'Invalid JSON body'}), 400

        patient = data.get('patient', {})
        symptoms = data.get('symptoms', {})

        if not isinstance(patient, dict):
            return jsonify({'error': 'patient must be an object'}), 400
        if not isinstance(symptoms, (dict, list)):
            return jsonify({'error': 'symptoms must be an object or list'}), 400

        # Run prediction through calibrated classifier
        prediction_result = classifier.predict(patient, symptoms)

        # Generate explanation ledger
        explanation = explainer.explain(patient, symptoms, prediction_result)

        # Format conditions with display names
        formatted_conditions = []
        for pred in prediction_result.get('conditions', []):
            raw_cond = pred['condition']
            display_name = Config.CONDITION_DISPLAY_NAMES.get(raw_cond, raw_cond)
            formatted_conditions.append({
                'name': display_name,
                'condition_key': raw_cond,
                'confidence': pred['confidence'],
                'description': pred.get('description', ''),
                'precautions': pred.get('precautions', [])
            })

        return jsonify({
            'status': prediction_result.get('status', 'ok'),
            'conditions': formatted_conditions,
            'probability_vector': prediction_result.get('probability_vector', {}),
            'explanation': explanation.get('summary', ''),
            'clinical_overview': explanation.get('clinical_overview', ''),
            'precautions': explanation.get('precautions', []),
            'feature_contributions': explanation.get('feature_contributions', {}),
            'reasoning': explanation.get('reasoning', []),
            'missing_evidence_hints': prediction_result.get('missing_evidence_hints', []),
            'model_version': classifier.model_version
        })

    except Exception as e:
        print(f"[ERROR] Prediction failure: {e}", flush=True)
        return jsonify({
            'error': 'Clinical inference encountered an unexpected processing error',
            'code': 'INFERENCE_ERROR'
        }), 500

# ============================================
# COUNTERFACTUAL WHAT-IF ENDPOINT (§5.5)
# ============================================
@app.route('/predict/what-if', methods=['POST'])
def what_if():
    """
    Counterfactual reasoning: toggle a symptom and return the shifted probability vector.
    """
    if not verify_api_key():
        return jsonify({'error': 'Unauthorized service access'}), 401

    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'error': 'Invalid JSON body'}), 400

        patient = data.get('patient', {})
        base_symptoms = dict(data.get('symptoms', {}))
        toggle_symptom = data.get('toggle_symptom')
        toggle_state = data.get('toggle_state', True)

        if not toggle_symptom:
            return jsonify({'error': 'toggle_symptom is required'}), 400

        # Baseline prediction
        base_result = classifier.predict(patient, base_symptoms)

        # Counterfactual modified symptoms
        modified_symptoms = dict(base_symptoms)
        if toggle_state:
            modified_symptoms[toggle_symptom] = 1
        else:
            modified_symptoms.pop(toggle_symptom, None)

        cf_result = classifier.predict(patient, modified_symptoms)

        return jsonify({
            'toggle_symptom': toggle_symptom,
            'toggle_state': toggle_state,
            'baseline': base_result.get('conditions', []),
            'counterfactual': cf_result.get('conditions', []),
            'baseline_status': base_result.get('status'),
            'counterfactual_status': cf_result.get('status')
        })

    except Exception as e:
        print(f"[ERROR] What-if computation failure: {e}", flush=True)
        return jsonify({'error': 'Counterfactual analysis failed'}), 500

# ============================================
# ADAPTIVE QUESTION SELECTION VIA EIG (§5.4)
# ============================================
@app.route('/next-question', methods=['POST'])
def next_question():
    """
    Select the single most informative next question using Expected Information Gain (EIG).
    """
    if not verify_api_key():
        return jsonify({'error': 'Unauthorized service access'}), 401

    try:
        data = request.get_json(silent=True) or {}
        current_responses = data.get('current_responses', {})
        asked_features = data.get('asked_features', [])

        vector, positive_syms = classifier._symptoms_to_features({}, current_responses)
        eig_result = eig_selector.select_next_question(vector, asked_features)

        if not eig_result or eig_result.get('should_stop'):
            return jsonify({
                'completed': True,
                'current_entropy': eig_result.get('current_entropy', 0.0) if eig_result else 0.0,
                'message': 'Sufficient clinical evidence gathered to conclude adaptive inquiry.'
            })

        return jsonify({
            'completed': False,
            'next_feature': eig_result['next_feature'],
            'information_gain': eig_result['information_gain'],
            'current_entropy': eig_result['current_entropy'],
            'rationale': eig_result['rationale'],
            'contending_conditions': eig_result.get('contending_conditions', [])
        })

    except Exception as e:
        print(f"[ERROR] Next question EIG error: {e}", flush=True)
        return jsonify({'error': 'Adaptive inquiry service error'}), 500

# ============================================
# DATASETS INFO ENDPOINT
# ============================================
@app.route('/datasets/info', methods=['GET'])
def datasets_info():
    """
    Return metadata computed from the loaded symptom-profile training artifacts.
    """
    try:
        train_df = pd.read_csv(Config.TRAIN_DATASET)
        test_df = pd.read_csv(Config.TEST_DATASET)
    except (OSError, ValueError, pd.errors.ParserError) as exc:
        app.logger.exception('Unable to read evaluation data files')
        return jsonify({'error': 'Dataset evaluation metadata is unavailable'}), 503
    train_df = train_df.drop(columns=[c for c in train_df.columns if 'Unnamed' in c], errors='ignore')
    test_df = test_df.drop(columns=[c for c in test_df.columns if 'Unnamed' in c], errors='ignore')
    shared_columns = [column for column in train_df.columns if column in test_df.columns]
    training_rows = set(map(
        tuple,
        train_df[shared_columns].fillna('').astype(str).values.tolist()
    ))
    overlap_count = sum(
        tuple(row) in training_rows
        for row in test_df[shared_columns].fillna('').astype(str).values.tolist()
    )

    return jsonify({
        'status': 'active',
        'metrics': classifier.metrics,
        'evaluation': {
            'status': 'not_independent',
            'test_rows': len(test_df),
            'exact_training_overlaps': overlap_count,
            'performance_metrics_published': False
        },
        'symptoms_count': len(classifier.feature_names),
        'conditions_count': len(classifier.label_encoder.classes_) if classifier.label_encoder else 0,
        'datasets': [
            {
                'id': 'training',
                'name': 'Disease-Symptom Training Profiles',
                'source': 'Kaggle (Disease Prediction from Symptoms)',
                'url': 'https://www.kaggle.com/datasets/itachi9604/disease-symptom-description-dataset',
                'records': classifier.metrics.get('num_samples', 0),
                'unique_profiles': classifier.metrics.get('unique_profiles', 0),
                'features': len(classifier.feature_names),
                'target_classes': len(classifier.label_encoder.classes_) if classifier.label_encoder else 0,
                'type': 'Synthetic symptom combination profiles based on clinical presentation templates'
            }
        ]
    })

# ============================================
# VERNACULAR SYMPTOM EXTRACTION (NLU §5.6)
# ============================================
@app.route('/extract-symptoms', methods=['POST'])
def extract_symptoms():
    """
    Extract candidate symptom confirmation chips from free-text (English, Hindi, Hinglish).
    """
    try:
        data = request.get_json(silent=True) or {}
        text = data.get('text', '')
        from models.nlu import extract_symptoms_from_text
        chips = extract_symptoms_from_text(text)
        return jsonify({
            'text': text,
            'symptoms': chips,
            'count': len(chips)
        })
    except Exception as e:
        print(f"[ERROR] NLU symptom extraction failed: {e}", flush=True)
        return jsonify({'error': 'Symptom parsing failed'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
