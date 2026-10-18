const { query, withTransaction } = require('../config/database');
const { createAuditLog } = require('../middleware/audit');
const { broadcastCaseEvent } = require('../realtime');

// 41 recognized model conditions for validation (C4)
const RECOGNIZED_CONDITIONS = new Set([
  'Malaria', 'Dengue', 'Typhoid', 'Pneumonia', 'Common Cold',
  'Bronchial Asthma', 'Tuberculosis', 'GERD', 'Gastroenteritis',
  'Peptic ulcer diseae', 'Diabetes ', 'Diabetes', 'Hypertension ', 'Hypertension', 'Migraine',
  'Cervical spondylosis', 'Paralysis (brain hemorrhage)', 'Jaundice',
  'Chicken pox', 'hepatitis A', 'Hepatitis B', 'Hepatitis C',
  'Hepatitis D', 'Hepatitis E', 'Alcoholic hepatitis', 'Chronic cholestasis',
  'Dimorphic hemmorhoids(piles)', 'Heart attack', 'Varicose veins',
  'Hypothyroidism', 'Hyperthyroidism', 'Hypoglycemia', 'Osteoarthristis',
  'Arthritis', '(vertigo) Paroymsal  Positional Vertigo', 'Acne',
  'Urinary tract infection', 'Psoriasis', 'Impetigo', 'Fungal infection',
  'Allergy', 'Drug Reaction', 'AIDS', 'Other'
]);

/**
 * Submit feedback / review on a diagnosis
 * POST /api/feedback
 */
const submitFeedback = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { diagnosis_id, action, correction, notes } = req.body;

    if (!['approve', 'override', 'correct'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve, override, or correct' });
    }

    // Atomic transaction for review state machine (C1, C3)
    const result = await withTransaction(async (client) => {
      // 1. Fetch diagnosis with row lock to prevent race condition
      const diagRes = await client.query(
        'SELECT * FROM diagnoses WHERE id = $1 FOR UPDATE',
        [diagnosis_id]
      );

      if (diagRes.rows.length === 0) {
        const err = new Error('Diagnosis not found');
        err.statusCode = 404;
        throw err;
      }

      const diagnosis = diagRes.rows[0];

      if (['approved', 'overridden', 'corrected'].includes(diagnosis.status)) {
        const err = new Error('This case has already been reviewed by a clinician');
        err.statusCode = 409;
        throw err;
      }

      // 2. Validate correction format & vocabulary if overriding/correcting (C4)
      let finalConditions = diagnosis.conditions;
      let usedForRetraining = false;

      if (action !== 'approve') {
        if (!correction || !correction.conditions || !Array.isArray(correction.conditions)) {
          const err = new Error('Correction requires a valid conditions array');
          err.statusCode = 400;
          throw err;
        }

        finalConditions = correction.conditions.map(c => {
          const condName = typeof c === 'string' ? c : c.name || c.condition;
          const cleanName = condName.trim();
          const inVocab = RECOGNIZED_CONDITIONS.has(cleanName);
          return {
            name: cleanName,
            in_vocabulary: inVocab,
            confidence: c.confidence || 1.0,
            reviewer_note: c.note || null
          };
        });

        // Only use for retraining if conditions match recognized clinical taxonomy
        usedForRetraining = finalConditions.every(c => c.in_vocabulary && c.name !== 'Other');
      } else {
        usedForRetraining = true;
      }

      // 3. Store feedback record
      const feedbackRes = await client.query(
        `INSERT INTO feedback (
          doctor_id, diagnosis_id, action,
          original_conditions, final_conditions, correction,
          notes, used_for_retraining, version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
        RETURNING *`,
        [
          doctorId,
          diagnosis_id,
          action,
          JSON.stringify(diagnosis.ai_conditions || diagnosis.conditions), // Immutable original AI conditions
          JSON.stringify(finalConditions),
          correction ? JSON.stringify(correction) : null,
          notes || null,
          usedForRetraining
        ]
      );

      // 4. Update diagnosis status & reviewer info
      let newStatus = action === 'approve' ? 'approved' : action === 'override' ? 'overridden' : 'corrected';

      await client.query(
        `UPDATE diagnoses
         SET status = $1,
             conditions = $2,
             reviewed_by = $3,
             reviewed_at = NOW()
         WHERE id = $4`,
        [newStatus, JSON.stringify(finalConditions), doctorId, diagnosis_id]
      );

      return feedbackRes.rows[0];
    });

    // 5. Create audit log
    await createAuditLog({
      userId: doctorId,
      userRole: 'doctor',
      action: `FEEDBACK_${action.toUpperCase()}`,
      resource: 'diagnosis',
      resourceId: diagnosis_id,
      details: { feedbackId: result.id, action },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // 6. Broadcast live SSE update to patient and triage queue (§6.1, §6.2)
    broadcastCaseEvent({
      type: 'case_reviewed',
      case_id: diagnosis_id,
      status: action === 'approve' ? 'approved' : action === 'override' ? 'overridden' : 'corrected',
      reviewer_id: doctorId,
      reviewed_at: new Date().toISOString()
    });

    res.status(201).json({
      message: 'Clinical review submitted successfully',
      feedback: result
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Get feedback for a diagnosis
 * GET /api/feedback/diagnosis/:diagnosisId
 */
const getFeedbackByDiagnosis = async (req, res, next) => {
  try {
    const { diagnosisId } = req.params;

    const result = await query(
      `SELECT f.*, d.name as doctor_name, d.specialization
       FROM feedback f
       JOIN doctors d ON f.doctor_id = d.id
       WHERE f.diagnosis_id = $1
       ORDER BY f.created_at DESC`,
      [diagnosisId]
    );

    res.json({ feedback: result.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all feedback by a doctor
 * GET /api/feedback/my-feedback
 */
const getMyFeedback = async (req, res, next) => {
  try {
    const doctorId = req.user.id;

    const result = await query(
      `SELECT f.*, p.name as patient_name, d_diag.conditions
       FROM feedback f
       JOIN diagnoses d_diag ON f.diagnosis_id = d_diag.id
       JOIN patients p ON d_diag.patient_id = p.id
       WHERE f.doctor_id = $1
       ORDER BY f.created_at DESC
       LIMIT 50`,
      [doctorId]
    );

    res.json({ feedback: result.rows });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitFeedback,
  getFeedbackByDiagnosis,
  getMyFeedback,
  RECOGNIZED_CONDITIONS
};
