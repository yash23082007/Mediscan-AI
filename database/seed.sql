-- ============================================
-- SEED DATA
-- AI-Powered Medical Diagnosis System
-- ============================================

-- ============================================
-- SAMPLE DOCTOR ACCOUNTS
-- Password: "Doctor@123" (bcrypt hash)
-- ============================================
INSERT INTO doctors (id, name, email, password_hash, specialization, license_number, role) VALUES
    ('d1000000-0000-0000-0000-000000000001', 'Dr. Sarah Mitchell', 'sarah.mitchell@hospital.com', '$2b$12$LJ3m4ys3Lz0JW8s5Kz8z8O1vE5qR2fGx6zV8rJ4kN9tL7mB3wA6Oi', 'General Medicine', 'MED-2024-001', 'doctor'),
    ('d1000000-0000-0000-0000-000000000002', 'Dr. James Rodriguez', 'james.rodriguez@hospital.com', '$2b$12$LJ3m4ys3Lz0JW8s5Kz8z8O1vE5qR2fGx6zV8rJ4kN9tL7mB3wA6Oi', 'Pulmonology', 'MED-2024-002', 'doctor'),
    ('d1000000-0000-0000-0000-000000000003', 'Dr. Emily Chen', 'emily.chen@hospital.com', '$2b$12$LJ3m4ys3Lz0JW8s5Kz8z8O1vE5qR2fGx6zV8rJ4kN9tL7mB3wA6Oi', 'Cardiology', 'MED-2024-003', 'doctor'),
    ('d1000000-0000-0000-0000-000000000004', 'Admin User', 'admin@hospital.com', '$2b$12$LJ3m4ys3Lz0JW8s5Kz8z8O1vE5qR2fGx6zV8rJ4kN9tL7mB3wA6Oi', 'Administration', 'ADM-2024-001', 'admin');

-- ============================================
-- DECISION TREE NODES — Adaptive MCQ Questions
-- ============================================

-- ROOT: Initial Symptom Category
INSERT INTO decision_tree_nodes (id, question_text, category, question_type, options, next_node_logic, condition_weights, weight, display_order, is_root) VALUES
('q0000000-0000-0000-0000-000000000001',
 'What is your primary concern today?',
 'general',
 'single_choice',
 '[{"value": "fever_flu", "label": "Fever / Flu-like symptoms"}, {"value": "respiratory", "label": "Breathing / Respiratory issues"}, {"value": "digestive", "label": "Stomach / Digestive problems"}, {"value": "pain", "label": "Pain / Body aches"}, {"value": "skin", "label": "Skin issues"}, {"value": "mental", "label": "Mental health / Fatigue"}, {"value": "other", "label": "Other / Not sure"}]',
 '{"fever_flu": "q0000000-0000-0000-0000-000000000002", "respiratory": "q0000000-0000-0000-0000-000000000010", "digestive": "q0000000-0000-0000-0000-000000000020", "pain": "q0000000-0000-0000-0000-000000000030", "skin": "q0000000-0000-0000-0000-000000000040", "mental": "q0000000-0000-0000-0000-000000000050", "other": "q0000000-0000-0000-0000-000000000002"}',
 '{}',
 1.0, 1, TRUE);

-- FEVER / FLU BRANCH
INSERT INTO decision_tree_nodes (id, question_text, category, question_type, options, next_node_logic, condition_weights, weight, display_order, is_root) VALUES
('q0000000-0000-0000-0000-000000000002',
 'How would you describe your body temperature?',
 'fever',
 'single_choice',
 '[{"value": "normal", "label": "Normal (below 99°F / 37.2°C)"}, {"value": "mild", "label": "Mild fever (99–100.4°F / 37.2–38°C)"}, {"value": "moderate", "label": "Moderate fever (100.4–102°F / 38–39°C)"}, {"value": "high", "label": "High fever (above 102°F / 39°C)"}]',
 '{"normal": "q0000000-0000-0000-0000-000000000004", "mild": "q0000000-0000-0000-0000-000000000003", "moderate": "q0000000-0000-0000-0000-000000000003", "high": "q0000000-0000-0000-0000-000000000003"}',
 '{"flu": 0.6, "common_cold": 0.3, "covid19": 0.5, "pneumonia": 0.4, "malaria": 0.5, "dengue": 0.6, "typhoid": 0.7}',
 0.95, 2, FALSE),

('q0000000-0000-0000-0000-000000000003',
 'How long have you had the fever?',
 'fever',
 'single_choice',
 '[{"value": "today", "label": "Started today"}, {"value": "2_3_days", "label": "2-3 days"}, {"value": "4_7_days", "label": "4-7 days"}, {"value": "more_week", "label": "More than a week"}]',
 '{"today": "q0000000-0000-0000-0000-000000000004", "2_3_days": "q0000000-0000-0000-0000-000000000004", "4_7_days": "q0000000-0000-0000-0000-000000000005", "more_week": "q0000000-0000-0000-0000-000000000005"}',
 '{"flu": 0.5, "typhoid": 0.6, "malaria": 0.7, "dengue": 0.5, "tuberculosis": 0.3}',
 0.9, 3, FALSE),

('q0000000-0000-0000-0000-000000000004',
 'Do you have a cough?',
 'respiratory',
 'single_choice',
 '[{"value": "none", "label": "No cough"}, {"value": "dry", "label": "Dry cough"}, {"value": "productive", "label": "Cough with mucus/phlegm"}, {"value": "bloody", "label": "Cough with blood"}]',
 '{"none": "q0000000-0000-0000-0000-000000000006", "dry": "q0000000-0000-0000-0000-000000000005", "productive": "q0000000-0000-0000-0000-000000000005", "bloody": "q0000000-0000-0000-0000-000000000005"}',
 '{"flu": 0.7, "common_cold": 0.6, "covid19": 0.8, "pneumonia": 0.9, "bronchitis": 0.8, "tuberculosis": 0.7, "asthma": 0.3}',
 0.9, 4, FALSE),

('q0000000-0000-0000-0000-000000000005',
 'Are you experiencing any of these symptoms? (Select all that apply)',
 'general',
 'multiple_choice',
 '[{"value": "headache", "label": "Headache"}, {"value": "body_ache", "label": "Body aches / muscle pain"}, {"value": "fatigue", "label": "Extreme fatigue"}, {"value": "chills", "label": "Chills / shivering"}, {"value": "sweating", "label": "Night sweats"}, {"value": "sore_throat", "label": "Sore throat"}, {"value": "runny_nose", "label": "Runny / stuffy nose"}, {"value": "none", "label": "None of these"}]',
 '{"*": "q0000000-0000-0000-0000-000000000006"}',
 '{"flu": 0.7, "common_cold": 0.5, "covid19": 0.6, "dengue": 0.8, "malaria": 0.7, "typhoid": 0.5}',
 0.85, 5, FALSE),

('q0000000-0000-0000-0000-000000000006',
 'Have you experienced any loss of taste or smell?',
 'covid_specific',
 'single_choice',
 '[{"value": "yes", "label": "Yes"}, {"value": "no", "label": "No"}, {"value": "partial", "label": "Partially"}]',
 '{"yes": "q0000000-0000-0000-0000-000000000007", "no": "q0000000-0000-0000-0000-000000000007", "partial": "q0000000-0000-0000-0000-000000000007"}',
 '{"covid19": 0.9, "common_cold": 0.2, "sinusitis": 0.4}',
 0.85, 6, FALSE),

('q0000000-0000-0000-0000-000000000007',
 'How would you rate your energy level?',
 'general',
 'scale',
 '[{"value": "1", "label": "1 - Bedridden"}, {"value": "2", "label": "2 - Very low"}, {"value": "3", "label": "3 - Low"}, {"value": "4", "label": "4 - Moderate"}, {"value": "5", "label": "5 - Normal"}]',
 '{"1": "q0000000-0000-0000-0000-000000000008", "2": "q0000000-0000-0000-0000-000000000008", "3": "q0000000-0000-0000-0000-000000000008", "4": "q0000000-0000-0000-0000-000000000008", "5": "q0000000-0000-0000-0000-000000000008"}',
 '{"chronic_fatigue": 0.7, "anemia": 0.5, "depression": 0.4, "hypothyroidism": 0.3}',
 0.7, 7, FALSE),

('q0000000-0000-0000-0000-000000000008',
 'Do you have difficulty breathing or shortness of breath?',
 'respiratory',
 'single_choice',
 '[{"value": "none", "label": "No difficulty"}, {"value": "mild", "label": "Mild - during activity"}, {"value": "moderate", "label": "Moderate - at rest sometimes"}, {"value": "severe", "label": "Severe - constant difficulty"}]',
 '{"none": "q0000000-0000-0000-0000-000000000009", "mild": "q0000000-0000-0000-0000-000000000009", "moderate": "q0000000-0000-0000-0000-000000000009", "severe": "q0000000-0000-0000-0000-000000000009"}',
 '{"pneumonia": 0.8, "asthma": 0.7, "covid19": 0.7, "copd": 0.6, "heart_failure": 0.4, "anxiety": 0.3}',
 0.9, 8, FALSE),

('q0000000-0000-0000-0000-000000000009',
 'Have you been in contact with anyone who was sick recently?',
 'epidemiology',
 'single_choice',
 '[{"value": "yes", "label": "Yes, confirmed sick contact"}, {"value": "maybe", "label": "Possibly"}, {"value": "no", "label": "No"}]',
 '{}',
 '{"flu": 0.6, "covid19": 0.7, "common_cold": 0.5, "strep_throat": 0.4}',
 0.6, 9, FALSE);

-- RESPIRATORY BRANCH
INSERT INTO decision_tree_nodes (id, question_text, category, question_type, options, next_node_logic, condition_weights, weight, display_order, is_root) VALUES
('q0000000-0000-0000-0000-000000000010',
 'What type of breathing difficulty are you experiencing?',
 'respiratory',
 'single_choice',
 '[{"value": "wheezing", "label": "Wheezing / whistling sound"}, {"value": "tightness", "label": "Chest tightness"}, {"value": "shortness", "label": "Shortness of breath"}, {"value": "rapid", "label": "Rapid breathing"}, {"value": "none", "label": "No breathing difficulty, other respiratory issue"}]',
 '{"wheezing": "q0000000-0000-0000-0000-000000000011", "tightness": "q0000000-0000-0000-0000-000000000011", "shortness": "q0000000-0000-0000-0000-000000000011", "rapid": "q0000000-0000-0000-0000-000000000011", "none": "q0000000-0000-0000-0000-000000000004"}',
 '{"asthma": 0.8, "copd": 0.6, "pneumonia": 0.7, "bronchitis": 0.5, "anxiety": 0.3}',
 0.95, 10, FALSE),

('q0000000-0000-0000-0000-000000000011',
 'When does the breathing difficulty occur?',
 'respiratory',
 'single_choice',
 '[{"value": "exercise", "label": "During exercise / physical activity"}, {"value": "rest", "label": "Even at rest"}, {"value": "night", "label": "Mainly at night"}, {"value": "triggers", "label": "When exposed to dust, smoke, or allergens"}, {"value": "constant", "label": "All the time"}]',
 '{"exercise": "q0000000-0000-0000-0000-000000000012", "rest": "q0000000-0000-0000-0000-000000000012", "night": "q0000000-0000-0000-0000-000000000012", "triggers": "q0000000-0000-0000-0000-000000000012", "constant": "q0000000-0000-0000-0000-000000000012"}',
 '{"asthma": 0.7, "copd": 0.5, "heart_failure": 0.6, "anxiety": 0.4}',
 0.8, 11, FALSE),

('q0000000-0000-0000-0000-000000000012',
 'Do you have chest pain?',
 'cardiovascular',
 'single_choice',
 '[{"value": "none", "label": "No chest pain"}, {"value": "sharp", "label": "Sharp / stabbing pain"}, {"value": "dull", "label": "Dull / pressure-like pain"}, {"value": "burning", "label": "Burning sensation"}]',
 '{"none": "q0000000-0000-0000-0000-000000000005", "sharp": "q0000000-0000-0000-0000-000000000005", "dull": "q0000000-0000-0000-0000-000000000005", "burning": "q0000000-0000-0000-0000-000000000005"}',
 '{"angina": 0.7, "heart_attack": 0.5, "pneumonia": 0.4, "costochondritis": 0.6, "gerd": 0.5, "anxiety": 0.3}',
 0.9, 12, FALSE);

-- DIGESTIVE BRANCH
INSERT INTO decision_tree_nodes (id, question_text, category, question_type, options, next_node_logic, condition_weights, weight, display_order, is_root) VALUES
('q0000000-0000-0000-0000-000000000020',
 'What digestive symptoms are you experiencing?',
 'digestive',
 'multiple_choice',
 '[{"value": "nausea", "label": "Nausea / vomiting"}, {"value": "diarrhea", "label": "Diarrhea"}, {"value": "constipation", "label": "Constipation"}, {"value": "bloating", "label": "Bloating / gas"}, {"value": "pain", "label": "Abdominal pain"}, {"value": "appetite_loss", "label": "Loss of appetite"}, {"value": "acid_reflux", "label": "Acid reflux / heartburn"}]',
 '{"*": "q0000000-0000-0000-0000-000000000021"}',
 '{"gastroenteritis": 0.7, "food_poisoning": 0.6, "ibs": 0.5, "gastritis": 0.5, "gerd": 0.6, "appendicitis": 0.3, "ulcer": 0.4}',
 0.9, 20, FALSE),

('q0000000-0000-0000-0000-000000000021',
 'Where is the abdominal pain located?',
 'digestive',
 'single_choice',
 '[{"value": "upper_center", "label": "Upper center (stomach area)"}, {"value": "lower_right", "label": "Lower right"}, {"value": "lower_left", "label": "Lower left"}, {"value": "around_navel", "label": "Around the navel"}, {"value": "entire", "label": "Entire abdomen"}, {"value": "no_pain", "label": "No abdominal pain"}]',
 '{"upper_center": "q0000000-0000-0000-0000-000000000022", "lower_right": "q0000000-0000-0000-0000-000000000022", "lower_left": "q0000000-0000-0000-0000-000000000022", "around_navel": "q0000000-0000-0000-0000-000000000022", "entire": "q0000000-0000-0000-0000-000000000022", "no_pain": "q0000000-0000-0000-0000-000000000022"}',
 '{"appendicitis": 0.8, "gastritis": 0.6, "ulcer": 0.5, "ibs": 0.4, "kidney_stones": 0.3}',
 0.85, 21, FALSE),

('q0000000-0000-0000-0000-000000000022',
 'How long have you had these digestive issues?',
 'digestive',
 'single_choice',
 '[{"value": "hours", "label": "A few hours"}, {"value": "1_2_days", "label": "1-2 days"}, {"value": "3_7_days", "label": "3-7 days"}, {"value": "weeks", "label": "More than a week"}, {"value": "chronic", "label": "It is a recurring / chronic issue"}]',
 '{"hours": "q0000000-0000-0000-0000-000000000005", "1_2_days": "q0000000-0000-0000-0000-000000000005", "3_7_days": "q0000000-0000-0000-0000-000000000005", "weeks": "q0000000-0000-0000-0000-000000000005", "chronic": "q0000000-0000-0000-0000-000000000005"}',
 '{"food_poisoning": 0.5, "gastroenteritis": 0.6, "ibs": 0.7, "crohns_disease": 0.4, "celiac_disease": 0.3}',
 0.7, 22, FALSE);

-- PAIN BRANCH
INSERT INTO decision_tree_nodes (id, question_text, category, question_type, options, next_node_logic, condition_weights, weight, display_order, is_root) VALUES
('q0000000-0000-0000-0000-000000000030',
 'Where is your primary pain located?',
 'pain',
 'single_choice',
 '[{"value": "head", "label": "Head"}, {"value": "neck_back", "label": "Neck / Back"}, {"value": "joints", "label": "Joints (knees, elbows, etc.)"}, {"value": "chest", "label": "Chest"}, {"value": "abdomen", "label": "Abdomen"}, {"value": "muscles", "label": "Muscles (general)"}, {"value": "limbs", "label": "Arms / Legs"}]',
 '{"head": "q0000000-0000-0000-0000-000000000031", "neck_back": "q0000000-0000-0000-0000-000000000031", "joints": "q0000000-0000-0000-0000-000000000031", "chest": "q0000000-0000-0000-0000-000000000012", "abdomen": "q0000000-0000-0000-0000-000000000021", "muscles": "q0000000-0000-0000-0000-000000000031", "limbs": "q0000000-0000-0000-0000-000000000031"}',
 '{"migraine": 0.6, "tension_headache": 0.5, "arthritis": 0.5, "fibromyalgia": 0.4, "sprain": 0.3}',
 0.9, 30, FALSE),

('q0000000-0000-0000-0000-000000000031',
 'How would you rate your pain intensity?',
 'pain',
 'scale',
 '[{"value": "1", "label": "1 - Barely noticeable"}, {"value": "2", "label": "2 - Mild"}, {"value": "3", "label": "3 - Moderate"}, {"value": "4", "label": "4 - Severe"}, {"value": "5", "label": "5 - Unbearable"}]',
 '{"1": "q0000000-0000-0000-0000-000000000005", "2": "q0000000-0000-0000-0000-000000000005", "3": "q0000000-0000-0000-0000-000000000005", "4": "q0000000-0000-0000-0000-000000000005", "5": "q0000000-0000-0000-0000-000000000005"}',
 '{}',
 0.8, 31, FALSE);

-- SKIN BRANCH
INSERT INTO decision_tree_nodes (id, question_text, category, question_type, options, next_node_logic, condition_weights, weight, display_order, is_root) VALUES
('q0000000-0000-0000-0000-000000000040',
 'What skin symptoms are you experiencing?',
 'skin',
 'multiple_choice',
 '[{"value": "rash", "label": "Rash"}, {"value": "itching", "label": "Itching"}, {"value": "redness", "label": "Redness / inflammation"}, {"value": "bumps", "label": "Bumps / blisters"}, {"value": "dryness", "label": "Dryness / flaking"}, {"value": "discoloration", "label": "Discoloration"}, {"value": "swelling", "label": "Swelling"}]',
 '{"*": "q0000000-0000-0000-0000-000000000041"}',
 '{"eczema": 0.6, "psoriasis": 0.5, "dermatitis": 0.7, "allergic_reaction": 0.6, "fungal_infection": 0.4, "hives": 0.5}',
 0.85, 40, FALSE),

('q0000000-0000-0000-0000-000000000041',
 'How long have you had these skin symptoms?',
 'skin',
 'single_choice',
 '[{"value": "hours", "label": "A few hours"}, {"value": "days", "label": "A few days"}, {"value": "weeks", "label": "Weeks"}, {"value": "months", "label": "Months or longer"}]',
 '{"hours": "q0000000-0000-0000-0000-000000000005", "days": "q0000000-0000-0000-0000-000000000005", "weeks": "q0000000-0000-0000-0000-000000000005", "months": "q0000000-0000-0000-0000-000000000005"}',
 '{"allergic_reaction": 0.7, "eczema": 0.5, "psoriasis": 0.6, "chronic_dermatitis": 0.4}',
 0.7, 41, FALSE);

-- MENTAL HEALTH BRANCH
INSERT INTO decision_tree_nodes (id, question_text, category, question_type, options, next_node_logic, condition_weights, weight, display_order, is_root) VALUES
('q0000000-0000-0000-0000-000000000050',
 'What mental health symptoms are you experiencing?',
 'mental',
 'multiple_choice',
 '[{"value": "anxiety", "label": "Anxiety / excessive worry"}, {"value": "depression", "label": "Persistent sadness / hopelessness"}, {"value": "insomnia", "label": "Difficulty sleeping"}, {"value": "fatigue", "label": "Extreme fatigue / low energy"}, {"value": "concentration", "label": "Difficulty concentrating"}, {"value": "irritability", "label": "Irritability / mood swings"}, {"value": "appetite_change", "label": "Changes in appetite"}]',
 '{"*": "q0000000-0000-0000-0000-000000000051"}',
 '{"generalized_anxiety": 0.7, "depression": 0.7, "insomnia": 0.5, "chronic_fatigue": 0.6, "hypothyroidism": 0.3, "anemia": 0.3}',
 0.85, 50, FALSE),

('q0000000-0000-0000-0000-000000000051',
 'How long have you been experiencing these symptoms?',
 'mental',
 'single_choice',
 '[{"value": "days", "label": "A few days"}, {"value": "2_weeks", "label": "About 2 weeks"}, {"value": "month", "label": "About a month"}, {"value": "months", "label": "Several months"}, {"value": "year_plus", "label": "Over a year"}]',
 '{"days": "q0000000-0000-0000-0000-000000000007", "2_weeks": "q0000000-0000-0000-0000-000000000007", "month": "q0000000-0000-0000-0000-000000000007", "months": "q0000000-0000-0000-0000-000000000007", "year_plus": "q0000000-0000-0000-0000-000000000007"}',
 '{"depression": 0.7, "generalized_anxiety": 0.6, "chronic_fatigue": 0.5, "bipolar_disorder": 0.3}',
 0.8, 51, FALSE);
