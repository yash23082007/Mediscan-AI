const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const { randomUUID } = require('crypto');

const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patient.routes');
const doctorRoutes = require('./routes/doctor.routes');
const diagnosisRoutes = require('./routes/diagnosis.routes');
const questionnaireRoutes = require('./routes/questionnaire.routes');
const feedbackRoutes = require('./routes/feedback.routes');
const { AppError, errorHandler } = require('./utils/errors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use((req, res, next) => {
  const requestId = req.get('x-request-id') || randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});

// ============================================
// SECURITY MIDDLEWARE
// ============================================
app.use(helmet());
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
const allowedOrigins = corsOrigin.includes(',')
  ? corsOrigin.split(',').map(s => s.trim())
  : [corsOrigin];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (corsOrigin === '*' || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(new AppError('Origin not allowed by CORS policy', 403));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// ============================================
// BODY PARSING & LOGGING
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('combined'));

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'medical-diagnosis-api',
    version: '1.0.0'
  });
});

app.get('/api/health/ready', async (req, res) => {
  const aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:5000';
  let aiEngine = 'unavailable';

  try {
    const aiResponse = await axios.get(`${aiEngineUrl}/health`, { timeout: 3000 });
    if (aiResponse.status === 200 && aiResponse.data?.status === 'healthy') {
      aiEngine = 'healthy';
    }
  } catch (error) {
    console.warn(`AI engine readiness check failed: ${error.message}`);
  }

  const ready = aiEngine === 'healthy';
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    service: 'medical-diagnosis-api',
    dependencies: { aiEngine }
  });
});

// ============================================
// API ROUTES
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/diagnoses', diagnosisRoutes);
app.use('/api/questionnaire', questionnaireRoutes);
app.use('/api/feedback', feedbackRoutes);

// ============================================
// ERROR HANDLING
// ============================================
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`🏥 Medical Diagnosis API running on port ${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
