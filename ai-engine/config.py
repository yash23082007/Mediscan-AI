import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class Config:
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    FLASK_PORT = int(os.getenv('FLASK_PORT') or os.getenv('PORT') or 5000)
    MODEL_PATH = os.getenv('MODEL_PATH', os.path.join(BASE_DIR, 'saved_models'))
    DATA_PATH = os.getenv('DATA_PATH', os.path.join(BASE_DIR, 'data'))
    
    # Model configuration
    MODEL_FILE = os.path.join(MODEL_PATH, 'classifier.joblib')
    ENCODER_FILE = os.path.join(MODEL_PATH, 'encoder.joblib')
    
    # Open-source symptom-combination datasets
    TRAIN_DATASET = os.path.join(DATA_PATH, 'training_data.csv')
    TEST_DATASET = os.path.join(DATA_PATH, 'test_data.csv')
    DESCRIPTION_DATASET = os.path.join(DATA_PATH, 'symptom_Description.csv')
    PRECAUTION_DATASET = os.path.join(DATA_PATH, 'symptom_precaution.csv')
    SEVERITY_DATASET = os.path.join(DATA_PATH, 'symptom_severity.csv')
    
    # Clean, patient-friendly medical titles
    CONDITION_DISPLAY_NAMES = {
        'Malaria': 'Malaria (Plasmodium Infection)',
        'Dengue': 'Dengue Viral Fever',
        'Typhoid': 'Typhoid (Enteric Fever)',
        'Pneumonia': 'Bacterial/Viral Pneumonia',
        'Common Cold': 'Common Cold (Upper Respiratory Tract Infection)',
        'Bronchial Asthma': 'Bronchial Asthma',
        'Tuberculosis': 'Pulmonary Tuberculosis',
        'GERD': 'Gastroesophageal Reflux Disease (GERD)',
        'Gastroenteritis': 'Acute Gastroenteritis',
        'Peptic ulcer diseae': 'Peptic Ulcer Disease',
        'Diabetes ': 'Diabetes Mellitus (Metabolic Syndrome)',
        'Diabetes': 'Diabetes Mellitus (Metabolic Syndrome)',
        'Hypertension ': 'Essential Hypertension (High Blood Pressure)',
        'Hypertension': 'Essential Hypertension (High Blood Pressure)',
        'Migraine': 'Migraine Headache Disorder',
        'Cervical spondylosis': 'Cervical Spondylosis (Neck Degeneration)',
        'Paralysis (brain hemorrhage)': 'Cerebral Stroke / Hemorrhage',
        'Jaundice': 'Jaundice / Hyperbilirubinemia',
        'Chicken pox': 'Chickenpox (Varicella Zoster)',
        'hepatitis A': 'Viral Hepatitis A',
        'Hepatitis B': 'Chronic Hepatitis B',
        'Hepatitis C': 'Hepatitis C Infection',
        'Hepatitis D': 'Hepatitis D Superinfection',
        'Hepatitis E': 'Acute Hepatitis E',
        'Alcoholic hepatitis': 'Alcohol-Induced Hepatitis',
        'Chronic cholestasis': 'Chronic Cholestasis',
        'Dimorphic hemmorhoids(piles)': 'Hemorrhoids (Piles)',
        'Heart attack': 'Acute Myocardial Infarction (Heart Attack)',
        'Varicose veins': 'Varicose Vein Insufficiency',
        'Hypothyroidism': 'Primary Hypothyroidism',
        'Hyperthyroidism': 'Hyperthyroidism (Thyrotoxicosis)',
        'Hypoglycemia': 'Hypoglycemia (Low Blood Sugar)',
        'Osteoarthristis': 'Osteoarthritis Degenerative Joint Disease',
        'Arthritis': 'Rheumatoid / Inflammatory Arthritis',
        '(vertigo) Paroymsal  Positional Vertigo': 'Benign Paroxysmal Positional Vertigo (BPPV)',
        'Acne': 'Acne Vulgaris',
        'Urinary tract infection': 'Urinary Tract Infection (UTI)',
        'Psoriasis': 'Psoriasis (Autoimmune Dermatosis)',
        'Impetigo': 'Impetigo (Bacterial Skin Infection)',
        'Fungal infection': 'Superficial Fungal / Tinea Infection',
        'Allergy': 'Allergic Rhinitis / Atopic Reaction',
        'Drug Reaction': 'Adverse Cutaneous Drug Reaction',
        'AIDS': 'HIV / Immunodeficiency Syndrome'
    }
