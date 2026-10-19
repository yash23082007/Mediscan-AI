-- ============================================
-- MediscanAI SEED DATA
-- Passwords are hashed at runtime via seed script.
-- DO NOT hard-code password hashes here.
-- ============================================

-- ============================================
-- DECISION TREE NODES — Adaptive MCQ Questions
-- Uses `code` (human-readable) for stable references.
-- UUIDs are auto-generated.
-- ============================================

-- ROOT: Initial Symptom Category
INSERT INTO decision_tree_nodes (code, question_text, category, question_type, options, next_node_logic, condition_weights, weight, display_order, is_root) VALUES
('primary_concern',
 'What is your primary concern today?',
 'general',
 'single_choice',
 '[{"value": "fever_flu", "label": "Fever / Flu-like symptoms"}, {"value": "respiratory", "label": "Breathing / Respiratory issues"}, {"value": "digestive", "label": "Stomach / Digestive problems"}, {"value": "pain", "label": "Pain / Body aches"}, {"value": "skin", "label": "Skin issues"}, {"value": "mental", "label": "Mental health / Fatigue"}, {"value": "other", "label": "Other / Not sure"}]',
 '{"fever_flu": "fever_severity", "respiratory": "respiratory_type", "digestive": "digestive_symptoms", "pain": "pain_location", "skin": "skin_symptoms", "mental": "mental_symptoms", "other": "fever_severity"}',
 '{}',
 1.0, 1, TRUE)
ON CONFLICT (code) DO NOTHING;

-- FEVER / FLU BRANCH
INSERT INTO decision_tree_nodes (code, question_text, category, question_type, options, next_node_logic, condition_weights, weight, display_order, is_root) VALUES
('fever_severity',
 'How would you describe your body temperature?',
 'fever',
 'single_choice',
 '[{"value": "normal", "label": "Normal (below 99°F / 37.2°C)"}, {"value": "mild", "label": "Mild fever (99–100.4°F / 37.2–38°C)"}, {"value": "moderate", "label": "Moderate fever (100.4–102°F / 38–39°C)"}, {"value": "high", "label": "High fever (above 102°F / 39°C)"}]',
 '{"normal": "cough_type", "mild": "fever_duration", "moderate": "fever_duration", "high": "fever_duration"}',
 '{"flu": 0.6, "common_cold": 0.3, "covid19": 0.5, "pneumonia": 0.4, "malaria": 0.5, "dengue": 0.6, "typhoid": 0.7}',
 0.95, 2, FALSE),

('fever_duration',
 'How long have you had the fever?',
 'fever',
 'single_choice',
 '[{"value": "today", "label": "Started today"}, {"value": "2_3_days", "label": "2-3 days"}, {"value": "4_7_days", "label": "4-7 days"}, {"value": "more_week", "label": "More than a week"}]',
 '{"today": "cough_type", "2_3_days": "cough_type", "4_7_days": "general_symptoms", "more_week": "general_symptoms"}',
 '{"flu": 0.5, "typhoid": 0.6, "malaria": 0.7, "dengue": 0.5, "tuberculosis": 0.3}',
 0.9, 3, FALSE),

('cough_type',
 'Do you have a cough?',
 'respiratory',
 'single_choice',
 '[{"value": "none", "label": "No cough"}, {"value": "dry", "label": "Dry cough"}, {"value": "productive", "label": "Cough with mucus/phlegm"}, {"value": "bloody", "label": "Cough with blood"}]',
 '{"none": "taste_smell", "dry": "general_symptoms", "productive": "general_symptoms", "bloody": "general_symptoms"}',
 '{"flu": 0.7, "common_cold": 0.6, "covid19": 0.8, "pneumonia": 0.9, "bronchitis": 0.8, "tuberculosis": 0.7, "asthma": 0.3}',
 0.9, 4, FALSE),

('general_symptoms',
 'Are you experiencing any of these symptoms? (Select all that apply)',
 'general',
 'multiple_choice',
 '[{"value": "headache", "label": "Headache"}, {"value": "body_ache", "label": "Body aches / muscle pain"}, {"value": "fatigue", "label": "Extreme fatigue"}, {"value": "chills", "label": "Chills / shivering"}, {"value": "sweating", "label": "Night sweats"}, {"value": "sore_throat", "label": "Sore throat"}, {"value": "runny_nose", "label": "Runny / stuffy nose"}, {"value": "none", "label": "None of these"}]',
 '{"*": "taste_smell"}',
 '{"flu": 0.7, "common_cold": 0.5, "covid19": 0.6, "dengue": 0.8, "malaria": 0.7, "typhoid": 0.5}',
 0.85, 5, FALSE),

('taste_smell',
 'Have you experienced any loss of taste or smell?',
 'covid_specific',
 'single_choice',
 '[{"value": "yes", "label": "Yes"}, {"value": "no", "label": "No"}, {"value": "partial", "label": "Partially"}]',
 '{"yes": "energy_level", "no": "energy_level", "partial": "energy_level"}',
 '{"covid19": 0.9, "common_cold": 0.2, "sinusitis": 0.4}',
 0.85, 6, FALSE),

('energy_level',
 'How would you rate your energy level?',
 'general',
 'single_choice',
 '[{"value": "1", "label": "1 - Bedridden / Extremely low"}, {"value": "2", "label": "2 - Very low"}, {"value": "3", "label": "3 - Moderate"}, {"value": "4", "label": "4 - Normal / High"}]',
 '{"1": "breathing_difficulty", "2": "breathing_difficulty", "3": "breathing_difficulty", "4": "breathing_difficulty"}',
 '{"chronic_fatigue": 0.8, "anemia": 0.6, "depression": 0.5}',
 0.8, 7, FALSE),

('breathing_difficulty',
 'Do you have difficulty breathing or shortness of breath?',
 'respiratory',
 'single_choice',
 '[{"value": "none", "label": "No difficulty"}, {"value": "mild", "label": "Mild - during activity"}, {"value": "moderate", "label": "Moderate - at rest sometimes"}, {"value": "severe", "label": "Severe - constant difficulty"}]',
 '{}',
 '{"pneumonia": 0.8, "asthma": 0.9, "covid19": 0.7, "bronchitis": 0.6, "heart_attack": 0.5}',
 0.9, 8, FALSE)
ON CONFLICT (code) DO NOTHING;

-- RESPIRATORY BRANCH
INSERT INTO decision_tree_nodes (code, question_text, category, question_type, options, next_node_logic, condition_weights, weight, display_order, is_root) VALUES
('respiratory_type',
 'What respiratory symptom is most concerning?',
 'respiratory',
 'single_choice',
 '[{"value": "wheezing", "label": "Wheezing / whistling sound"}, {"value": "shortness", "label": "Shortness of breath"}, {"value": "rapid", "label": "Rapid breathing"}, {"value": "chest_tight", "label": "Chest tightness"}, {"value": "other", "label": "Other"}]',
 '{"wheezing": "cough_type", "shortness": "breathing_difficulty", "rapid": "breathing_difficulty", "chest_tight": "chest_pain_type", "other": "cough_type"}',
 '{"asthma": 0.8, "copd": 0.7, "pneumonia": 0.6, "bronchitis": 0.5}',
 0.9, 10, FALSE),

('chest_pain_type',
 'Describe your chest pain or discomfort:',
 'cardiovascular',
 'single_choice',
 '[{"value": "sharp", "label": "Sharp, stabbing pain"}, {"value": "dull", "label": "Dull, heavy pressure"}, {"value": "burning", "label": "Burning sensation"}, {"value": "none", "label": "No chest pain"}]',
 '{"sharp": "general_symptoms", "dull": "general_symptoms", "burning": "general_symptoms", "none": "general_symptoms"}',
 '{"heart_attack": 0.7, "gerd": 0.5, "pneumonia": 0.4, "angina": 0.6}',
 0.95, 12, FALSE)
ON CONFLICT (code) DO NOTHING;

-- DIGESTIVE BRANCH
INSERT INTO decision_tree_nodes (code, question_text, category, question_type, options, next_node_logic, condition_weights, weight, display_order, is_root) VALUES
('digestive_symptoms',
 'What digestive symptoms are you experiencing? (Select all that apply)',
 'digestive',
 'multiple_choice',
 '[{"value": "nausea", "label": "Nausea / Vomiting"}, {"value": "diarrhea", "label": "Diarrhea"}, {"value": "constipation", "label": "Constipation"}, {"value": "bloating", "label": "Bloating / Gas"}, {"value": "pain", "label": "Abdominal pain"}, {"value": "appetite_loss", "label": "Loss of appetite"}, {"value": "acid_reflux", "label": "Acid reflux / Heartburn"}]',
 '{"*": "fever_severity"}',
 '{"gastroenteritis": 0.8, "gerd": 0.6, "peptic_ulcer": 0.5, "hepatitis": 0.4, "typhoid": 0.5}',
 0.85, 20, FALSE)
ON CONFLICT (code) DO NOTHING;

-- PAIN BRANCH
INSERT INTO decision_tree_nodes (code, question_text, category, question_type, options, next_node_logic, condition_weights, weight, display_order, is_root) VALUES
('pain_location',
 'Where is your pain primarily located?',
 'pain',
 'single_choice',
 '[{"value": "head", "label": "Head"}, {"value": "joints", "label": "Joints"}, {"value": "neck_back", "label": "Neck / Back"}, {"value": "muscles", "label": "Muscles"}, {"value": "abdomen", "label": "Abdomen"}, {"value": "chest", "label": "Chest"}]',
 '{"head": "general_symptoms", "joints": "general_symptoms", "neck_back": "general_symptoms", "muscles": "general_symptoms", "abdomen": "digestive_symptoms", "chest": "chest_pain_type"}',
 '{"migraine": 0.6, "arthritis": 0.7, "osteoarthritis": 0.5, "cervical_spondylosis": 0.5}',
 0.8, 30, FALSE)
ON CONFLICT (code) DO NOTHING;

-- SKIN BRANCH
INSERT INTO decision_tree_nodes (code, question_text, category, question_type, options, next_node_logic, condition_weights, weight, display_order, is_root) VALUES
('skin_symptoms',
 'What skin symptoms are you experiencing? (Select all that apply)',
 'skin',
 'multiple_choice',
 '[{"value": "itching", "label": "Itching"}, {"value": "rash", "label": "Rash / Red patches"}, {"value": "blister", "label": "Blisters"}, {"value": "discoloration", "label": "Skin discoloration"}, {"value": "peeling", "label": "Peeling skin"}, {"value": "swelling", "label": "Swelling / Puffiness"}]',
 '{"*": "general_symptoms"}',
 '{"fungal_infection": 0.7, "allergy": 0.6, "psoriasis": 0.5, "eczema": 0.5, "chicken_pox": 0.4}',
 0.8, 40, FALSE)
ON CONFLICT (code) DO NOTHING;

-- MENTAL HEALTH BRANCH
INSERT INTO decision_tree_nodes (code, question_text, category, question_type, options, next_node_logic, condition_weights, weight, display_order, is_root) VALUES
('mental_symptoms',
 'What mental health symptoms are you experiencing? (Select all that apply)',
 'mental',
 'multiple_choice',
 '[{"value": "anxiety", "label": "Anxiety / Nervousness"}, {"value": "depression", "label": "Low mood / Sadness"}, {"value": "fatigue", "label": "Extreme tiredness"}, {"value": "insomnia", "label": "Trouble sleeping"}, {"value": "mood_swings", "label": "Mood swings"}, {"value": "concentration", "label": "Difficulty concentrating"}]',
 '{"*": "general_symptoms"}',
 '{"depression": 0.7, "anxiety": 0.6, "chronic_fatigue": 0.5, "hypothyroidism": 0.3}',
 0.8, 50, FALSE)
ON CONFLICT (code) DO NOTHING;
