/**
 * MediscanAI Real-Time Server-Sent Events (SSE) Hub (§6.1)
 * Driven by database events and state transitions.
 * Pushes live updates to doctor triage queue and patient case tracker.
 */

const { Pool } = require('pg');

// Active connected SSE clients: Map<string, { res: Response, user: Object }>
const clients = new Map();

/**
 * Initialize Postgres LISTEN/NOTIFY listener if database is available
 */
let pgListenerClient = null;

const initRealtimeListener = async () => {
  if (process.env.NODE_ENV === 'test') return;

  try {
    const config = process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
          user: process.env.DB_USER || 'postgres',
          host: process.env.DB_HOST || 'localhost',
          database: process.env.DB_NAME || 'medical_diagnosis',
          password: process.env.DB_PASSWORD || 'postgres123',
          port: parseInt(process.env.DB_PORT) || 5432
        };

    const pool = new Pool(config);
    pgListenerClient = await pool.connect();

    await pgListenerClient.query('LISTEN case_events');
    console.log('[INFO] Real-time SSE hub listening on Postgres channel: case_events');

    pgListenerClient.on('notification', (msg) => {
      try {
        if (!msg.payload) return;
        const event = JSON.parse(msg.payload);
        broadcastCaseEvent(event);
      } catch (err) {
        console.warn('Error parsing pg_notify payload:', err.message);
      }
    });

    pgListenerClient.on('error', (err) => {
      console.warn('Postgres real-time listener error:', err.message);
    });
  } catch (err) {
    console.warn('[WARN] Postgres LISTEN/NOTIFY unavailable (falling back to in-memory dispatch):', err.message);
  }
};

/**
 * Broadcast event to authorized clients
 * Doctors receive all clinical queue updates.
 * Patients only receive events matching their patient_id.
 */
const broadcastCaseEvent = (event) => {
  for (const [clientId, { res, user }] of clients.entries()) {
    try {
      const isClinician = user.role === 'doctor' || user.role === 'admin';
      const isOwnPatient = user.role === 'patient' && String(user.id) === String(event.patient_id);

      if (isClinician || isOwnPatient) {
        res.write(`event: ${event.type || 'case_event'}\n`);
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (e) {
      clients.delete(clientId);
    }
  }
};

/**
 * SSE endpoint handler: GET /api/stream
 */
const handleSseStream = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Prevent Nginx buffering
  });

  res.flushHeaders?.();

  const clientId = `${req.user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  clients.set(clientId, { res, user: req.user });

  // Initial connection handshake
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ message: 'Real-time telemetry stream active', clientId })}\n\n`);

  // Heartbeat ping every 25 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(clientId);
  });
};

module.exports = {
  initRealtimeListener,
  broadcastCaseEvent,
  handleSseStream,
  getActiveClientCount: () => clients.size
};
