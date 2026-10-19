const jwt = require('jsonwebtoken');

const isProduction = process.env.NODE_ENV === 'production';

const getAccessSecret = () => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (isProduction && (!secret || secret === 'dev_access_secret' || secret.length < 32)) {
    throw new Error('FATAL: JWT_ACCESS_SECRET must be at least 32 characters in production (SEC5)');
  }
  return secret || 'dev_access_secret_for_local_development_only_minimum_32_characters';
};

const getRefreshSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (isProduction && (!secret || secret === 'dev_refresh_secret' || secret.length < 32)) {
    throw new Error('FATAL: JWT_REFRESH_SECRET must be at least 32 characters in production (SEC5)');
  }
  return secret || 'dev_refresh_secret_for_local_development_only_minimum_32_characters';
};

const validateJwtSecrets = () => {
  getAccessSecret();
  getRefreshSecret();
};

const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

/**
 * Generate JWT access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, getAccessSecret(), { expiresIn: ACCESS_EXPIRY });
};

/**
 * Generate JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, getRefreshSecret(), { expiresIn: REFRESH_EXPIRY });
};

/**
 * Verify JWT access token
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, getAccessSecret());
};

/**
 * Verify JWT refresh token
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, getRefreshSecret());
};

/**
 * Generate both access and refresh tokens
 */
const generateTokenPair = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken({ id: user.id, role: user.role }),
    expiresIn: ACCESS_EXPIRY
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
  validateJwtSecrets
};
