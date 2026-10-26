const { randomUUID } = require('node:crypto');
const { collection, withTransaction } = require('../config/database');
const { asRecord, asRecords } = require('../utils/mongo');
const { createAuditLog } = require('../middleware/audit');
const { broadcastCaseEvent } = require('../realtime');

const RECOGNIZED_CONDITIONS = new Set([
  'Malaria', 'Dengue', 'Typhoid', 'Pneumonia', 'Common Cold', 'Bronchial Asthma', 'Tuberculosis', 'GERD',
  'Gastroenteritis', 'Peptic ulcer diseae', 'Diabetes ', 'Diabetes', 'Hypertension ', 'Hypertension', 'Migraine',
  'Cervical spondylosis', 'Paralysis (brain hemorrhage)', 'Jaundice', 'Chicken pox', 'hepatitis A', 'Hepatitis B',
  'Hepatitis C', 'Hepatitis D', 'Hepatitis E', 'Alcoholic hepatitis', 'Chronic cholestasis',
  'Dimorphic hemmorhoids(piles)', 'Heart attack', 'Varicose veins', 'Hypothyroidism', 'Hyperthyroidism',
  'Hypoglycemia', 'Osteoarthristis', 'Arthritis', '(vertigo) Paroymsal  Positional Vertigo', 'Acne',
  'Urinary tract infection', 'Psoriasis', 'Impetigo', 'Fungal infection', 'Allergy', 'Drug Reaction', 'AIDS', 'Other'
]);

const submitFeedback = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { diagnosis_id: diagnosisId, action, correction, notes } = req.body;
    if (!['approve', 'override', 'correct'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve, override, or correct' });
    }

    const result = await withTransaction(async (session) => {
      const diagnosisCollection = collection('diagnoses');
      const diagnosisDoc = await diagnosisCollection.findOne({ _id: diagnosisId }, { session });
      if (!diagnosisDoc) {
        const error = new Error('Diagnosis not found');
        error.statusCode = 404;
        throw error;
      }
      if (['approved', 'overridden', 'corrected'].includes(diagnosisDoc.status)) {
        const error = new Error('This case has already been reviewed by a clinician');
        error.statusCode = 409;
        throw error;
      }

      let finalConditions = diagnosisDoc.conditions || [];
      let usedForRetraining = false;
      if (action !== 'approve') {
        if (!Array.isArray(correction?.conditions)) {
          const error = new Error('Correction requires a valid conditions array');
          error.statusCode = 400;
          throw error;
        }
        finalConditions = correction.conditions.map(condition => {
          const conditionName = typeof condition === 'string' ? condition : condition.name || condition.condition || '';
          const cleanName = conditionName.trim();
          return {
            name: cleanName,
            in_vocabulary: RECOGNIZED_CONDITIONS.has(cleanName),
            confidence: typeof condition === 'object' && Number.isFinite(condition.confidence) ? condition.confidence : null,
            reviewer_note: typeof condition === 'object' ? condition.note || null : null
          };
        });
        usedForRetraining = finalConditions.length > 0 && finalConditions.every(item => item.in_vocabulary && item.name !== 'Other');
      } else {
        usedForRetraining = true;
      }

      const newStatus = action === 'approve' ? 'approved' : action === 'override' ? 'overridden' : 'corrected';
      const now = new Date();
      const feedback = {
        _id: randomUUID(),
        doctor_id: doctorId,
        diagnosis_id: diagnosisId,
        action,
        original_conditions: diagnosisDoc.ai_conditions || diagnosisDoc.conditions,
        final_conditions: finalConditions,
        correction: correction || null,
        notes: notes || null,
        used_for_retraining: usedForRetraining,
        version: 1,
        created_at: now
      };
      await collection('feedback').insertOne(feedback, { session });

      const update = await diagnosisCollection.updateOne(
        { _id: diagnosisId, status: { $nin: ['approved', 'overridden', 'corrected'] } },
        { $set: { status: newStatus, conditions: finalConditions, reviewed_by: doctorId, reviewed_at: now } },
        { session }
      );
      if (update.modifiedCount !== 1) {
        const error = new Error('This case has already been reviewed by a clinician');
        error.statusCode = 409;
        throw error;
      }
      return asRecord(feedback);
    });

    await createAuditLog({
      userId: doctorId,
      userRole: req.user.role,
      action: `FEEDBACK_${action.toUpperCase()}`,
      resource: 'diagnosis',
      resourceId: diagnosisId,
      details: { feedbackId: result.id, action },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    broadcastCaseEvent({
      type: 'case_reviewed',
      case_id: diagnosisId,
      patient_id: diagnosisDoc.patient_id,
      status: action === 'approve' ? 'approved' : action === 'override' ? 'overridden' : 'corrected',
      reviewer_id: doctorId,
      reviewed_at: result.created_at
    });

    res.status(201).json({ message: 'Clinical review submitted successfully', feedback: result });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    if (error.code === 11000) return res.status(409).json({ error: 'This case has already been reviewed by a clinician' });
    next(error);
  }
};

const getFeedbackByDiagnosis = async (req, res, next) => {
  try {
    const documents = await collection('feedback').find({ diagnosis_id: req.params.diagnosisId }).sort({ created_at: -1 }).toArray();
    const doctorIds = [...new Set(documents.map(item => item.doctor_id))];
    const doctors = doctorIds.length
      ? await collection('users').find({ _id: { $in: doctorIds }, role: { $in: ['doctor', 'admin'] } }, {
          projection: { name: 1, specialization: 1 }
        }).toArray()
      : [];
    const doctorMap = new Map(doctors.map(item => [item._id, item]));
    const feedback = documents.map(item => {
      const record = asRecord(item);
      const doctor = doctorMap.get(item.doctor_id);
      return { ...record, doctor_name: doctor?.name || 'Clinician record unavailable', specialization: doctor?.specialization || null };
    });
    res.json({ feedback });
  } catch (error) {
    next(error);
  }
};

const getMyFeedback = async (req, res, next) => {
  try {
    const documents = await collection('feedback').find({ doctor_id: req.user.id }).sort({ created_at: -1 }).limit(50).toArray();
    const diagnosisIds = [...new Set(documents.map(item => item.diagnosis_id))];
    const diagnosisDocs = diagnosisIds.length
      ? await collection('diagnoses').find({ _id: { $in: diagnosisIds } }, { projection: { patient_id: 1, conditions: 1 } }).toArray()
      : [];
    const patientIds = [...new Set(diagnosisDocs.map(item => item.patient_id))];
    const patients = patientIds.length
      ? await collection('users').find({ _id: { $in: patientIds }, role: 'patient' }, { projection: { name: 1 } }).toArray()
      : [];
    const diagnosisMap = new Map(diagnosisDocs.map(item => [item._id, item]));
    const patientMap = new Map(patients.map(item => [item._id, item]));
    const feedback = documents.map(item => {
      const record = asRecord(item);
      const diagnosis = diagnosisMap.get(item.diagnosis_id);
      const patient = diagnosis && patientMap.get(diagnosis.patient_id);
      return { ...record, patient_name: patient?.name || 'Patient record unavailable', conditions: diagnosis?.conditions || [] };
    });
    res.json({ feedback });
  } catch (error) {
    next(error);
  }
};

module.exports = { submitFeedback, getFeedbackByDiagnosis, getMyFeedback, RECOGNIZED_CONDITIONS };
