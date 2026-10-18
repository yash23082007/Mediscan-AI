const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // NIST standard for AES-GCM is 96 bits (12 bytes)
const isProduction = process.env.NODE_ENV === 'production';

// Parse 32-byte encryption key from hex, base64, or utf-8
const getEncryptionKey = () => {
  const rawKey = process.env.ENCRYPTION_KEY;

  if (isProduction && (!rawKey || rawKey.includes('0123456789abcdef'))) {
    throw new Error('FATAL: Insecure or default ENCRYPTION_KEY detected in production (SEC5/SEC14)');
  }

  const keyStr = rawKey || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  // Try 64-char hex
  if (/^[0-9a-fA-F]{64}$/.test(keyStr)) {
    return Buffer.from(keyStr, 'hex');
  }

  // Try base64 (e.g. from openssl rand -base64 32)
  try {
    const buf = Buffer.from(keyStr, 'base64');
    if (buf.length === 32) {
      return buf;
    }
  } catch (e) {
    // continue
  }

  // Try direct 32-byte string
  if (Buffer.byteLength(keyStr, 'utf8') === 32) {
    return Buffer.from(keyStr, 'utf8');
  }

  throw new Error('ENCRYPTION_KEY must be a valid 32-byte key (64 hex characters or 32-byte base64 string)');
};

/**
 * Encrypt a plaintext string using AES-256-GCM
 * Format: v1:iv:encrypted:tag (hex encoded)
 *
 * @param {string} plaintext - The text to encrypt
 * @returns {string} Encrypted string
 */
const encrypt = (plaintext) => {
  if (!plaintext) return plaintext;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return `v1:${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
};

/**
 * Decrypt an AES-256-GCM encrypted string
 * Supports both v1 (12-byte IV) and legacy (16-byte IV) formats.
 *
 * @param {string} encryptedText - The encrypted text
 * @returns {string} Decrypted plaintext
 */
const decrypt = (encryptedText) => {
  if (!encryptedText) return encryptedText;

  const key = getEncryptionKey();
  let ivHex, encrypted, tagHex;

  const parts = encryptedText.split(':');

  if (parts.length === 4 && parts[0] === 'v1') {
    // Format: v1:iv:ct:tag
    [, ivHex, encrypted, tagHex] = parts;
  } else if (parts.length === 3) {
    // Legacy format: iv:ct:tag
    [ivHex, encrypted, tagHex] = parts;
  } else {
    // Not encrypted or unrecognized format
    return encryptedText;
  }

  try {
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed for ciphertext:', error.message);
    throw new Error('Failed to decrypt sensitive clinical record (SEC14)');
  }
};

/**
 * Encrypt specific fields in an object
 */
const encryptFields = (data, fields) => {
  if (!data) return data;
  const result = { ...data };
  for (const field of fields) {
    if (result[field]) {
      result[field] = encrypt(result[field]);
    }
  }
  return result;
};

/**
 * Decrypt specific fields in an object
 */
const decryptFields = (data, fields) => {
  if (!data) return data;
  const result = { ...data };
  for (const field of fields) {
    if (result[field]) {
      result[field] = decrypt(result[field]);
    }
  }
  return result;
};

module.exports = {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  getEncryptionKey
};
