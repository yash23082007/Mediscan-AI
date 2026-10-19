const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize, authorizeOwner, ROLES } = require('../middleware/rbac');
const { auditLog } = require('../middleware/audit');
const { validate, updatePatientSchema } = require('../middleware/validate');
const {
  getPatient,
  updatePatient,
  getAllPatients,
  getPatientHistory
} = require('../controllers/patient.controller');

// All routes require authentication
router.use(authenticate);

// Patient list (doctors/admins only)
router.get('/', authorize(ROLES.DOCTOR, ROLES.ADMIN), auditLog('VIEW_PATIENTS', 'patient'), getAllPatients);

// Patient profile
router.get('/:id', authorizeOwner('id'), auditLog('VIEW_PATIENT', 'patient'), getPatient);
router.patch('/:id', authorizeOwner('id'), validate(updatePatientSchema), auditLog('UPDATE_PATIENT', 'patient'), updatePatient);

// Patient diagnosis history
router.get('/:id/history', authorizeOwner('id'), auditLog('VIEW_HISTORY', 'patient'), getPatientHistory);

module.exports = router;
