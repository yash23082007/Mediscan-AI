<<<<<<< HEAD
/**
 * MediscanAI Clinical Triage Engine
 * Two-stage triage:
 * 1. Deterministic red-flag warning signs evaluated BEFORE any machine learning runs.
 * 2. Acuity escalation if high-risk condition has significant model probability.
 *
 * Emergency numbers:
 * India: 108 (Emergency Medical / Ambulance), 112 (National Unified Emergency)
 */

const RED_FLAG_RULES = [
  // 1. Cardiovascular / Acute Coronary Syndrome
  {
    id: 'RF_CHEST_SWEAT_BREATH',
    level: 'emergency',
    title: 'Possible Acute Coronary Syndrome / Heart Attack',
    guidance: 'Call 108 (or 112) immediately. Do not drive yourself. Sit upright, rest, and keep doors unlocked for emergency responders.',
    check: (r) => (r.chest_pain_type === 'dull' || r.chest_pain_type === 'sharp' || r.pain_location === 'chest' || r.respiratory_type === 'chest_tight') &&
                  (hasAny(r.general_symptoms, ['sweating']) || r.breathing_difficulty === 'severe' || r.breathing_difficulty === 'moderate')
  },
  {
    id: 'RF_SEVERE_CHEST_PRESSURE',
    level: 'emergency',
    title: 'Severe Cardiac Pressure Discomfort',
    guidance: 'Call 108 or proceed to the nearest emergency department immediately.',
    check: (r) => r.chest_pain_type === 'dull' && (r.breathing_difficulty === 'severe' || r.energy_level === '1')
  },

  // 2. Respiratory Emergencies
  {
    id: 'RF_SEVERE_RESPIRATORY_DISTRESS',
    level: 'emergency',
    title: 'Critical Respiratory Distress',
    guidance: 'Immediate emergency medical intervention needed. Call 108. Maintain an open airway and sit upright.',
    check: (r) => r.breathing_difficulty === 'severe'
  },
  {
    id: 'RF_COUGH_BLOOD_HEMOPTYSIS',
    level: 'urgent',
    title: 'Hemoptysis (Coughing Blood)',
    guidance: 'Seek urgent clinical evaluation at an emergency clinic or hospital. Do not delay medical review.',
    check: (r) => r.cough_type === 'bloody'
  },
  {
    id: 'RF_SEVERE_ASTHMA_WHEEZE',
    level: 'urgent',
    title: 'Severe Bronchospasm / Asthma Exacerbation',
    guidance: 'Use your prescribed rescue inhaler immediately if available. If breathlessness does not improve within minutes, seek emergency care (108).',
    check: (r) => r.respiratory_type === 'wheezing' && (r.breathing_difficulty === 'moderate' || r.breathing_difficulty === 'severe')
  },

  // 3. Neurological / Stroke & Meningism
  {
    id: 'RF_MENINGISM_FEVER_HEADACHE',
    level: 'emergency',
    title: 'Possible Meningitis / Neurological Infection',
    guidance: 'High fever combined with severe headache or neck pain requires immediate emergency evaluation at the nearest hospital.',
    check: (r) => (r.fever_severity === 'high' || r.fever_severity === 'moderate') &&
                  (hasAny(r.general_symptoms, ['headache']) && (r.pain_location === 'neck_back' || r.energy_level === '1'))
  },
  {
    id: 'RF_STROKE_FAST_SIGNS',
    level: 'emergency',
    title: 'Potential Acute Stroke Warning Signs',
    guidance: 'Call 108 immediately. Time is critical for acute stroke treatment (thrombolysis window). Note the exact time symptoms started.',
    check: (r) => hasAny(r.neurological_signs, ['facial_droop', 'arm_weakness', 'speech_difficulty', 'confusion'])
  },

  // 4. Sepsis / Severe Systemic Infection
  {
    id: 'RF_SEPSIS_QSOFA_WARNING',
    level: 'emergency',
    title: 'Potential Systemic Sepsis Alert',
    guidance: 'High fever accompanied by prostration, altered alertness, or rapid deterioration requires immediate emergency admission.',
    check: (r) => (r.fever_severity === 'high' || r.fever_severity === 'moderate') &&
                  r.energy_level === '1' &&
                  (r.breathing_difficulty === 'moderate' || r.breathing_difficulty === 'severe' || r.respiratory_type === 'rapid')
  },

  // 5. Gastrointestinal / Acute Abdomen & Bleeding
  {
    id: 'RF_ACUTE_ABDOMEN',
    level: 'urgent',
    title: 'Acute Severe Abdomen',
    guidance: 'Severe abdominal pain may indicate appendicitis, perforation, or obstruction. Seek same-day emergency assessment. Do not take laxatives.',
    check: (r) => (r.pain_location === 'abdomen' || hasAny(r.digestive_symptoms, ['pain'])) &&
                  (r.energy_level === '1' || r.fever_severity === 'high')
  },
  {
    id: 'RF_GI_BLEED',
    level: 'emergency',
    title: 'Gastrointestinal Bleeding Alert',
    guidance: 'Black tarry stools, red blood in stool, or vomiting coffee-ground material requires immediate hospital evaluation.',
    check: (r) => hasAny(r.digestive_symptoms, ['bloody_stool', 'coffee_ground_vomit', 'melena'])
  },
  {
    id: 'RF_SEVERE_DEHYDRATION_SHOCK',
    level: 'urgent',
    title: 'Severe Dehydration / Hypovolemic Shock Risk',
    guidance: 'Combined persistent vomiting, diarrhea, and inability to stand warrants urgent intravenous rehydration at a clinical facility.',
    check: (r) => hasAny(r.digestive_symptoms, ['nausea']) &&
                  hasAny(r.digestive_symptoms, ['diarrhea']) &&
                  r.energy_level === '1'
  },

  // 6. Vector-Borne Severe Manifestations (Dengue / Malaria)
  {
    id: 'RF_DENGUE_WARNING_SIGNS',
    level: 'urgent',
    title: 'Dengue Warning Signs (Severe Dengue Risk)',
    guidance: 'High fever with severe abdominal pain, persistent vomiting, or extreme lethargy requires platelet monitoring and hospital admission.',
    check: (r) => (r.fever_severity === 'high') &&
                  hasAny(r.digestive_symptoms, ['pain', 'nausea']) &&
                  hasAny(r.general_symptoms, ['body_ache', 'headache'])
  },
  {
    id: 'RF_MALARIA_SEVERE_PROSTRATION',
    level: 'urgent',
    title: 'Severe Febrile Episode with Rigors & Prostration',
    guidance: 'High fever with intense chills/rigors and severe exhaustion requires urgent blood smear / rapid diagnostic test for malaria.',
    check: (r) => (r.fever_severity === 'high' || r.fever_severity === 'moderate') &&
                  hasAny(r.general_symptoms, ['chills']) &&
                  (r.energy_level === '1' || r.energy_level === '2')
  },

  // 7. Prolonged Undiagnosed Fever (FUO / TB / Typhoid)
  {
    id: 'RF_PROLONGED_FEVER_NIGHT_SWEATS',
    level: 'urgent',
    title: 'Prolonged Fever with Night Sweats (TB / Chronic Infection)',
    guidance: 'Fever lasting over a week with night sweats and cough warrants prompt clinical workup including chest radiography and sputum examination.',
    check: (r) => r.fever_duration === 'more_week' &&
                  (hasAny(r.general_symptoms, ['sweating']) || r.cough_type === 'productive' || r.cough_type === 'dry')
  },

  // 8. Anaphylaxis / Severe Allergy
  {
    id: 'RF_ANAPHYLAXIS_ALERT',
    level: 'emergency',
    title: 'Possible Severe Allergic Reaction (Anaphylaxis)',
    guidance: 'Sudden swelling of face, lips, or throat with breathing difficulty is a life-threatening emergency. Administer epinephrine auto-injector if prescribed and call 108.',
    check: (r) => (hasAny(r.skin_symptoms, ['swelling']) || hasAny(r.allergies, ['anaphylaxis'])) &&
                  (r.breathing_difficulty === 'severe' || r.breathing_difficulty === 'moderate' || r.respiratory_type === 'wheezing')
  },

  // 9. Severe Cutaneous Adverse Reactions (SCAR / SJS)
  {
    id: 'RF_BLISTERING_MUCOSAL_RASH',
    level: 'urgent',
    title: 'Extensive Blistering or Peeling Skin Reaction',
    guidance: 'Widespread blistering or peeling with fever requires urgent in-person dermatological or emergency evaluation.',
    check: (r) => hasAny(r.skin_symptoms, ['blister', 'peeling']) &&
                  (r.fever_severity === 'high' || r.fever_severity === 'moderate')
  },

  // 10. Mental Health Crisis
  {
    id: 'RF_MENTAL_HEALTH_CRISIS',
    level: 'emergency',
    title: 'Mental Health Crisis Support',
    guidance: 'If you are experiencing overwhelming distress or thoughts of self-harm, please connect immediately with Tele-MANAS (14416 / 1800-891-4416) or national crisis line 112. You are not alone.',
    check: (r) => hasAny(r.mental_symptoms, ['self_harm', 'suicidal_thoughts', 'severe_crisis'])
  },

  // 11. Extreme Prostration / Inability to Mobilize
  {
    id: 'RF_BEDRIDDEN_EXTREME_FATIGUE',
    level: 'urgent',
    title: 'Severe Prostration / Marked Functional Impairment',
    guidance: 'Severe inability to get out of bed with acute illness warrants timely in-person medical evaluation.',
    check: (r) => r.energy_level === '1' && r.fever_duration !== 'today'
  },

  // 12. Pediatric / High Fever in Vulnerable Presentation
  {
    id: 'RF_PERSISTENT_HIGH_FEVER',
    level: 'urgent',
    title: 'High Unremitting Fever',
    guidance: 'Fever above 102°F persisting multiple days warrants clinical examination and blood investigations.',
    check: (r) => r.fever_severity === 'high' && (r.fever_duration === '4_7_days' || r.fever_duration === 'more_week')
  },

  // 13. Severe Acute Joint Swelling with Fever (Septic Arthritis)
  {
    id: 'RF_SEPTIC_ARTHRITIS_SUSPICION',
    level: 'urgent',
    title: 'Acute Severe Joint Pain with Fever',
    guidance: 'Sudden joint pain with fever could indicate septic joint infection. Seek urgent orthopedic/medical evaluation.',
    check: (r) => r.pain_location === 'joints' && (r.fever_severity === 'high' || r.fever_severity === 'moderate')
  },

  // 14. Hypertensive Urgency / Severe Headache
  {
    id: 'RF_SEVERE_HEADACHE_CHEST',
    level: 'urgent',
    title: 'Severe Headache with Chest Tightness',
    guidance: 'Severe headache combined with chest tightness may signal a sharp blood pressure elevation. Check blood pressure and consult a clinician promptly.',
    check: (r) => r.pain_location === 'head' && r.respiratory_type === 'chest_tight'
  },

  // 15. Sudden Unexplained Dyspnea at Rest
  {
    id: 'RF_REST_DYSPNEA',
    level: 'urgent',
    title: 'Shortness of Breath at Rest',
    guidance: 'Breathing difficulty occurring at rest requires prompt medical attention.',
    check: (r) => r.breathing_difficulty === 'moderate' && (r.cough_type === 'none' || !r.cough_type)
  }
];

function hasAny(target, values) {
  if (!target) return false;
  if (Array.isArray(target)) {
    return target.some(v => values.includes(v));
  }
  return values.includes(target);
}

/**
 * Assess triage based on deterministic red-flag rules
 * and model output (two-stage clinical triage)
 *
 * @param {Object} responses - Questionnaire responses
 * @param {Array} modelPredictions - Optional top-k model predictions
 * @returns {Object} Triage result with urgency level and guidance
 */
function assessTriage(responses = {}, modelPredictions = []) {
  const redFlags = [];

  for (const rule of RED_FLAG_RULES) {
    try {
      if (rule.check(responses)) {
        redFlags.push({
          id: rule.id,
          level: rule.level,
          title: rule.title,
          guidance: rule.guidance
        });
      }
    } catch (e) {
      // Don't crash triage on single rule evaluation error
    }
  }

  // Check stage 2: Escalate if a high-acuity condition is predicted with >= 15% probability (S4)
  const HIGH_ACUITY_CONDITIONS = [
    'Heart attack',
    'Pneumonia',
    'Tuberculosis',
    'Dengue',
    'Malaria',
    'Typhoid',
    'Hepatitis E',
    'Hepatitis B'
  ];

  if (Array.isArray(modelPredictions)) {
    for (const pred of modelPredictions) {
      const prob = pred.probability || pred.confidence || 0;
      if (HIGH_ACUITY_CONDITIONS.includes(pred.condition) && prob >= 0.15) {
        if (!redFlags.some(rf => rf.id === 'MODEL_HIGH_ACUITY_ESCALATION')) {
          redFlags.push({
            id: 'MODEL_HIGH_ACUITY_ESCALATION',
            level: 'urgent',
            title: `Clinical escalation for suspected high-acuity condition: ${pred.condition}`,
            guidance: `Statistical model estimated significant probability (${Math.round(prob * 100)}%) for ${pred.condition}. Clinical review recommended.`
          });
        }
      }
    }
  }

  // Determine overall urgency level
  const hasEmergency = redFlags.some(rf => rf.level === 'emergency');
  const hasUrgent = redFlags.some(rf => rf.level === 'urgent');

  let level = 'routine';
  let title = 'No immediate red flags detected';
  let guidance = 'Your answers do not show immediate emergency warning signs. Continue to monitor your symptoms and seek routine medical consultation if symptoms persist.';

  if (hasEmergency) {
    level = 'emergency';
    const topEmergency = redFlags.find(rf => rf.level === 'emergency');
    title = topEmergency.title;
    guidance = topEmergency.guidance;
  } else if (hasUrgent) {
    level = 'urgent';
    const topUrgent = redFlags.find(rf => rf.level === 'urgent');
    title = topUrgent.title;
    guidance = topUrgent.guidance;
  }

  return {
    urgency_level: level,
    title,
    guidance,
    red_flags: redFlags,
    emergency_contacts: {
      medical_ambulance: '108',
      unified_emergency: '112',
      tele_manas_mental_health: '14416'
    }
  };
}

module.exports = {
  assessTriage,
  RED_FLAG_RULES
};
=======
const RED_FLAG_RULES = [
  {
    questionId: 'q0000000-0000-0000-0000-000000000004',
    values: ['bloody'],
    level: 'urgent',
    title: 'Coughing blood needs urgent medical attention',
    guidance: 'Contact local emergency services or seek urgent in-person care now.'
  },
  {
    questionId: 'q0000000-0000-0000-0000-000000000008',
    values: ['severe'],
    level: 'urgent',
    title: 'Severe breathing difficulty is an emergency warning sign',
    guidance: 'Call local emergency services now. Do not wait for an online assessment.'
  },
  {
    questionId: 'q0000000-0000-0000-0000-000000000007',
    values: ['1'],
    level: 'urgent',
    title: 'Extremely low energy may require urgent assessment',
    guidance: 'Seek prompt in-person medical evaluation, especially if symptoms are worsening.'
  }
]

function hasValue(answer, values) {
  return Array.isArray(answer) ? answer.some(value => values.includes(value)) : values.includes(answer)
}

function assessTriage(responses = {}) {
  const matches = RED_FLAG_RULES.filter(rule => hasValue(responses[rule.questionId], rule.values))

  if (matches.length === 0) {
    return {
      level: 'routine',
      title: 'No immediate red flags detected in the questionnaire',
      guidance: 'Continue monitoring symptoms and arrange routine clinical care if they persist or worsen.',
      redFlags: []
    }
  }

  return {
    level: 'urgent',
    title: matches[0].title,
    guidance: matches[0].guidance,
    redFlags: matches.map(({ questionId, values, ...rule }) => ({ questionId, values, ...rule }))
  }
}

module.exports = { assessTriage }
>>>>>>> 6c758f0b735380f9091b3328fb200d10ff5cef85
