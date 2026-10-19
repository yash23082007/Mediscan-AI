"""Offline model training entry point. The API never trains during startup."""

from models.classifier import MedicalClassifier


def main():
    classifier = MedicalClassifier(load_model=False)
    classifier.train_initial_model()


if __name__ == '__main__':
    main()
