const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validate, registerPatientSchema, loginSchema } = require('../middleware/validate');
const { auditLog } = require('../middleware/audit');
const {
  registerPatient,
  login,
  refreshToken,
  logout,
  getProfile
} = require('../controllers/auth.controller');

// Public routes
router.post('/register/patient', validate(registerPatientSchema), registerPatient);
// Note: SEC1 — Public doctor registration route is removed. Doctor accounts are seeded or created via invite.
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refreshToken);

// Protected routes
router.post('/logout', optionalAuth, logout);
router.get('/me', authenticate, auditLog('VIEW_PROFILE', 'user'), getProfile);

module.exports = router;
