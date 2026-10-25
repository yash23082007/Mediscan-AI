const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const {
  createDiagnosis,
  getDiagnosis,
  getLatestDiagnosis,
  getDatasetsInfo
} = require('../controllers/diagnosis.controller');

// Model metadata is public; it contains dataset provenance, not patient data.
router.get('/datasets/info', auditLog('VIEW_DATASET_INFO', 'diagnosis'), getDatasetsInfo);

// All patient diagnosis routes require authentication.
router.use(authenticate);

// Create diagnosis (patient)
router.post('/', auditLog('CREATE_DIAGNOSIS', 'diagnosis'), createDiagnosis);

// Get latest diagnosis (patient)
router.get('/latest', auditLog('VIEW_LATEST_DIAGNOSIS', 'diagnosis'), getLatestDiagnosis);

// Get specific diagnosis
router.get('/:id', auditLog('VIEW_DIAGNOSIS', 'diagnosis'), getDiagnosis);

module.exports = router;
