"""Honest explanation response until model-backed attribution is available."""


class DiagnosisExplainer:
    def explain(self, patient, symptoms, prediction_result):
        summary = ''
        if isinstance(prediction_result, dict):
            summary = prediction_result.get('explanation', '')

        return {
            'summary': summary,
            'clinical_overview': '',
            'precautions': [],
            'feature_contributions': {},
            'reasoning': [],
            'explanation_status': 'unavailable'
        }
