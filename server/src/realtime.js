/**
 * Real-time Server-Sent Events hub.
 * Case events are emitted directly by the single API process after persisted
 * MongoDB writes. Multi-instance fan-out should use a MongoDB change stream or
 * managed event bus before horizontally scaling the API.
 */
const clients = new Map();

const initRealtimeListener = () => {
  if (process.env.NODE_ENV !== 'test') {
    console.log('[INFO] In-process SSE event delivery enabled.');
  }
};

const broadcastCaseEvent = (event) => {
  for (const [clientId, { res, user }] of clients.entries()) {
    try {
      const isClinician = user.role === 'doctor' || user.role === 'admin';
      const isOwnPatient = user.role === 'patient' && String(user.id) === String(event.patient_id);
      if (isClinician || isOwnPatient) {
        res.write(`event: ${event.type || 'case_event'}\n`);
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch {
      clients.delete(clientId);
    }
  }
};

const handleSseStream = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders?.();

  const clientId = `${req.user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  clients.set(clientId, { res, user: req.user });
  res.write('event: connected\n');
  res.write(`data: ${JSON.stringify({ message: 'Real-time telemetry stream active', clientId })}\n\n`);

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    clearInterval(heartbeat);
    clients.delete(clientId);
  };

  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      cleanup();
    }
  }, 25000);

  req.on('close', cleanup);
  req.on('error', cleanup);
  res.on('finish', cleanup);
  res.on('error', cleanup);
};

module.exports = { initRealtimeListener, broadcastCaseEvent, handleSseStream, getActiveClientCount: () => clients.size };
