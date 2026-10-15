const { query } = require('../config/database');
const { getPagination, paginationMeta } = require('../utils/helpers');

/**
 * Get doctor dashboard data
 * GET /api/doctors/dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    const doctorId = req.user.id;

    // Stats
    const [pendingResult, reviewedResult, totalPatientsResult, recentResult] = await Promise.all([
      query(`SELECT COUNT(*) FROM diagnoses WHERE status = 'pending'`),
      query(`SELECT COUNT(*) FROM feedback WHERE doctor_id = $1`, [doctorId]),
      query(`SELECT COUNT(DISTINCT patient_id) FROM diagnoses`),
      query(
        `SELECT d.id, d.conditions, d.confidence_scores, d.status, d.created_at,
                p.name as patient_name, p.age as patient_age, p.gender as patient_gender
         FROM diagnoses d
         JOIN patients p ON d.patient_id = p.id
         ORDER BY d.created_at DESC
         LIMIT 10`
      )
    ]);

    res.json({
      dashboard: {
        stats: {
          pendingReviews: parseInt(pendingResult.rows[0].count),
          reviewedByMe: parseInt(reviewedResult.rows[0].count),
          totalPatients: parseInt(totalPatientsResult.rows[0].count)
        },
        recentSubmissions: recentResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all patient submissions for review
 * GET /api/doctors/submissions
 */
const getSubmissions = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const status = req.query.status || null;

    let whereClause = '';
    const values = [];
    let paramCount = 1;

    if (status) {
      whereClause = `WHERE d.status = $${paramCount}`;
      values.push(status);
      paramCount++;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM diagnoses d ${whereClause}`,
      values
    );
    const total = countResult.rows?.[0]?.count ? parseInt(countResult.rows[0].count) : 0;

    values.push(limit, offset);
    const result = await query(
      `SELECT d.id, d.patient_id, d.conditions, d.confidence_scores, d.explanation,
              d.feature_contributions, d.status, d.created_at, d.reviewed_at,
              p.name as patient_name, p.age as patient_age, p.gender as patient_gender,
              p.weight as patient_weight, p.height as patient_height,
              qr.responses as questionnaire_responses, qr.total_questions
       FROM diagnoses d
       JOIN patients p ON d.patient_id = p.id
       LEFT JOIN questionnaire_responses qr ON d.questionnaire_id = qr.id
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      values
    );

    res.json({
      submissions: result.rows,
      pagination: paginationMeta(total, page, limit)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single submission detail
 * GET /api/doctors/submissions/:id
 */
const getSubmissionDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT d.*, p.name as patient_name, p.age as patient_age, p.gender as patient_gender,
              p.weight as patient_weight, p.height as patient_height,
              qr.responses as questionnaire_responses, qr.decision_path,
              qr.session_duration, qr.total_questions
       FROM diagnoses d
       JOIN patients p ON d.patient_id = p.id
       LEFT JOIN questionnaire_responses qr ON d.questionnaire_id = qr.id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Get feedback history for this diagnosis
    const feedbackResult = await query(
      `SELECT f.*, doc.name as doctor_name, doc.specialization
       FROM feedback f
       JOIN doctors doc ON f.doctor_id = doc.id
       WHERE f.diagnosis_id = $1
       ORDER BY f.created_at DESC`,
      [id]
    );

    res.json({
      submission: result.rows[0],
      feedbackHistory: feedbackResult.rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get case history for a patient
 * GET /api/doctors/case-history/:patientId
 */
const getCaseHistory = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const patientResult = await query(
      'SELECT id, name, email, age, gender, weight, height, created_at FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const diagnosesResult = await query(
      `SELECT d.id, d.conditions, d.confidence_scores, d.explanation,
              d.status, d.created_at, d.reviewed_at,
              doc.name as reviewer_name
       FROM diagnoses d
       LEFT JOIN doctors doc ON d.reviewed_by = doc.id
       WHERE d.patient_id = $1
       ORDER BY d.created_at DESC`,
      [patientId]
    );

    const feedbackResult = await query(
      `SELECT f.*, doc.name as doctor_name
       FROM feedback f
       JOIN doctors doc ON f.doctor_id = doc.id
       JOIN diagnoses d ON f.diagnosis_id = d.id
       WHERE d.patient_id = $1
       ORDER BY f.created_at DESC`,
      [patientId]
    );

    res.json({
      patient: patientResult.rows[0],
      diagnoses: diagnosesResult.rows,
      feedback: feedbackResult.rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get analytics data
 * GET /api/doctors/analytics
 */
const getAnalytics = async (req, res, next) => {
  try {
    const [
      conditionDistribution,
      accuracyTrends,
      dailySubmissions,
      feedbackBreakdown
    ] = await Promise.all([
      // Top conditions diagnosed
      query(`
        SELECT condition_data->>'name' as condition_name, COUNT(*) as count
        FROM diagnoses,
        LATERAL jsonb_array_elements(conditions) AS condition_data
        GROUP BY condition_data->>'name'
        ORDER BY count DESC
        LIMIT 10
      `),
      // Monthly accuracy (approved vs overridden/corrected)
      query(`
        SELECT
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) FILTER (WHERE status = 'approved') as approved,
          COUNT(*) FILTER (WHERE status IN ('overridden', 'corrected')) as corrected,
          COUNT(*) as total
        FROM diagnoses
        WHERE status != 'pending'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
        LIMIT 12
      `),
      // Daily submission count (last 30 days)
      query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM diagnoses
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `),
      // Feedback action breakdown
      query(`
        SELECT action, COUNT(*) as count
        FROM feedback
        GROUP BY action
      `)
    ]);

    res.json({
      analytics: {
        conditionDistribution: conditionDistribution.rows,
        accuracyTrends: accuracyTrends.rows,
        dailySubmissions: dailySubmissions.rows,
        feedbackBreakdown: feedbackBreakdown.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getSubmissions,
  getSubmissionDetail,
  getCaseHistory,
  getAnalytics
};
