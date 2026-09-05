/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts route access based on user roles
 */

/**
 * Check if user has one of the allowed roles
 * @param {string[]} allowedRoles - Array of roles that can access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `This resource requires one of the following roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
};

/**
 * Ensure user can only access their own resources
 * @param {string} paramName - The request parameter containing the resource owner ID
 */
const authorizeOwner = (paramName = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Admins and doctors can access any resource
    if (['admin', 'doctor'].includes(req.user.role)) {
      return next();
    }

    const resourceOwnerId = req.params[paramName];
    if (resourceOwnerId && resourceOwnerId !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own resources.'
      });
    }

    next();
  };
};

// Role constants
const ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin'
};

module.exports = { authorize, authorizeOwner, ROLES };
