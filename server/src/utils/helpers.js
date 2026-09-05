/**
 * Shared utility helpers
 */

/**
 * Strip sensitive fields from an object before sending to client
 */
const sanitizeUser = (user) => {
  const { password_hash, ...safe } = user;
  return safe;
};

/**
 * Build pagination parameters from query string
 */
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

/**
 * Build pagination metadata for response
 */
const paginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1
});

/**
 * Generate a human-readable timestamp
 */
const formatTimestamp = (date = new Date()) => {
  return date.toISOString();
};

module.exports = {
  sanitizeUser,
  getPagination,
  paginationMeta,
  formatTimestamp
};
