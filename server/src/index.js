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

<<<<<<< HEAD
// Trust reverse proxy for accurate IP identification on Render / Vercel (SEC9)
app.set('trust proxy', 1);

=======
>>>>>>> 6c758f0b735380f9091b3328fb200d10ff5cef85
app.use((req, res, next) => {
  const requestId = req.get('x-request-id') || randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});

// ============================================
// SECURITY MIDDLEWARE
// ============================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"]
    }
  }
}));

// CORS Configuration — strict allowlist, NO wildcards (SEC2)
const configuredOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    if (configuredOrigins.includes(origin)) {
      return callback(null, true);
    }
<<<<<<< HEAD
    // Development convenience for localhost
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }

    return callback(new AppError('CORS origin denied by security policy', 403));
=======
    return callback(new AppError('Origin not allowed by CORS policy', 403));
>>>>>>> 6c758f0b735380f9091b3328fb200d10ff5cef85
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'X-API-Key']
}));

// General API rate limiter (SEC9)
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);

// Specific Auth login rate limiter — 5 attempts per 15 minutes per IP (SEC9)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth/login', loginLimiter);

// ============================================
// BODY PARSING & LOGGING
// ============================================
// Reduced from 10mb to 100kb to mitigate payload DoS (SEC16)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'mediscan-api',
    version: '1.0.0'
  });
});

app.get('/api/health/ready', async (req, res) => {
  const aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:5000';
<<<<<<< HEAD
  const apiKey = process.env.AI_API_KEY;
  let aiEngine = 'unavailable';

  try {
    const headers = {};
    if (apiKey) headers['X-API-Key'] = apiKey;
    const aiResponse = await axios.get(`${aiEngineUrl}/health`, { headers, timeout: 3000 });
=======
  let aiEngine = 'unavailable';

  try {
    const aiResponse = await axios.get(`${aiEngineUrl}/health`, { timeout: 3000 });
>>>>>>> 6c758f0b735380f9091b3328fb200d10ff5cef85
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
<<<<<<< HEAD
    service: 'mediscan-api',
    checks: {
      database: 'healthy',
      ai_engine: aiEngine
    }
=======
    service: 'medical-diagnosis-api',
    dependencies: { aiEngine }
>>>>>>> 6c758f0b735380f9091b3328fb200d10ff5cef85
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

// 404 Handler
app.use('*', (req, res, next) => {
  next(new AppError(`Endpoint not found: ${req.method} ${req.originalUrl}`, 404));
});

// Central Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[INFO] MediscanAI API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

module.exports = app;
