const bcrypt = require('bcryptjs');
const { randomUUID } = require('node:crypto');
const { collection } = require('../config/database');
const { asRecord } = require('../utils/mongo');
const { generateTokenPair, verifyRefreshToken } = require('../config/jwt');
const { encrypt, decryptFields } = require('../config/encryption');
const { createAuditLog } = require('../middleware/audit');
const { sanitizeUser } = require('../utils/helpers');

// Pre-computed dummy hash prevents timing-based user enumeration attacks.
const DUMMY_HASH = '$2a$12$e8Yx9p8vJbVw7jC8lGZ.U.XGfK0v1M1QnQY0p7jO.5p1c0X5yH7eq';
const setRefreshCookie = (res, token) => res.cookie('refreshToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

const registerPatient = async (req, res, next) => {
  try {
    const { name, email, password, age, gender, weight, height, allergies, chronic_conditions } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();
    const now = new Date();
    const patient = {
      _id: randomUUID(),
      name,
      email: normalizedEmail,
      password_hash: await bcrypt.hash(password, 12),
      age,
      gender,
      weight: weight || null,
      height: height || null,
      allergies: allergies ? encrypt(allergies) : null,
      chronic_conditions: chronic_conditions ? encrypt(chronic_conditions) : null,
      role: 'patient',
      is_synthetic: false,
      is_active: true,
      created_at: now,
      updated_at: now
    };

    try {
      await collection('users').insertOne(patient);
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ error: 'Email already registered' });
      throw error;
    }

    const safePatient = decryptFields(asRecord(patient), ['allergies', 'chronic_conditions']);
    const tokens = generateTokenPair(safePatient);
    setRefreshCookie(res, tokens.refreshToken);
    await createAuditLog({
      userId: safePatient.id,
      userRole: 'patient',
      action: 'REGISTER',
      resource: 'patient',
      resourceId: safePatient.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      message: 'Registration successful',
      user: sanitizeUser(safePatient),
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const normalizedEmail = (req.body.email || '').toLowerCase().trim();
    const userDoc = await collection('users').findOne({ email: normalizedEmail });

    if (!userDoc) {
      await bcrypt.compare(req.body.password, DUMMY_HASH);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = asRecord(userDoc);
    if (user.is_active === false) return res.status(403).json({ error: 'Account is deactivated' });

    const isValidPassword = await bcrypt.compare(req.body.password, user.password_hash);
    if (!isValidPassword) return res.status(401).json({ error: 'Invalid email or password' });

    if (['doctor', 'admin'].includes(user.role) && user.is_verified === false) {
      return res.status(403).json({
        error: 'Clinical account is pending administrative credential verification',
        code: 'DOCTOR_UNVERIFIED'
      });
    }

    const tokens = generateTokenPair(user);
    await createAuditLog({
      userId: user.id,
      userRole: user.role,
      action: 'LOGIN',
      resource: user.role,
      resourceId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    setRefreshCookie(res, tokens.refreshToken);

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

const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return res.status(401).json({ error: 'Refresh token required' });

    const decoded = verifyRefreshToken(token);
    const userDoc = await collection('users').findOne({ _id: decoded.id });
    if (!userDoc || userDoc.is_active === false) {
      return res.status(401).json({ error: 'User account not found or deactivated' });
    }

    const user = asRecord(userDoc);
    if (['doctor', 'admin'].includes(user.role) && user.is_verified === false) {
      return res.status(403).json({ error: 'Doctor account is not verified' });
    }

    const tokens = generateTokenPair(user);
    setRefreshCookie(res, tokens.refreshToken);
    res.json({ accessToken: tokens.accessToken, expiresIn: tokens.expiresIn });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
};

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

const getProfile = async (req, res, next) => {
  try {
    const userDoc = await collection('users').findOne({ _id: req.user.id, role: req.user.role });
    if (!userDoc) return res.status(404).json({ error: 'User not found' });

    const user = asRecord(userDoc);
    const profile = user.role === 'patient'
      ? decryptFields(user, ['allergies', 'chronic_conditions'])
      : user;
    res.json({ user: sanitizeUser(profile) });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerPatient, login, refreshToken, logout, getProfile };
