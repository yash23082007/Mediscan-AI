const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize, ROLES } = require('../middleware/rbac');
const { auditLog } = require('../middleware/audit');
const {
  startQuestionnaire,
  getNextQuestion,
  getSession
} = require('../controllers/questionnaire.controller');

// All routes require authentication
router.use(authenticate);

// Start questionnaire (patient)
router.post('/start', authorize(ROLES.PATIENT), auditLog('START_QUESTIONNAIRE', 'questionnaire'), startQuestionnaire);

// Get next adaptive question
router.post('/next', authorize(ROLES.PATIENT), getNextQuestion);

// Get session data
router.get('/:sessionId', getSession);

module.exports = router;
