"""
Unit tests for AI Engine components:
- Rule-based & feature mapping logic
- Adaptive decision tree question selection
- XAI explainer reasoning & preventive tips
"""

import unittest
from config import Config
from models.classifier import MedicalClassifier
from models.decision_tree import AdaptiveDecisionTree
from models.explainer import DiagnosisExplainer

class TestAIEngine(unittest.TestCase):
    def setUp(self):
        self.classifier = MedicalClassifier()
        self.decision_tree = AdaptiveDecisionTree()
        self.explainer = DiagnosisExplainer()

    def test_classifier_prediction_output(self):
        patient = {'age': 32, 'gender': 'female', 'weight': 65, 'height': 168}
        symptoms = {
            'q0000000-0000-0000-0000-000000000001': 'fever_flu',
            'q0000000-0000-0000-0000-000000000002': 'high',
            'q0000000-0000-0000-0000-000000000004': 'dry',
            'q0000000-0000-0000-0000-000000000005': ['body_ache', 'fatigue', 'chills']
        }
        predictions = self.classifier.predict(patient, symptoms)
        self.assertTrue(len(predictions) > 0)
        self.assertIn('condition', predictions[0])
        self.assertIn('confidence', predictions[0])
        self.assertGreater(predictions[0]['confidence'], 0)

    def test_adaptive_decision_tree_next_question(self):
        current_responses = {
            'q0000000-0000-0000-0000-000000000001': 'fever_flu'
        }
        answered = ['q0000000-0000-0000-0000-000000000001']
        next_q = self.decision_tree.get_next_question(current_responses, answered)
        self.assertIsNotNone(next_q)
        self.assertIn('id', next_q)
        self.assertNotIn(next_q['id'], answered)

    def test_explainer_generates_reasoning_and_tips(self):
        patient = {'age': 40, 'gender': 'male'}
        symptoms = {
            'q0000000-0000-0000-0000-000000000002': 'high',
            'q0000000-0000-0000-0000-000000000004': 'productive',
            'q0000000-0000-0000-0000-000000000005': ['fatigue', 'chills']
        }
        predictions = [
            {'condition': 'flu', 'confidence': 0.82},
            {'condition': 'pneumonia', 'confidence': 0.12},
            {'condition': 'common_cold', 'confidence': 0.06}
        ]
        explanation = self.explainer.explain(patient, symptoms, predictions)
        self.assertIn('summary', explanation)
        self.assertIn('feature_contributions', explanation)
        self.assertIn('reasoning', explanation)

        tips = self.explainer.get_preventive_tips([{'condition_key': 'flu'}])
        self.assertTrue(len(tips) > 0)
        self.assertIsInstance(tips[0], str)

if __name__ == '__main__':
    unittest.main()
