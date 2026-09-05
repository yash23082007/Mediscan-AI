const { query } = require('../config/database');

/**
 * Audit Logging Middleware
 * Logs every authenticated API action to the audit_logs table
 */
const auditLog = (action, resource) => {
  return async (req, res, next) => {
    // Store original json method to intercept response
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      // Log after response is sent
      logAction(req, action, resource, body).catch((err) => {
        console.error('Audit log error:', err.message);
      });
      return originalJson(body);
    };

    next();
  };
};

/**
 * Log an action to the audit_logs table
 */
const logAction = async (req, action, resource, responseBody = null) => {
  try {
    const userId = req.user?.id || null;
    const userRole = req.user?.role || 'anonymous';
    const resourceId = req.params?.id || null;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    const details = {
      method: req.method,
      path: req.originalUrl,
      statusCode: responseBody?.error ? 'error' : 'success',
      ...(req.body && Object.keys(req.body).length > 0 && {
        // Log request body but strip sensitive fields
        requestFields: Object.keys(req.body).filter(
          key => !['password', 'password_hash', 'accessToken', 'refreshToken'].includes(key)
        )
      })
    };

    await query(
      `INSERT INTO audit_logs (user_id, user_role, action, resource, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, userRole, action, resource, resourceId, JSON.stringify(details), ipAddress, userAgent]
    );
  } catch (error) {
    // Audit logging should never break the request flow
    console.error('Failed to write audit log:', error.message);
  }
};

/**
 * Direct audit log function (for use outside middleware)
 */
const createAuditLog = async ({ userId, userRole, action, resource, resourceId, details, ipAddress, userAgent }) => {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, user_role, action, resource, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, userRole, action, resource, resourceId, JSON.stringify(details || {}), ipAddress, userAgent]
    );
  } catch (error) {
    console.error('Failed to write audit log:', error.message);
  }
};

module.exports = { auditLog, logAction, createAuditLog };
