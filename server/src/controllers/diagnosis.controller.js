const { query } = require('../config/database');
const axios = require('axios');
const { assessTriage } = require('../utils/triage');
const { broadcastCaseEvent } = require('../realtime');

const { AI_ENGINE_URL } = require('../config/ai-engine');
const AI_API_KEY = process.env.AI_API_KEY;

/**
 * Request AI diagnosis
 * POST /api/diagnoses
 */
const createDiagnosis = async (req, res, next) => {
  try {
    const patientId = req.user.id;
    const { questionnaire_id } = req.body;

    if (!questionnaire_id) {
      return res.status(400).json({
        error: 'Questionnaire ID is required for clinical assessment',
        code: 'QUESTIONNAIRE_REQUIRED'
      });
    }

    // Get patient info
    const patientResult = await query(
      'SELECT id, age, gender, weight, height, allergies, chronic_conditions FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patient = patientResult.rows[0];

    // Verify questionnaire completion and patient ownership (S7)
    const qResult = await query(
      'SELECT id, responses, decision_path, completed, completed_at FROM questionnaire_responses WHERE id = $1 AND patient_id = $2',
      [questionnaire_id, patientId]
    );

    if (qResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Questionnaire session not found or does not belong to you',
        code: 'QUESTIONNAIRE_NOT_FOUND'
      });
    }

    const questionnaire = qResult.rows[0];
    if (!questionnaire.completed) {
      return res.status(400).json({
        error: 'Questionnaire must be completed before clinical analysis',
        code: 'QUESTIONNAIRE_INCOMPLETE'
      });
    }

    // Only look up an existing result after proving the caller owns the session.
    const existingDiag = await query(
      'SELECT * FROM diagnoses WHERE questionnaire_id = $1 AND patient_id = $2',
      [questionnaire_id, patientId]
    );
    if (existingDiag.rows.length > 0) {
      return res.status(200).json({
        diagnosis: existingDiag.rows[0],
        message: 'Returning existing diagnosis for this session'
      });
    }

    const responses = questionnaire.responses || {};

    // 1. Deterministic red-flag safety triage before any ML runs (S4, S5)
    let triage = assessTriage(responses);

    // 2. Call AI Engine
    let aiResult;
    if (triage.urgency_level === 'emergency' || triage.urgency_level === 'urgent') {
      aiResult = {
        status: 'red_flag_escalation',
        conditions: [],
        probability_vector: {},
        explanation: 'A questionnaire response triggered an urgent safety rule. Automated condition estimates were withheld; seek in-person care as directed.',
        feature_contributions: {},
        precautions: [],
        missing_evidence_hints: []
      };
    } else try {
      const headers = { 'Content-Type': 'application/json' };
      if (AI_API_KEY) {
        headers['X-API-Key'] = AI_API_KEY;
      }

      const aiResponse = await axios.post(`${AI_ENGINE_URL}/predict`, {
        patient: {
          age: patient.age,
          gender: patient.gender,
          weight: patient.weight,
          height: patient.height,
          allergies: patient.allergies,
          chronic_conditions: patient.chronic_conditions
        },
        symptoms: responses
      }, {
        headers,
        timeout: 15000
      });

      aiResult = aiResponse.data;
    } catch (aiError) {
      console.error('AI Engine error:', aiError.response?.data || aiError.message);
      return res.status(503).json({
        error: 'The clinical analysis service is temporarily unavailable. Your responses have been saved.',
        code: 'AI_ENGINE_UNAVAILABLE'
      });
    }

    // Apply the second triage stage using returned model probabilities.
    if (Array.isArray(aiResult.conditions) && aiResult.conditions.length > 0) {
      const modelPredictions = aiResult.conditions.map(condition => ({
        condition: condition.condition_key || condition.name,
        probability: condition.confidence
      }));
      triage = assessTriage(responses, modelPredictions);
    }

    // 3. Handle model response (support ok, low_confidence, insufficient_evidence)
    const conditions = aiResult.conditions || [];
    const triageLevel = triage.urgency_level || 'routine';

    const contributionsPayload = {
      factors: aiResult.feature_contributions || {},
      clinical_overview: aiResult.clinical_overview || '',
      precautions: aiResult.precautions || [],
      triage,
      status: aiResult.status || 'ok',
      missing_evidence_hints: aiResult.missing_evidence_hints || []
    };

    const diagnosisResult = await query(
      `INSERT INTO diagnoses (
        patient_id,
        questionnaire_id,
        conditions,
        ai_conditions,
        confidence_scores,
        probability_vector,
        explanation,
        feature_contributions,
        triage_level,
        triage_details,
        model_version,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
      RETURNING *`,
      [
        patientId,
        questionnaire_id,
        JSON.stringify(conditions),
        JSON.stringify(conditions), // Immutable copy of original AI conditions
        JSON.stringify(conditions),
        JSON.stringify(aiResult.probability_vector || {}),
        aiResult.explanation || '',
        JSON.stringify(contributionsPayload),
        triageLevel,
        JSON.stringify(triage),
        aiResult.model_version || 'v1.0.0'
      ]
    );

    const savedDiag = diagnosisResult.rows[0];

    // 4. Audit log
    await query(
      `INSERT INTO audit_logs (user_id, user_role, action, resource, resource_id, details)
       VALUES ($1, 'patient', 'CREATE_DIAGNOSIS', 'diagnoses', $2, $3)`,
      [
        patientId,
        savedDiag.id,
        JSON.stringify({
          questionnaire_id,
          triage_level: triageLevel,
          conditions_count: conditions.length,
          model_status: aiResult.status
        })
      ]
    );

    // 5. Broadcast live SSE event to doctor triage queue (§6.1, §6.2)
    broadcastCaseEvent({
      type: 'case_created',
      case_id: savedDiag.id,
      patient_id: patientId,
      status: 'pending',
      urgency: triageLevel,
      top_condition: conditions[0]?.name || 'Unspecified',
      created_at: savedDiag.created_at
    });

    res.status(201).json({
      diagnosis: savedDiag
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get verified model metadata and dataset sources
 * GET /api/diagnoses/datasets/info
 */
const getDatasetsInfo = async (req, res, next) => {
  try {
    const headers = {};
    if (AI_API_KEY) headers['X-API-Key'] = AI_API_KEY;

    const aiResponse = await axios.get(`${AI_ENGINE_URL}/datasets/info`, {
      headers,
      timeout: 5000
    });
    res.json(aiResponse.data);
  } catch (error) {
    // Rule: No fake fallback metrics! Return clean 503 (F8).
    res.status(503).json({
      status: 'unavailable',
      error: 'Model and dataset metadata service is temporarily unavailable.',
      code: 'METADATA_UNAVAILABLE'
    });
  }
};

/**
 * Get diagnosis by ID
 * GET /api/diagnoses/:id
 */
const getDiagnosis = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    let result;
    if (userRole === 'patient') {
      result = await query(
        `SELECT d.*, p.name as patient_name
         FROM diagnoses d
         JOIN patients p ON d.patient_id = p.id
         WHERE d.id = $1 AND d.patient_id = $2`,
        [id, userId]
      );
    } else {
      result = await query(
        `SELECT d.*, p.name as patient_name, p.age as patient_age, p.gender as patient_gender
         FROM diagnoses d
         JOIN patients p ON d.patient_id = p.id
         WHERE d.id = $1`,
        [id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Diagnosis not found' });
    }

    res.json({ diagnosis: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * Get patient's latest diagnosis
 * GET /api/diagnoses/latest
 */
const getLatestDiagnosis = async (req, res, next) => {
  try {
    const patientId = req.user.id;

    const result = await query(
      `SELECT * FROM diagnoses
       WHERE patient_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [patientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No diagnoses found' });
    }

    res.json({ diagnosis: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDiagnosis,
  getDiagnosis,
  getLatestDiagnosis,
  getDatasetsInfo
};
