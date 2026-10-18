"""
Explainable AI (XAI) Module: Evidence Ledger
Generates honest symptom contribution scores for and against each clinical condition
based on disease-symptom association profiles and reported presentation.
"""

from config import Config
from models.dataset_loader import MedicalDatasetKB


class DiagnosisExplainer:
    """
    Generates evidence ledger explanations for diagnosis predictions.
    Produces supporting and opposing symptom contributions.
    """

    def __init__(self):
        self.kb = MedicalDatasetKB.get_instance()
        self.symptom_display_names = {
            'high_fever': 'High Fever',
            'mild_fever': 'Mild / Moderate Fever',
            'cough': 'Cough',
            'phlegm': 'Mucus / Sputum',
            'blood_in_sputum': 'Coughing Blood (Hemoptysis)',
            'headache': 'Headache',
            'muscle_pain': 'Muscle Aches (Myalgia)',
            'fatigue': 'Fatigue / Malaise',
            'chills': 'Chills & Rigors',
            'shivering': 'Shivering',
            'sweating': 'Night Sweats / Heavy Sweating',
            'throat_irritation': 'Sore Throat',
            'runny_nose': 'Runny Nose',
            'continuous_sneezing': 'Sneezing',
            'congestion': 'Nasal Congestion',
            'loss_of_smell': 'Loss of Smell / Taste',
            'breathlessness': 'Shortness of Breath (Dyspnea)',
            'chest_pain': 'Chest Pain / Pressure',
            'nausea': 'Nausea',
            'vomiting': 'Vomiting',
            'diarrhoea': 'Diarrhea',
            'constipation': 'Constipation',
            'passage_of_gases': 'Abdominal Gas / Bloating',
            'distention_of_abdomen': 'Abdominal Distention',
            'abdominal_pain': 'Abdominal Pain',
            'belly_pain': 'Belly Pain',
            'loss_of_appetite': 'Loss of Appetite',
            'acidity': 'Acidity / Heartburn',
            'indigestion': 'Indigestion',
            'joint_pain': 'Joint Pain (Arthralgia)',
            'swelling_joints': 'Swollen Joints',
            'back_pain': 'Back Pain',
            'neck_pain': 'Neck Pain',
            'stiff_neck': 'Neck Stiffness',
            'muscle_weakness': 'Muscle Weakness',
            'itching': 'Itching (Pruritus)',
            'internal_itching': 'Internal Itching',
            'skin_rash': 'Skin Rash',
            'red_spots_over_body': 'Red Spots / Petechiae',
            'blister': 'Blisters',
            'anxiety': 'Anxiety',
            'restlessness': 'Restlessness',
            'depression': 'Low Mood / Depressive Feelings',
            'lethargy': 'Extreme Lethargy'
        }

    def explain(self, patient, symptoms, prediction_result):
        """
        Generate evidence ledger with positive and negative contributing factors.
        """
        if not prediction_result or not isinstance(prediction_result, dict):
            return {
                'summary': 'Unable to formulate clinical explanation.',
                'feature_contributions': {},
                'reasoning': [],
                'precautions': [],
                'clinical_overview': ''
            }

        status = prediction_result.get('status', 'ok')
        if status == 'insufficient_evidence':
            return {
                'summary': prediction_result.get('explanation', 'Insufficient clinical symptoms.'),
                'feature_contributions': {},
                'reasoning': ['Reported symptoms are below the minimum threshold for differentiation.'],
                'precautions': ['Record your temperature and monitor symptoms over the next 24 hours.'],
                'clinical_overview': 'Assessment withheld due to lack of distinct diagnostic indicators.'
            }

        conditions = prediction_result.get('conditions', [])
        if not conditions:
            return {
                'summary': 'No condition met the threshold for clinical likelihood.',
                'feature_contributions': {},
                'reasoning': [],
                'precautions': [],
                'clinical_overview': ''
            }

        top_condition = conditions[0]
        raw_cond = top_condition.get('condition', '')
        positive_symptoms = prediction_result.get('positive_symptoms', [])

        # Build feature contributions for top condition
        contributions = self._compute_evidence(raw_cond, positive_symptoms)

        # Build reasoning bullets
        reasoning = []
        for sym, weight in sorted(contributions.items(), key=lambda x: x[1], reverse=True):
            display = self.symptom_display_names.get(sym, sym.replace('_', ' ').title())
            if weight > 0:
                reasoning.append(f"Presence of {display} supports likelihood of {raw_cond}.")
            elif weight < 0:
                reasoning.append(f"Absence of expected {display} lowers likelihood of {raw_cond}.")

        return {
            'summary': prediction_result.get('explanation', ''),
            'clinical_overview': top_condition.get('description', ''),
            'precautions': top_condition.get('precautions', []),
            'feature_contributions': {
                self.symptom_display_names.get(k, k.replace('_', ' ').title()): round(v, 3)
                for k, v in contributions.items()
            },
            'reasoning': reasoning[:6]
        }

    def _compute_evidence(self, condition, positive_symptoms):
        """
        Compute disease-specific symptom evidence.
        Positive value: symptom supports condition.
        Negative value: absence of expected hallmark lowers condition likelihood.
        """
        contributions = {}
        pos_set = set(positive_symptoms)

        # Hallmark clinical profiles for common primary conditions
        HALLMARKS = {
            'Malaria': {'high_fever': 0.35, 'chills': 0.40, 'sweating': 0.25, 'headache': 0.15, 'nausea': 0.10},
            'Dengue': {'high_fever': 0.35, 'joint_pain': 0.30, 'skin_rash': 0.25, 'headache': 0.20, 'vomiting': 0.15},
            'Typhoid': {'high_fever': 0.30, 'abdominal_pain': 0.25, 'headache': 0.20, 'fatigue': 0.20, 'diarrhoea': 0.15},
            'Pneumonia': {'cough': 0.35, 'high_fever': 0.25, 'breathlessness': 0.35, 'phlegm': 0.20, 'chest_pain': 0.20},
            'Common Cold': {'continuous_sneezing': 0.30, 'cough': 0.25, 'mild_fever': 0.20, 'headache': 0.15, 'throat_irritation': 0.20},
            'Bronchial Asthma': {'breathlessness': 0.45, 'cough': 0.25, 'fatigue': 0.15},
            'Tuberculosis': {'cough': 0.35, 'blood_in_sputum': 0.40, 'sweating': 0.30, 'fatigue': 0.25, 'mild_fever': 0.20},
            'Heart attack': {'chest_pain': 0.55, 'breathlessness': 0.35, 'sweating': 0.30},
            'GERD': {'acidity': 0.45, 'indigestion': 0.30, 'chest_pain': 0.20, 'cough': 0.10},
            'Gastroenteritis': {'vomiting': 0.40, 'diarrhoea': 0.40, 'abdominal_pain': 0.25},
            'Migraine': {'headache': 0.50, 'acidity': 0.15, 'depression': 0.15},
            'Fungal infection': {'itching': 0.50, 'skin_rash': 0.35, 'nodal_skin_eruptions': 0.25},
            'Allergy': {'continuous_sneezing': 0.40, 'shivering': 0.20, 'chills': 0.20}
        }

        hallmark = HALLMARKS.get(condition, {})

        # If hallmark profile exists for this condition, compute supporting and opposing
        if hallmark:
            for sym, weight in hallmark.items():
                if sym in pos_set:
                    contributions[sym] = round(weight, 3)
                else:
                    # Penalty for missing key hallmark symptom
                    contributions[sym] = round(-weight * 0.4, 3)
        else:
            # Generic mapping for other diseases
            for s in positive_symptoms:
                sev = self.kb.get_severity(s)
                contributions[s] = round(sev * 0.05, 3)

        return contributions
