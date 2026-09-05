const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validate, registerPatientSchema, registerDoctorSchema, loginSchema } = require('../middleware/validate');
const { auditLog } = require('../middleware/audit');
const {
  registerPatient,
  registerDoctor,
  login,
  refreshToken,
  logout,
  getProfile
} = require('../controllers/auth.controller');

// Public routes
router.post('/register/patient', validate(registerPatientSchema), registerPatient);
router.post('/register/doctor', validate(registerDoctorSchema), registerDoctor);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refreshToken);

// Protected routes
router.post('/logout', optionalAuth, logout);
router.get('/me', authenticate, auditLog('VIEW_PROFILE', 'user'), getProfile);

module.exports = router;
