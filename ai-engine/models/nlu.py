"""
India-First Natural Language & Voice Symptom Extractor (NLU)
Maps patient vernacular symptom descriptions (English, Hindi, and Hinglish)
into candidate symptom codes with confidence chips for explicit patient confirmation (§5.6).
"""

import re

# Comprehensive lexicon mapping colloquial Indian vernacular to clinical feature keys
LEXICON = {
    # Fever & chills
    'high_fever': [
        'bukhar', 'tez bukhar', 'bhari bukhar', 'tap', 'taap', 'fever', 'high fever',
        'garam badan', 'pyrexia', 'body heat'
    ],
    'mild_fever': [
        'halka bukhar', 'mild fever', 'low fever', 'hararat', 'badan gunguna'
    ],
    'chills': [
        'thand', 'thand lagna', 'thand lag rahi hai', 'kapkapi', 'chills', 'cold feeling',
        'kampan', 'shivering', 'kanpna'
    ],
    'sweating': [
        'pasina', 'paseena', 'bahut pasina', 'night sweats', 'excessive sweating', 'sweating'
    ],

    # Respiratory
    'cough': [
        'khansi', 'khaansi', 'cough', 'coughing', 'sukhi khansi', 'dhaska', 'khokhi'
    ],
    'phlegm': [
        'balgam', 'kaph', 'cough with phlegm', 'mucus', 'productive cough', 'khankhar'
    ],
    'blood_in_sputum': [
        'khansi me khoon', 'balgam me khoon', 'blood in cough', 'coughing blood', 'hemoptysis'
    ],
    'breathlessness': [
        'saans phoolna', 'saans lene me dikkat', 'dam ghutna', 'shortness of breath',
        'breathless', 'dyspnea', 'saans takleef', 'breathing problem', 'haaphna'
    ],

    # Head, Chest & Pain
    'headache': [
        'sar dard', 'sir dard', 'matha dard', 'headache', 'head pain', 'migraine',
        'sar fatna', 'sar me dard', 'sir ghumna'
    ],
    'chest_pain': [
        'sine me dard', 'chhati me dard', 'seene me jalan', 'chest pain', 'chest pressure',
        'chest tightness', 'heart pain', 'chhati me jalan'
    ],
    'muscle_pain': [
        'badan dard', 'body ache', 'muscles pain', 'ang ang dard', 'pura badan dard',
        'myalgia', 'pindliyo me dard'
    ],
    'joint_pain': [
        'jodo me dard', 'ghutne me dard', 'joint pain', 'sandhi dard', 'arthritis pain',
        'ghutno me dard', 'kohni me dard'
    ],

    # Digestive / Gastrointestinal
    'nausea': [
        'jee ghabrana', 'ulti jaisa lagna', 'nausea', 'matli', 'vomiting sensation'
    ],
    'vomiting': [
        'ulti', 'vomit', 'kai', 'vomiting', 'vometing'
    ],
    'abdominal_pain': [
        'pet dard', 'pet me dard', 'stomach pain', 'belly ache', 'stomach cramps',
        'pet me marod', 'tummy ache'
    ],
    'diarrhoea': [
        'dast', 'loose motions', 'diarrhea', 'patli tatti', 'pet kharab', 'loose stools'
    ],
    'constipation': [
        'kabz', 'qabz', 'constipation', 'pet saaf na hona'
    ],
    'acidity': [
        'acidity', 'gas', 'jalan', 'khatti dakar', 'heartburn', 'acid reflux', 'sine me jalan'
    ],
    'loss_of_appetite': [
        'bhookh na lagna', 'bhookh mar jana', 'loss of appetite', 'no hunger', 'khana na khana'
    ],

    # Systemic & Mental
    'fatigue': [
        'thakan', 'thawat', 'kamzori', 'sust', 'exhaustion', 'tiredness', 'extreme fatigue',
        'lethargy', 'bechani', 'takat na hona'
    ],
    'anxiety': [
        'ghabrahat', 'bechaini', 'anxiety', 'nervousness', 'dar lagna', 'panic'
    ],
    'depression': [
        'udaasi', 'man na lagna', 'depression', 'low mood', 'nirasha'
    ],
    'loss_of_smell': [
        'khushbu na aana', 'loss of smell', 'swad na aana', 'anosmia'
    ],

    # Dermatological
    'itching': [
        'khujli', 'khujlana', 'itching', 'kharish', 'itchy skin'
    ],
    'skin_rash': [
        'daane', 'lal daane', 'rash', 'rashes', 'skin rash', 'chakatte', 'red patches'
    ],
    'blister': [
        'chhale', 'faphole', 'blister', 'blisters', 'paani wale daane'
    ],
    'yellowish_skin': [
        'peeli aankhen', 'peeli twacha', 'yellow skin', 'jaundice', 'peeliya'
    ]
}


def extract_symptoms_from_text(text):
    """
    Parse free-text in English, Hindi, or Hinglish to detect candidate symptoms.
    Returns list of candidate objects with key, display_name, matched_phrase, and confidence.
    Always intended for interactive confirmation chips by the user (§5.6).
    """
    if not text or not isinstance(text, str):
        return []

    normalized_text = text.lower().strip()
    # Normalize punctuation
    cleaned = re.sub(r'[^\w\s]', ' ', normalized_text)

    detected = {}

    for sym_key, phrases in LEXICON.items():
        for phrase in phrases:
            # Word boundary search or substring match
            pattern = r'\b' + re.escape(phrase) + r'\b'
            if re.search(pattern, cleaned):
                display = sym_key.replace('_', ' ').title()
                if sym_key not in detected:
                    detected[sym_key] = {
                        'symptom_key': sym_key,
                        'display_name': display,
                        'matched_phrase': phrase,
                        'confidence': 0.95
                    }
                break

    return list(detected.values())
