const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize, ROLES } = require('../middleware/rbac');
const { auditLog } = require('../middleware/audit');
const {
  startQuestionnaire,
  getNextQuestion,
  getSession,
  stepBack
} = require('../controllers/questionnaire.controller');

// All routes require authentication
router.use(authenticate);

// Start questionnaire (patient)
router.post('/start', authorize(ROLES.PATIENT), auditLog('START_QUESTIONNAIRE', 'questionnaire'), startQuestionnaire);

// Get next adaptive question
router.post('/next', authorize(ROLES.PATIENT), getNextQuestion);

// Rewind one persisted step before allowing the patient to edit an earlier answer.
router.post('/back', authorize(ROLES.PATIENT), stepBack);

// Get session data
router.get('/:sessionId', getSession);

module.exports = router;
