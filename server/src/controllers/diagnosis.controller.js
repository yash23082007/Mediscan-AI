const { randomUUID } = require('node:crypto');
const { collection } = require('../config/database');
const { asRecord } = require('../utils/mongo');
const { decryptFields } = require('../config/encryption');
const axios = require('axios');
const { assessTriage } = require('../utils/triage');
const { broadcastCaseEvent } = require('../realtime');
const { createAuditLog } = require('../middleware/audit');
const { AI_ENGINE_URL } = require('../config/ai-engine');
const AI_API_KEY = process.env.AI_API_KEY;

const createDiagnosis = async (req, res, next) => {
  try {
    const patientId = req.user.id;
    const { questionnaire_id: questionnaireId } = req.body;
    if (!questionnaireId) {
      return res.status(400).json({ error: 'Questionnaire ID is required for clinical assessment', code: 'QUESTIONNAIRE_REQUIRED' });
    }

    const patientDoc = await collection('users').findOne({ _id: patientId, role: 'patient', is_active: true });
    if (!patientDoc) return res.status(404).json({ error: 'Patient not found' });

    const questionnaire = await collection('questionnaire_responses').findOne({
      _id: questionnaireId,
      patient_id: patientId
    });
    if (!questionnaire) {
      return res.status(404).json({ error: 'Questionnaire session not found or does not belong to you', code: 'QUESTIONNAIRE_NOT_FOUND' });
    }
    if (!questionnaire.completed) {
      return res.status(400).json({ error: 'Questionnaire must be completed before clinical analysis', code: 'QUESTIONNAIRE_INCOMPLETE' });
    }

    const existingDiagnosis = await collection('diagnoses').findOne({
      questionnaire_id: questionnaireId,
      patient_id: patientId
    });
    if (existingDiagnosis) {
      return res.status(200).json({ diagnosis: asRecord(existingDiagnosis), message: 'Returning existing diagnosis for this session' });
    }

    const patient = decryptFields(asRecord(patientDoc), ['allergies', 'chronic_conditions']);
    const responses = questionnaire.responses || {};
    let triage = assessTriage(responses);
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
    } else {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (AI_API_KEY) headers['X-API-Key'] = AI_API_KEY;
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
        }, { headers, timeout: 15000 });
        aiResult = aiResponse.data;
      } catch (aiError) {
        console.error('AI Engine request failed:', aiError.response?.status || aiError.code || 'unknown');
        return res.status(503).json({
          error: 'The clinical analysis service is temporarily unavailable. Your responses have been saved.',
          code: 'AI_ENGINE_UNAVAILABLE'
        });
      }
    }

    if (Array.isArray(aiResult.conditions) && aiResult.conditions.length) {
      triage = assessTriage(responses, aiResult.conditions.map(condition => ({
        condition: condition.condition_key || condition.name,
        probability: condition.confidence
      })));
    }

    const conditions = aiResult.conditions || [];
    const triageLevel = triage.urgency_level || 'routine';
    const now = new Date();
    const diagnosis = {
      _id: randomUUID(),
      patient_id: patientId,
      questionnaire_id: questionnaireId,
      conditions,
      ai_conditions: conditions,
      confidence_scores: conditions,
      probability_vector: aiResult.probability_vector || {},
      explanation: aiResult.explanation || '',
      feature_contributions: {
        factors: aiResult.feature_contributions || {},
        clinical_overview: aiResult.clinical_overview || '',
        precautions: aiResult.precautions || [],
        triage,
        status: aiResult.status || 'ok',
        missing_evidence_hints: aiResult.missing_evidence_hints || [],
        explanation_status: aiResult.explanation_status || 'unavailable'
      },
      triage_level: triageLevel,
      triage_details: triage,
      model_version: aiResult.model_version || 'v1.0.0',
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      is_synthetic: false,
      created_at: now
    };

    try {
      await collection('diagnoses').insertOne(diagnosis);
    } catch (error) {
      if (error.code === 11000) {
        const prior = await collection('diagnoses').findOne({ questionnaire_id: questionnaireId, patient_id: patientId });
        if (prior) return res.status(200).json({ diagnosis: asRecord(prior), message: 'Returning existing diagnosis for this session' });
      }
      throw error;
    }

    const savedDiagnosis = asRecord(diagnosis);
    await createAuditLog({
      userId: patientId,
      userRole: 'patient',
      action: 'CREATE_DIAGNOSIS',
      resource: 'diagnoses',
      resourceId: savedDiagnosis.id,
      details: {
        questionnaire_id: questionnaireId,
        triage_level: triageLevel,
        conditions_count: conditions.length,
        model_status: aiResult.status
      }
    });

    broadcastCaseEvent({
      type: 'case_created',
      case_id: savedDiagnosis.id,
      patient_id: patientId,
      status: 'pending',
      urgency: triageLevel,
      top_condition: conditions[0]?.name || 'Unspecified',
      created_at: savedDiagnosis.created_at
    });

    res.status(201).json({ diagnosis: savedDiagnosis });
  } catch (error) {
    next(error);
  }
};

const getDatasetsInfo = async (req, res) => {
  try {
    const headers = {};
    if (AI_API_KEY) headers['X-API-Key'] = AI_API_KEY;
    const response = await axios.get(`${AI_ENGINE_URL}/datasets/info`, { headers, timeout: 5000 });
    res.json(response.data);
  } catch {
    res.status(503).json({
      status: 'unavailable',
      error: 'Model and dataset metadata service is temporarily unavailable.',
      code: 'METADATA_UNAVAILABLE'
    });
  }
};

const getDiagnosis = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.role === 'patient') filter.patient_id = req.user.id;
    const diagnosisDoc = await collection('diagnoses').findOne(filter);
    if (!diagnosisDoc) return res.status(404).json({ error: 'Diagnosis not found' });

    const diagnosis = asRecord(diagnosisDoc);
    const patientDoc = await collection('users').findOne({ _id: diagnosis.patient_id, role: 'patient' }, {
      projection: req.user.role === 'patient'
        ? { name: 1 }
        : { name: 1, age: 1, gender: 1 }
    });
    if (!patientDoc) return res.status(404).json({ error: 'Diagnosis not found' });

    const patient = asRecord(patientDoc);
    const reviewed = ['approved', 'corrected', 'overridden'].includes(diagnosis.status);
    const feedbackDoc = reviewed
      ? await collection('feedback').findOne({ diagnosis_id: diagnosis.id })
      : null;
    const reviewerDoc = feedbackDoc
      ? await collection('users').findOne({ _id: feedbackDoc.doctor_id, role: { $in: ['doctor', 'admin'] } }, { projection: { name: 1 } })
      : null;
    res.json({
      diagnosis: {
        ...diagnosis,
        patient_name: patient.name,
        ...(feedbackDoc ? {
          review: {
            action: feedbackDoc.action,
            notes: feedbackDoc.notes || null,
            final_conditions: feedbackDoc.final_conditions || [],
            reviewer_name: reviewerDoc?.name || null,
            reviewed_at: diagnosis.reviewed_at || feedbackDoc.created_at
          }
        } : {}),
        ...(req.user.role !== 'patient' ? { patient_age: patient.age, patient_gender: patient.gender } : {})
      }
    });
  } catch (error) {
    next(error);
  }
};

const getLatestDiagnosis = async (req, res, next) => {
  try {
    const diagnosis = await collection('diagnoses')
      .find({ patient_id: req.user.id })
      .sort({ created_at: -1, _id: -1 })
      .limit(1)
      .next();
    if (!diagnosis) return res.status(404).json({ error: 'No diagnoses found' });
    res.json({ diagnosis: asRecord(diagnosis) });
  } catch (error) {
    next(error);
  }
};

module.exports = { createDiagnosis, getDiagnosis, getLatestDiagnosis, getDatasetsInfo };
