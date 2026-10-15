const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { generateTokenPair, verifyRefreshToken } = require('../config/jwt');
const { encrypt, decryptFields } = require('../config/encryption');
const { createAuditLog } = require('../middleware/audit');
const { sanitizeUser } = require('../utils/helpers');

/**
 * Register a new patient
 * POST /api/auth/register/patient
 */
const registerPatient = async (req, res, next) => {
  try {
    const { name, email, password, age, gender, weight, height, allergies, chronic_conditions } = req.body;

    // Check if email already exists
    const existing = await query('SELECT id FROM patients WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Encrypt sensitive fields
    const encryptedAllergies = allergies ? encrypt(allergies) : null;
    const encryptedConditions = chronic_conditions ? encrypt(chronic_conditions) : null;

    // Insert patient
    const result = await query(
      `INSERT INTO patients (name, email, password_hash, age, gender, weight, height, allergies, chronic_conditions, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'patient')
       RETURNING id, name, email, age, gender, weight, height, role, created_at`,
      [name, email, password_hash, age, gender, weight || null, height || null, encryptedAllergies, encryptedConditions]
    );

    const patient = decryptFields(result.rows[0], ['allergies', 'chronic_conditions']);
    const tokens = generateTokenPair(patient);

    // Initialize gamification record
    await query(
      `INSERT INTO gamification (patient_id, health_score, badges, total_checkups)
       VALUES ($1, 50, '[]'::jsonb, 0)`,
      [patient.id]
    );

    // Audit log
    await createAuditLog({
      userId: patient.id,
      userRole: 'patient',
      action: 'REGISTER',
      resource: 'patient',
      resourceId: patient.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      message: 'Registration successful',
      user: sanitizeUser(patient),
      ...tokens
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register a new doctor
 * POST /api/auth/register/doctor
 */
const registerDoctor = async (req, res, next) => {
  try {
    const { name, email, password, specialization, license_number } = req.body;

    // Check if email already exists
    const existing = await query('SELECT id FROM doctors WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO doctors (name, email, password_hash, specialization, license_number, role)
       VALUES ($1, $2, $3, $4, $5, 'doctor')
       RETURNING id, name, email, specialization, license_number, role, created_at`,
      [name, email, password_hash, specialization, license_number || null]
    );

    const doctor = result.rows[0];
    const tokens = generateTokenPair(doctor);

    await createAuditLog({
      userId: doctor.id,
      userRole: 'doctor',
      action: 'REGISTER',
      resource: 'doctor',
      resourceId: doctor.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      message: 'Doctor registration successful',
      user: sanitizeUser(doctor),
      ...tokens
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login (unified for patients and doctors)
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check patients table first
    let result = await query(
      'SELECT id, name, email, password_hash, role FROM patients WHERE email = $1 AND is_active = TRUE',
      [email]
    );

    let userType = 'patient';

    // If not found in patients, check doctors
    if (result.rows.length === 0) {
      result = await query(
        'SELECT id, name, email, password_hash, role FROM doctors WHERE email = $1 AND is_active = TRUE',
        [email]
      );
      userType = 'doctor';
    }

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const tokens = generateTokenPair(user);

    // Audit log
    await createAuditLog({
      userId: user.id,
      userRole: user.role,
      action: 'LOGIN',
      resource: userType,
      resourceId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      message: 'Login successful',
      user: sanitizeUser(user),
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(token);

    // Fetch current user data
    let result = await query('SELECT id, name, email, role FROM patients WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      result = await query('SELECT id, name, email, role FROM doctors WHERE id = $1', [decoded.id]);
    }

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const tokens = generateTokenPair(user);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired. Please log in again.' });
    }
    next(error);
  }
};

/**
 * Logout
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userRole: req.user.role,
        action: 'LOGOUT',
        resource: req.user.role,
        resourceId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getProfile = async (req, res, next) => {
  try {
    const { id, role } = req.user;
    let result;

    if (role === 'patient') {
      result = await query(
        'SELECT id, name, email, age, gender, weight, height, allergies, chronic_conditions, role, created_at FROM patients WHERE id = $1',
        [id]
      );
    } else {
      result = await query(
        'SELECT id, name, email, specialization, license_number, role, created_at FROM doctors WHERE id = $1',
        [id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerPatient,
  registerDoctor,
  login,
  refreshToken,
  logout,
  getProfile
};
