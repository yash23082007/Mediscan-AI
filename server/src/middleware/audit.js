const { randomUUID } = require('node:crypto');
const { collection } = require('../config/database');

/** Append-only audit writer. Audit failures never change the user response. */
const writeAuditLog = async ({ userId, userRole, action, resource, resourceId, details, ipAddress, userAgent }) => {
  try {
    await collection('audit_logs').insertOne({
      _id: randomUUID(),
      user_id: userId || null,
      user_role: userRole || 'anonymous',
      action,
      resource: resource || null,
      resource_id: resourceId || null,
      details: details || {},
      ip_address: ipAddress || null,
      user_agent: userAgent || '',
      created_at: new Date()
    });
  } catch {
    console.error('Failed to persist an audit event.');
  }
};

const auditLog = (action, resource) => (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    const safeRequestFields = req.body && Object.keys(req.body).filter(
      key => !['password', 'password_hash', 'accessToken', 'refreshToken', 'allergies', 'chronic_conditions'].includes(key)
    );
    void writeAuditLog({
      userId: req.user?.id,
      userRole: req.user?.role || 'anonymous',
      action,
      resource,
      resourceId: req.params?.id || null,
      details: {
        method: req.method,
        path: req.originalUrl,
        statusCode: body?.error ? 'error' : 'success',
        ...(safeRequestFields?.length ? { requestFields: safeRequestFields } : {})
      },
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'] || ''
    });
    return originalJson(body);
  };
  next();
};

const createAuditLog = writeAuditLog;

module.exports = { auditLog, logAction: writeAuditLog, createAuditLog };
