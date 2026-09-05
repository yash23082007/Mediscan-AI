const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize, ROLES } = require('../middleware/rbac');
const { auditLog } = require('../middleware/audit');
const { validate, feedbackSchema } = require('../middleware/validate');
const {
  submitFeedback,
  getFeedbackByDiagnosis,
  getMyFeedback
} = require('../controllers/feedback.controller');

// All routes require authentication
router.use(authenticate);

// Submit feedback (doctors only)
router.post('/', authorize(ROLES.DOCTOR, ROLES.ADMIN), validate(feedbackSchema), auditLog('SUBMIT_FEEDBACK', 'feedback'), submitFeedback);

// Get feedback for a diagnosis
router.get('/diagnosis/:diagnosisId', authorize(ROLES.DOCTOR, ROLES.ADMIN), getFeedbackByDiagnosis);

// Get doctor's own feedback history
router.get('/my-feedback', authorize(ROLES.DOCTOR, ROLES.ADMIN), getMyFeedback);

module.exports = router;
