"""HTTP contract tests for the AI engine Flask API."""

import unittest
from unittest.mock import patch

import app as ai_app


class TestAIEngineAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = ai_app.app.test_client()

    def setUp(self):
        self.previous_key = ai_app.AI_API_KEY
        ai_app.AI_API_KEY = 'test-service-key'
        self.headers = {'X-API-Key': 'test-service-key'}

    def tearDown(self):
        ai_app.AI_API_KEY = self.previous_key

    def test_health_is_available_without_service_auth(self):
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['status'], 'healthy')

    def test_prediction_requires_service_key(self):
        response = self.client.post('/predict', json={'patient': {}, 'symptoms': {}})
        self.assertEqual(response.status_code, 401)

    def test_prediction_validates_body_and_returns_abstention_contract(self):
        invalid = self.client.post('/predict', json={'patient': [], 'symptoms': {}}, headers=self.headers)
        self.assertEqual(invalid.status_code, 400)

        valid = self.client.post(
            '/predict',
            json={'patient': {}, 'symptoms': {'unknown_question': 'yes'}},
            headers=self.headers,
        )
        self.assertEqual(valid.status_code, 200)
        result = valid.get_json()
        self.assertEqual(result['status'], 'insufficient_evidence')
        self.assertEqual(result['conditions'], [])
        self.assertEqual(result['feature_contributions'], {})

    def test_dataset_metadata_contains_loaded_model_counts(self):
        response = self.client.get('/datasets/info')
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body['status'], 'active')
        self.assertEqual(body['symptoms_count'], len(ai_app.classifier.feature_names))
        self.assertEqual(body['conditions_count'], len(ai_app.classifier.label_encoder.classes_))
        self.assertEqual(body['datasets'][0]['records'], ai_app.classifier.metrics['num_samples'])
        self.assertNotIn('train_accuracy', body['metrics'])
        evaluation = body['evaluation']
        self.assertEqual(evaluation['status'], 'not_independent')
        self.assertEqual(evaluation['test_rows'], len(__import__('pandas').read_csv(ai_app.Config.TEST_DATASET)))
        self.assertGreater(evaluation['exact_training_overlaps'], 0)
        self.assertFalse(evaluation['performance_metrics_published'])

    def test_dataset_metadata_reports_unavailable_when_evaluation_files_are_missing(self):
        with self.assertLogs('app', level='ERROR'):
            with patch.object(ai_app.Config, 'TEST_DATASET', 'missing-evaluation-file.csv'):
                response = self.client.get('/datasets/info')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.get_json()['error'], 'Dataset evaluation metadata is unavailable')

    def test_eig_route_returns_feature_contract(self):
        response = self.client.post(
            '/next-question',
            json={'current_responses': {}, 'asked_features': []},
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertIn('completed', body)
        if not body['completed']:
            self.assertIn('next_feature', body)
            self.assertNotIn('next_question_code', body)


if __name__ == '__main__':
    unittest.main()
