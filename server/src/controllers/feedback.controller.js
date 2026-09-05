const { query } = require('../config/database');
const { createAuditLog } = require('../middleware/audit');

/**
 * Submit feedback on a diagnosis
 * POST /api/feedback
 */
const submitFeedback = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { diagnosis_id, action, correction, notes } = req.body;

    // Verify diagnosis exists
    const diagnosisResult = await query(
      'SELECT * FROM diagnoses WHERE id = $1',
      [diagnosis_id]
    );

    if (diagnosisResult.rows.length === 0) {
      return res.status(404).json({ error: 'Diagnosis not found' });
    }

    const diagnosis = diagnosisResult.rows[0];

    // Store feedback
    const feedbackResult = await query(
      `INSERT INTO feedback (doctor_id, diagnosis_id, action, original_conditions, correction, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        doctorId,
        diagnosis_id,
        action,
        JSON.stringify(diagnosis.conditions),
        correction ? JSON.stringify(correction) : null,
        notes || null
      ]
    );

    // Update diagnosis status
    let newStatus;
    switch (action) {
      case 'approve':
        newStatus = 'approved';
        break;
      case 'override':
        newStatus = 'overridden';
        break;
      case 'correct':
        newStatus = 'corrected';
        break;
      default:
        newStatus = 'reviewed';
    }

    await query(
      `UPDATE diagnoses SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3`,
      [newStatus, doctorId, diagnosis_id]
    );

    // If corrected or overridden, update conditions
    if (action !== 'approve' && correction?.conditions) {
      await query(
        `UPDATE diagnoses SET conditions = $1, confidence_scores = $1 WHERE id = $2`,
        [JSON.stringify(correction.conditions), diagnosis_id]
      );
    }

    // Audit log
    await createAuditLog({
      userId: doctorId,
      userRole: 'doctor',
      action: `FEEDBACK_${action.toUpperCase()}`,
      resource: 'diagnosis',
      resourceId: diagnosis_id,
      details: { feedbackId: feedbackResult.rows[0].id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback: feedbackResult.rows[0]
    });
  } catch (error) {
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
  getMyFeedback
};
