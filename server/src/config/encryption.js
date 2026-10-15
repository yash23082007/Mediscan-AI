const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// Encryption key must be 32 bytes (64 hex chars)
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  if (!key || key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(key, 'hex');
};

/**
 * Encrypt a plaintext string using AES-256-GCM
 * @param {string} plaintext - The text to encrypt
 * @returns {string} Encrypted string in format: iv:encrypted:tag (all hex-encoded)
 */
const encrypt = (plaintext) => {
  if (!plaintext) return plaintext;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  // Format: iv:encrypted:tag (all hex)
  return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
};

/**
 * Decrypt an AES-256-GCM encrypted string
 * @param {string} encryptedText - The encrypted text in format: iv:encrypted:tag
 * @returns {string} Decrypted plaintext
 */
const decrypt = (encryptedText) => {
  if (!encryptedText) return encryptedText;

  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const tag = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    return '[ENCRYPTED]';
  }
};

/**
 * Encrypt specific fields in an object
 * @param {object} data - The data object
 * @param {string[]} fields - Array of field names to encrypt
 * @returns {object} Object with specified fields encrypted
 */
const encryptFields = (data, fields) => {
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
 * @param {object} data - The data object
 * @param {string[]} fields - Array of field names to decrypt
 * @returns {object} Object with specified fields decrypted
 */
const decryptFields = (data, fields) => {
  const result = { ...data };
  for (const field of fields) {
    if (result[field]) {
      result[field] = decrypt(result[field]);
    }
  }
  return result;
};

module.exports = { encrypt, decrypt, encryptFields, decryptFields };
