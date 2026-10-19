const { query } = require('../config/database');
const { encrypt, decrypt, decryptFields } = require('../config/encryption');
const { sanitizeUser, getPagination, paginationMeta } = require('../utils/helpers');

/**
 * Get patient profile
 * GET /api/patients/:id
 */
const getPatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT id, name, email, age, gender, weight, height, allergies, chronic_conditions, role, created_at
       FROM patients WHERE id = $1 AND is_active = TRUE`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Decrypt sensitive fields
    const patient = decryptFields(result.rows[0], ['allergies', 'chronic_conditions']);
    res.json({ patient: sanitizeUser(patient) });
  } catch (error) {
    next(error);
  }
};

/**
 * Update patient profile
 * PATCH /api/patients/:id
 */
const updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, age, gender, weight, height, allergies, chronic_conditions } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name) { updates.push(`name = $${paramCount++}`); values.push(name); }
    if (age) { updates.push(`age = $${paramCount++}`); values.push(age); }
    if (gender) { updates.push(`gender = $${paramCount++}`); values.push(gender); }
    if (weight) { updates.push(`weight = $${paramCount++}`); values.push(weight); }
    if (height) { updates.push(`height = $${paramCount++}`); values.push(height); }
    if (allergies !== undefined) { updates.push(`allergies = $${paramCount++}`); values.push(encrypt(allergies)); }
    if (chronic_conditions !== undefined) { updates.push(`chronic_conditions = $${paramCount++}`); values.push(encrypt(chronic_conditions)); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await query(
      `UPDATE patients SET ${updates.join(', ')} WHERE id = $${paramCount} AND is_active = TRUE
       RETURNING id, name, email, age, gender, weight, height, role, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json({ message: 'Profile updated', patient: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all patients (doctor/admin only)
 * GET /api/patients
 */
const getAllPatients = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const search = req.query.search || '';

    let whereClause = 'WHERE is_active = TRUE';
    const values = [];
    let paramCount = 1;

    if (search) {
      whereClause += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      values.push(`%${search}%`);
      paramCount++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM patients ${whereClause}`, values);
    const total = parseInt(countResult.rows[0].count);

    values.push(limit, offset);
    const result = await query(
      `SELECT id, name, email, age, gender, role, created_at
       FROM patients ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      values
    );

    res.json({
      patients: result.rows,
      pagination: paginationMeta(total, page, limit)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get patient's diagnosis history
 * GET /api/patients/:id/history
 */
const getPatientHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page, limit, offset } = getPagination(req.query);

    const countResult = await query(
      'SELECT COUNT(*) FROM diagnoses WHERE patient_id = $1',
      [id]
    );
    const total = countResult.rows?.[0]?.count ? parseInt(countResult.rows[0].count) : 0;

    const result = await query(
      `SELECT d.id, d.conditions, d.confidence_scores, d.explanation,
              d.feature_contributions, d.status, d.created_at, d.reviewed_at,
              doc.name as reviewer_name, doc.specialization as reviewer_specialization
       FROM diagnoses d
       LEFT JOIN doctors doc ON d.reviewed_by = doc.id
       WHERE d.patient_id = $1
       ORDER BY d.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    res.json({
      history: result.rows,
      pagination: paginationMeta(total, page, limit)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPatient,
  updatePatient,
  getAllPatients,
  getPatientHistory
};
