const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize, ROLES } = require('../middleware/rbac');
const { auditLog } = require('../middleware/audit');
const {
  getDashboard,
  getSubmissions,
  getSubmissionDetail,
  getCaseHistory,
  getAnalytics
} = require('../controllers/doctor.controller');

// All routes require authentication + doctor/admin role
router.use(authenticate);
router.use(authorize(ROLES.DOCTOR, ROLES.ADMIN));

// Dashboard
router.get('/dashboard', auditLog('VIEW_DASHBOARD', 'doctor'), getDashboard);

// Patient submissions
router.get('/submissions', auditLog('VIEW_SUBMISSIONS', 'diagnosis'), getSubmissions);
router.get('/submissions/:id', auditLog('VIEW_SUBMISSION_DETAIL', 'diagnosis'), getSubmissionDetail);

// Case history
router.get('/case-history/:patientId', auditLog('VIEW_CASE_HISTORY', 'patient'), getCaseHistory);

// Analytics
router.get('/analytics', auditLog('VIEW_ANALYTICS', 'analytics'), getAnalytics);

module.exports = router;
