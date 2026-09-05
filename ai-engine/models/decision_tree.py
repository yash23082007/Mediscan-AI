"""
Adaptive Decision Tree for MCQ Questionnaire
Uses information gain to select the next most discriminating question.
"""

import json
import numpy as np
from config import Config


class AdaptiveDecisionTree:
    """
    Manages the adaptive questionnaire flow.
    Selects the next question based on:
    1. Current response probabilities
    2. Information gain of remaining questions
    3. Category relevance
    """
    
    def __init__(self):
        self.condition_priors = {c: 1.0 / len(Config.CONDITIONS) for c in Config.CONDITIONS}
    
    def get_next_question(self, current_responses, answered_questions):
        """
        Determine the next best question to ask.
        
        Args:
            current_responses: Dict of {question_id: answer}
            answered_questions: List of already-asked question IDs
            
        Returns:
            Dict with 'id', 'confidence', 'remaining' or None if complete
        """
        # Calculate current condition probabilities based on responses
        condition_probs = self._calculate_condition_probabilities(current_responses)
        
        # Get top condition probability
        max_prob = max(condition_probs.values()) if condition_probs else 0
        
        # If we're confident enough (>0.75) or have asked enough questions (>12), stop
        if max_prob > 0.75 or len(answered_questions) >= 12:
            return None
        
        # Find the best next question using information gain
        best_question = self._select_best_question(condition_probs, answered_questions)
        
        if best_question is None:
            return None
        
        remaining = max(0, 8 - len(answered_questions))
        
        return {
            'id': best_question,
            'confidence': max_prob,
            'remaining': remaining
        }
    
    def _calculate_condition_probabilities(self, responses):
        """
        Calculate posterior probabilities for each condition
        based on the responses given so far.
        Uses a simplified Bayesian approach with condition weights from the decision tree.
        """
        probs = dict(self.condition_priors)
        
        # Map responses to condition weight updates
        # This is a simplified version — in production, you'd query the DB
        symptom_condition_map = {
            'fever_flu': {'flu': 2.0, 'common_cold': 1.5, 'covid19': 1.8, 'pneumonia': 1.3, 'malaria': 1.5, 'dengue': 1.5, 'typhoid': 1.5},
            'respiratory': {'asthma': 2.0, 'bronchitis': 1.8, 'copd': 1.5, 'pneumonia': 1.5, 'covid19': 1.3},
            'digestive': {'gastroenteritis': 2.0, 'food_poisoning': 1.8, 'ibs': 1.5, 'gastritis': 1.5, 'gerd': 1.3},
            'pain': {'migraine': 1.5, 'tension_headache': 1.5, 'arthritis': 1.5, 'fibromyalgia': 1.3},
            'skin': {'eczema': 2.0, 'psoriasis': 1.5, 'dermatitis': 1.8, 'allergic_reaction': 1.5},
            'mental': {'depression': 2.0, 'generalized_anxiety': 1.8, 'insomnia': 1.5, 'chronic_fatigue': 1.5},
            'high': {'flu': 1.5, 'malaria': 2.0, 'dengue': 2.0, 'typhoid': 1.8, 'pneumonia': 1.5},
            'moderate': {'flu': 1.3, 'covid19': 1.5, 'bronchitis': 1.3},
            'mild': {'common_cold': 1.5, 'bronchitis': 1.2},
            'dry': {'covid19': 1.5, 'asthma': 1.3},
            'productive': {'pneumonia': 1.5, 'bronchitis': 1.8},
            'bloody': {'tuberculosis': 2.0, 'pneumonia': 1.5},
            'yes': {'covid19': 1.8},  # loss of taste/smell
        }
        
        for q_id, answer in responses.items():
            if isinstance(answer, list):
                for a in answer:
                    weights = symptom_condition_map.get(a, {})
                    for condition, weight in weights.items():
                        if condition in probs:
                            probs[condition] *= weight
            else:
                weights = symptom_condition_map.get(answer, {})
                for condition, weight in weights.items():
                    if condition in probs:
                        probs[condition] *= weight
        
        # Normalize
        total = sum(probs.values())
        if total > 0:
            probs = {k: v / total for k, v in probs.items()}
        
        return probs
    
    def _select_best_question(self, condition_probs, answered_questions):
        """
        Select the question with the highest expected information gain.
        This determines which question will most reduce uncertainty about the diagnosis.
        """
        # Category priorities based on current top conditions
        top_conditions = sorted(condition_probs.items(), key=lambda x: x[1], reverse=True)[:5]
        
        category_priorities = {}
        for condition, prob in top_conditions:
            categories = self._condition_to_categories(condition)
            for cat in categories:
                category_priorities[cat] = category_priorities.get(cat, 0) + prob
        
        # Question pool (simplified — in production, query from DB)
        question_pool = {
            'q0000000-0000-0000-0000-000000000002': {'category': 'fever', 'info_gain': 0.8},
            'q0000000-0000-0000-0000-000000000003': {'category': 'fever', 'info_gain': 0.6},
            'q0000000-0000-0000-0000-000000000004': {'category': 'respiratory', 'info_gain': 0.75},
            'q0000000-0000-0000-0000-000000000005': {'category': 'general', 'info_gain': 0.7},
            'q0000000-0000-0000-0000-000000000006': {'category': 'covid_specific', 'info_gain': 0.65},
            'q0000000-0000-0000-0000-000000000007': {'category': 'general', 'info_gain': 0.5},
            'q0000000-0000-0000-0000-000000000008': {'category': 'respiratory', 'info_gain': 0.8},
            'q0000000-0000-0000-0000-000000000009': {'category': 'epidemiology', 'info_gain': 0.4},
            'q0000000-0000-0000-0000-000000000010': {'category': 'respiratory', 'info_gain': 0.75},
            'q0000000-0000-0000-0000-000000000020': {'category': 'digestive', 'info_gain': 0.8},
            'q0000000-0000-0000-0000-000000000030': {'category': 'pain', 'info_gain': 0.7},
            'q0000000-0000-0000-0000-000000000040': {'category': 'skin', 'info_gain': 0.75},
            'q0000000-0000-0000-0000-000000000050': {'category': 'mental', 'info_gain': 0.7},
        }
        
        # Score each unanswered question
        best_score = -1
        best_question = None
        
        for q_id, q_info in question_pool.items():
            if q_id in answered_questions:
                continue
            
            category = q_info['category']
            info_gain = q_info['info_gain']
            category_relevance = category_priorities.get(category, 0.1)
            
            score = info_gain * category_relevance
            
            if score > best_score:
                best_score = score
                best_question = q_id
        
        return best_question
    
    def _condition_to_categories(self, condition):
        """Map a condition to relevant question categories."""
        mapping = {
            'flu': ['fever', 'general', 'respiratory'],
            'common_cold': ['fever', 'general', 'respiratory'],
            'covid19': ['fever', 'general', 'respiratory', 'covid_specific'],
            'pneumonia': ['fever', 'respiratory', 'general'],
            'bronchitis': ['respiratory', 'general'],
            'asthma': ['respiratory'],
            'copd': ['respiratory'],
            'malaria': ['fever', 'general', 'epidemiology'],
            'dengue': ['fever', 'general', 'pain'],
            'typhoid': ['fever', 'digestive', 'general'],
            'gastroenteritis': ['digestive'],
            'food_poisoning': ['digestive'],
            'ibs': ['digestive', 'mental'],
            'gastritis': ['digestive'],
            'migraine': ['pain', 'general'],
            'tension_headache': ['pain', 'general'],
            'eczema': ['skin'],
            'psoriasis': ['skin'],
            'dermatitis': ['skin'],
            'allergic_reaction': ['skin', 'respiratory'],
            'depression': ['mental', 'general'],
            'generalized_anxiety': ['mental', 'general'],
        }
        return mapping.get(condition, ['general'])
