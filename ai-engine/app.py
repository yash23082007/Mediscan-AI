"""
MediscanAI Clinical AI Engine
REST API for calibrated symptom classification and explainability.
"""

import os
import hmac
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from config import Config
from models.classifier import MedicalClassifier
from models.explainer import DiagnosisExplainer

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

AI_API_KEY = os.getenv('AI_API_KEY')

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
        # SEC12: Avoid leaking raw exception internals
        print(f"[ERROR] Prediction failure: {e}", flush=True)
        return jsonify({
            'error': 'Clinical inference encountered an unexpected processing error',
            'code': 'INFERENCE_ERROR'
        }), 500

# ============================================
# DATASETS INFO ENDPOINT
# ============================================
@app.route('/datasets/info', methods=['GET'])
def datasets_info():
    """
    Return authentic metadata about the clinical symptom training dataset (F9, F10).
    Traceable to public Kaggle / UCI repositories.
    """
    return jsonify({
        'status': 'active',
        'metrics': classifier.metrics,
        'symptoms_count': len(classifier.feature_names),
        'conditions_count': len(classifier.label_encoder.classes_) if classifier.label_encoder else 41,
        'datasets': [
            {
                'name': 'Disease-Symptom Training Profiles',
                'source': 'Kaggle (Disease Prediction from Symptoms)',
                'url': 'https://www.kaggle.com/datasets/itachi9604/disease-symptom-description-dataset',
                'records': 4920,
                'unique_profiles': 304,
                'features': 132,
                'target_classes': 41,
                'type': 'Synthetic symptom combination profiles based on clinical presentation templates'
            },
            {
                'name': 'Medical Condition Pathology Descriptions',
                'source': 'Kaggle Medical Knowledge Base',
                'records': 41,
                'type': 'Condition etiology and pathology overviews'
            },
            {
                'name': 'Clinical Precautions & Care Guidelines',
                'source': 'Public Health Guidance Knowledge Base',
                'records': 41,
                'precautions_per_disease': 4,
                'type': 'Non-pharmacological precautions and consultation advice'
            },
            {
                'name': 'Symptom Clinical Severity Matrix',
                'source': 'Emergency Medicine Triage Weights',
                'records': 132,
                'scale': '1 to 7',
                'type': 'Relative symptom severity weights'
            }
        ]
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
