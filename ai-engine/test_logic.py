"""Contract tests for AI engine components that do not make clinical claims."""

import unittest

from models.classifier import MedicalClassifier
from models.explainer import DiagnosisExplainer


class TestAIEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.classifier = MedicalClassifier()

    def test_classifier_abstains_without_mapped_symptoms(self):
        result = self.classifier.predict(
            {'age': 32, 'gender': 'female'},
            {'unrecognized_question_code': 'yes'}
        )
        self.assertEqual(result['status'], 'insufficient_evidence')
        self.assertEqual(result['conditions'], [])
        self.assertEqual(result['probability_vector'], {})
        self.assertTrue(result['missing_evidence_hints'])

    def test_classifier_maps_symptoms_and_returns_raw_probability_vector(self):
        symptoms = {
            'high_fever': 1,
            'cough': 1,
            'fatigue': 1,
        }
        result = self.classifier.predict({}, symptoms)
        self.assertIn(result['status'], {'ok', 'low_confidence'})
        self.assertTrue(result['conditions'])
        self.assertIn('condition', result['conditions'][0])
        self.assertGreaterEqual(result['conditions'][0]['confidence'], 0)
        self.assertLessEqual(result['conditions'][0]['confidence'], 1)
        self.assertAlmostEqual(sum(result['probability_vector'].values()), 1.0, places=3)

    def test_list_and_direct_flag_inputs_map_to_the_same_features(self):
        list_vector, list_positive = self.classifier._symptoms_to_features(
            {}, ['high_fever', 'cough']
        )
        dict_vector, dict_positive = self.classifier._symptoms_to_features(
            {}, {'high_fever': 1, 'cough': 1}
        )
        self.assertEqual(list_vector, dict_vector)
        self.assertEqual(set(list_positive), set(dict_positive))

    def test_explainer_reports_unavailable_attribution_without_inventing_tips(self):
        explainer = DiagnosisExplainer()
        result = explainer.explain({}, {}, {'explanation': 'Model summary'})
        self.assertEqual(result['summary'], 'Model summary')
        self.assertEqual(result['explanation_status'], 'unavailable')
        self.assertEqual(result['feature_contributions'], {})
        self.assertEqual(result['precautions'], [])
        self.assertEqual(result['reasoning'], [])

    def test_model_construction_never_trains_implicitly(self):
        classifier = MedicalClassifier(load_model=False)
        self.assertFalse(classifier.is_loaded)


if __name__ == '__main__':
    unittest.main()
