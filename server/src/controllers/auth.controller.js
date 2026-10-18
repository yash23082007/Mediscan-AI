const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { generateTokenPair, verifyRefreshToken } = require('../config/jwt');
const { encrypt, decryptFields } = require('../config/encryption');
const { createAuditLog } = require('../middleware/audit');
const { sanitizeUser } = require('../utils/helpers');

// Pre-computed dummy hash to prevent timing-based user enumeration attacks (SEC10)
const DUMMY_HASH = '$2a$12$e8Yx9p8vJbVw7jC8lGZ.U.XGfK0v1M1QnQY0p7jO.5p1c0X5yH7eq';

/**
 * Register a new patient
 * POST /api/auth/register/patient
 */
const registerPatient = async (req, res, next) => {
  try {
    const { name, email, password, age, gender, weight, height, allergies, chronic_conditions } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();

    // Check if email already exists in patients or doctors
    const existingPatient = await query('SELECT id FROM patients WHERE email = $1', [normalizedEmail]);
    const existingDoctor = await query('SELECT id FROM doctors WHERE email = $1', [normalizedEmail]);

    if (existingPatient.rows.length > 0 || existingDoctor.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Encrypt sensitive clinical fields
    const encryptedAllergies = allergies ? encrypt(allergies) : null;
    const encryptedConditions = chronic_conditions ? encrypt(chronic_conditions) : null;

    // Insert patient
    const result = await query(
      `INSERT INTO patients (name, email, password_hash, age, gender, weight, height, allergies, chronic_conditions, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'patient')
       RETURNING id, name, email, age, gender, weight, height, role, created_at`,
      [name, normalizedEmail, password_hash, age, gender, weight || null, height || null, encryptedAllergies, encryptedConditions]
    );

    const patient = decryptFields(result.rows[0], ['allergies', 'chronic_conditions']);
    const tokens = generateTokenPair(patient);

    // Set refresh token as secure HttpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

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
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login (unified for patients and verified doctors)
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();

    // Check patients table
    let result = await query(
      'SELECT id, name, email, password_hash, role, is_active FROM patients WHERE email = $1',
      [normalizedEmail]
    );

    let userType = 'patient';

    // If not found in patients, check doctors
    if (result.rows.length === 0) {
      result = await query(
        'SELECT id, name, email, password_hash, role, is_active, is_verified FROM doctors WHERE email = $1',
        [normalizedEmail]
      );
      userType = 'doctor';
    }

    // Timing attack mitigation: always run bcrypt.compare even if user not found (SEC10)
    if (result.rows.length === 0) {
      await bcrypt.compare(password, DUMMY_HASH);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check active status
    if (user.is_active === false) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // For doctors: verify clinical credential approval (SEC1)
    if (user.role === 'doctor' && user.is_verified === false) {
      return res.status(403).json({
        error: 'Clinical account is pending administrative credential verification',
        code: 'DOCTOR_UNVERIFIED'
      });
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

    // Set refresh token as strict HttpOnly cookie (SEC3)
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000
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
    let result = await query('SELECT id, name, email, role, is_active FROM patients WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      result = await query('SELECT id, name, email, role, is_active, is_verified FROM doctors WHERE id = $1', [decoded.id]);
    }

    if (result.rows.length === 0 || result.rows[0].is_active === false) {
      return res.status(401).json({ error: 'User account not found or deactivated' });
    }

    const user = result.rows[0];

    if (user.role === 'doctor' && user.is_verified === false) {
      return res.status(403).json({ error: 'Doctor account is not verified' });
    }

    const tokens = generateTokenPair(user);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
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
    return res.status(401).json({ error: 'Invalid refresh token' });
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
      sameSite: 'strict',
      path: '/api/auth'
    });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile (with decrypted sensitive fields) (SEC13)
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
        'SELECT id, name, email, specialization, license_number, role, is_verified, created_at FROM doctors WHERE id = $1',
        [id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = result.rows[0];

    // Decrypt sensitive patient clinical fields before returning to authorized user (SEC13)
    const sanitized = role === 'patient'
      ? decryptFields(userData, ['allergies', 'chronic_conditions'])
      : userData;

    res.json({ user: sanitizeUser(sanitized) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerPatient,
  login,
  refreshToken,
  logout,
  getProfile
};
