"""
AI-Powered Medical Diagnosis Engine
Flask REST API for symptom classification and adaptive questioning
"""

import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from config import Config
from models.classifier import MedicalClassifier
from models.decision_tree import AdaptiveDecisionTree
from models.explainer import DiagnosisExplainer

app = Flask(__name__)
CORS(app)

# Initialize AI components
classifier = MedicalClassifier()
decision_tree = AdaptiveDecisionTree()
explainer = DiagnosisExplainer()

# ============================================
# HEALTH CHECK
# ============================================
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'ai-engine',
        'model_loaded': classifier.is_loaded,
        'version': '1.0.0'
    })

# ============================================
# PREDICTION ENDPOINT
# ============================================
@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict top-3 diagnoses based on patient symptoms and demographics.
    
    Request body:
    {
        "patient": { "age": 35, "gender": "male", "weight": 75, "height": 175 },
        "symptoms": { "question_id": "answer_value", ... }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        patient = data.get('patient', {})
        symptoms = data.get('symptoms', {})
        
        # Get predictions
        predictions = classifier.predict(patient, symptoms)
        
        # Generate explanations
        explanation = explainer.explain(patient, symptoms, predictions)
        
        # Format response
        conditions = []
        for pred in predictions[:3]:
            display_name = Config.CONDITION_DISPLAY_NAMES.get(pred['condition'], pred['condition'])
            conditions.append({
                'name': display_name,
                'condition_key': pred['condition'],
                'confidence': round(pred['confidence'], 4)
            })
        
        return jsonify({
            'conditions': conditions,
            'explanation': explanation['summary'],
            'clinical_overview': explanation.get('clinical_overview', ''),
            'precautions': explanation.get('precautions', []),
            'feature_contributions': explanation['feature_contributions'],
            'reasoning': explanation['reasoning'],
            'dataset_info': classifier.metrics
        })
        
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500

# ============================================
# DATASETS INFO ENDPOINT
# ============================================
@app.route('/datasets/info', methods=['GET'])
def datasets_info():
    """
    Return comprehensive metadata about the internet medical datasets used for training
    and clinical knowledge inference.
    """
    return jsonify({
        'status': 'active',
        'metrics': classifier.metrics,
        'symptoms_count': len(classifier.feature_names),
        'conditions_count': len(classifier.label_encoder.classes_) if classifier.label_encoder else 41,
        'datasets': [
            {
                'name': 'Disease Symptom Clinical Dataset',
                'source': 'Kaggle / Columbia University',
                'records': 4920,
                'features': 132,
                'target_classes': 41,
                'type': 'Training Clinical Records'
            },
            {
                'name': 'Disease-Symptom Benchmark Test Set',
                'source': 'Open Clinical ML Benchmark',
                'records': 42,
                'features': 132,
                'target_classes': 41,
                'type': 'Independent Evaluation Set'
            },
            {
                'name': 'Medical Disease Pathology Descriptions',
                'source': 'Open Biomedical Knowledge Repository',
                'records': 41,
                'type': 'Clinical Descriptions'
            },
            {
                'name': 'Symptom Precaution & Preventive Regimens',
                'source': 'Healthcare Guideline Database',
                'records': 41,
                'precautions_per_disease': 4,
                'type': 'Patient Safety Guidelines'
            },
            {
                'name': 'Symptom Triage Severity Weights',
                'source': 'Clinical Triage Urgency Database',
                'records': 132,
                'scale': '1 to 7',
                'type': 'Severity Weight Matrix'
            },
            {
                'name': 'Pima Indians Diabetes Diagnostic Dataset',
                'source': 'NIDDK / UCI Machine Learning Repository',
                'records': 768,
                'features': 8,
                'type': 'Biochemical Diagnostic Benchmarks'
            }
        ]
    })


# ============================================
# ADAPTIVE QUESTION ENDPOINT
# ============================================
@app.route('/next-question', methods=['POST'])
def next_question():
    """
    Determine the next best question based on current responses.
    Uses information gain to select the most discriminating question.
    
    Request body:
    {
        "current_responses": { "question_id": "answer", ... },
        "answered_questions": ["q1", "q2", ...]
    }
    """
    try:
        data = request.get_json()
        
        current_responses = data.get('current_responses', {})
        answered_questions = data.get('answered_questions', [])
        
        next_q = decision_tree.get_next_question(current_responses, answered_questions)
        
        if next_q is None:
            return jsonify({'completed': True, 'message': 'All relevant questions answered'})
        
        return jsonify({
            'next_question_id': next_q['id'],
            'confidence': next_q.get('confidence', 0),
            'remaining_estimate': next_q.get('remaining', 0)
        })
        
    except Exception as e:
        print(f"Next question error: {str(e)}")
        return jsonify({'error': f'Failed to determine next question: {str(e)}'}), 500

# ============================================
# RETRAIN ENDPOINT (Admin only)
# ============================================
@app.route('/retrain', methods=['POST'])
def retrain():
    """
    Trigger model retraining with doctor feedback data.
    """
    try:
        api_key = request.headers.get('X-API-Key', '')
        if api_key != Config.AI_API_KEY:
            return jsonify({'error': 'Unauthorized'}), 401
        
        result = classifier.retrain()
        
        return jsonify({
            'message': 'Retraining completed',
            'metrics': result
        })
        
    except Exception as e:
        print(f"Retraining error: {str(e)}")
        return jsonify({'error': f'Retraining failed: {str(e)}'}), 500

# ============================================
# PREVENTIVE TIPS ENDPOINT
# ============================================
@app.route('/preventive-tips', methods=['POST'])
def preventive_tips():
    """
    Generate preventive health tips based on diagnosed conditions.
    """
    try:
        data = request.get_json()
        conditions = data.get('conditions', [])
        
        tips = explainer.get_preventive_tips(conditions)
        
        return jsonify({'tips': tips})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================
# RUN SERVER
# ============================================
if __name__ == '__main__':
    # Ensure model directory exists
    os.makedirs(Config.MODEL_PATH, exist_ok=True)
    
    # Train model if not already trained
    if not classifier.is_loaded:
        print("[INFO] Training initial model...")
        classifier.train_initial_model()
        print("[INFO] Model trained and saved")
    
    port = Config.FLASK_PORT
    print(f"[INFO] AI Engine running on port {port}")
    app.run(host='0.0.0.0', port=port, debug=Config.FLASK_ENV == 'development')
