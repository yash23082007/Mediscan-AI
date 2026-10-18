"""
Expected Information Gain (EIG) Adaptive Question Selector
Calculates true mutual information / information gain over the calibrated model probabilities
to select the single most informative next clinical question.
"""

import numpy as np
import pandas as pd
from config import Config


def entropy(p):
    """Shannon entropy in bits for probability distribution p."""
    p = np.array(p, dtype=float)
    p = p[p > 0]
    if len(p) <= 1:
        return 0.0
    return float(-(p * np.log2(p)).sum())


class EIGSelector:
    """
    Computes expected reduction in entropy (information gain) for candidate symptoms
    conditioned on current symptom vector and disease-symptom likelihood priors.
    """

    def __init__(self, classifier):
        self.classifier = classifier
        self.feature_names = classifier.feature_names
        self.p_sym_given_d = None
        self._init_priors()

    def _init_priors(self):
        """Estimate P(symptom=1 | disease) from dataset with Laplace smoothing."""
        try:
            df = pd.read_csv(Config.TRAIN_DATASET)
            cols_to_drop = [c for c in df.columns if 'Unnamed' in c]
            if cols_to_drop:
                df = df.drop(columns=cols_to_drop)

            X = df.drop(columns=['prognosis']).values
            y = df['prognosis'].astype(str).str.strip().values

            classes = self.classifier.label_encoder.classes_
            priors = []
            for c in classes:
                mask = (y == c)
                count = mask.sum()
                if count > 0:
                    prob = (X[mask].sum(axis=0) + 1.0) / (count + 2.0)
                else:
                    prob = np.full(X.shape[1], 0.5)
                priors.append(prob)

            self.p_sym_given_d = np.vstack(priors)
        except Exception as e:
            print(f"[WARN] EIG prior estimation failed: {e}", flush=True)

    def select_next_question(self, current_vector, asked_feature_names):
        """
        Evaluate expected information gain across all unasked features.

        Returns:
            dict with:
                - next_feature: name of best feature
                - information_gain: expected reduction in entropy (bits)
                - current_entropy: current uncertainty in bits
                - should_stop: boolean based on stopping rule
                - rationale: explainable rationale
        """
        if self.classifier.model is None or self.p_sym_given_d is None:
            return None

        x = np.array(current_vector, dtype=float)
        asked_set = set(asked_feature_names)

        # Current posterior
        p0 = self.classifier.model.predict_proba([x])[0]
        H0 = entropy(p0)

        # Check stopping rule:
        # Top prob >= 0.60 and gap to #2 >= 0.25, or H0 is very small, or asked >= 15
        sorted_p = np.sort(p0)[::-1]
        top_prob = sorted_p[0]
        second_prob = sorted_p[1] if len(sorted_p) > 1 else 0.0

        if (top_prob >= 0.60 and (top_prob - second_prob) >= 0.25) or len(asked_set) >= 15:
            return {
                'should_stop': True,
                'current_entropy': round(H0, 3),
                'top_probability': round(top_prob, 3),
                'reason': 'Confidence threshold achieved or maximum inquiry limit reached'
            }

        scores = []
        for i, feat in enumerate(self.feature_names):
            if feat in asked_set:
                continue

            # P(symptom=1 | current evidence)
            p_yes = float(p0 @ self.p_sym_given_d[:, i])
            p_yes = np.clip(p_yes, 0.01, 0.99)

            x1 = x.copy()
            x0 = x.copy()
            x1[i] = 1.0
            x0[i] = 0.0

            H1 = entropy(self.classifier.model.predict_proba([x1])[0])
            Hn = entropy(self.classifier.model.predict_proba([x0])[0])

            expected_entropy = (p_yes * H1) + ((1.0 - p_yes) * Hn)
            gain = H0 - expected_entropy
            scores.append((gain, feat, i))

        if not scores:
            return {'should_stop': True, 'current_entropy': round(H0, 3)}

        scores.sort(key=lambda s: s[0], reverse=True)
        best_gain, best_feat, best_idx = scores[0]

        # If best gain is negligible (< 0.01 bits), stop
        if best_gain < 0.01 and len(asked_set) >= 6:
            return {
                'should_stop': True,
                'current_entropy': round(H0, 3),
                'reason': 'Information gain diminishing'
            }

        # Identify top two contending classes this feature helps separate
        top_class_idx = np.argsort(p0)[::-1][:2]
        class_names = [self.classifier.label_encoder.classes_[idx] for idx in top_class_idx]

        rationale = f"Evaluating {best_feat.replace('_', ' ')} best differentiates between {class_names[0]} and {class_names[1]}."

        return {
            'should_stop': False,
            'next_feature': best_feat,
            'information_gain': round(float(best_gain), 4),
            'current_entropy': round(H0, 3),
            'rationale': rationale,
            'contending_conditions': class_names
        }
