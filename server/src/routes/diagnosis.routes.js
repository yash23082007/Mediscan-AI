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

// All routes require authentication
router.use(authenticate);

// Get clinical internet datasets metadata
router.get('/datasets/info', auditLog('VIEW_DATASET_INFO', 'diagnosis'), getDatasetsInfo);

// Create diagnosis (patient)
router.post('/', auditLog('CREATE_DIAGNOSIS', 'diagnosis'), createDiagnosis);

// Get latest diagnosis (patient)
router.get('/latest', auditLog('VIEW_LATEST_DIAGNOSIS', 'diagnosis'), getLatestDiagnosis);

// Get specific diagnosis
router.get('/:id', auditLog('VIEW_DIAGNOSIS', 'diagnosis'), getDiagnosis);

module.exports = router;
