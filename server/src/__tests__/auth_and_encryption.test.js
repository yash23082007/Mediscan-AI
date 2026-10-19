const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { encrypt, decrypt, encryptFields, decryptFields } = require('../config/encryption');
const { generateAccessToken, verifyAccessToken, generateTokenPair } = require('../config/jwt');
const { registerPatientSchema, feedbackSchema } = require('../middleware/validate');
const { sanitizeUser } = require('../utils/helpers');

process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_key_1234567890';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_1234567890';

describe('Security and encryption', () => {
  it('encrypts and decrypts text with AES-256-GCM', () => {
    const sensitiveData = 'Patient has severe penicillin allergy and chronic asthma';
    const encrypted = encrypt(sensitiveData);

    assert.notEqual(encrypted, sensitiveData);
    assert.equal(encrypted.split(':').length, 4);
    assert.equal(encrypted.split(':')[0], 'v1');
    assert.equal(decrypt(encrypted), sensitiveData);
  });

  it('encrypts and decrypts patient fields without changing other fields', () => {
    const patientRecord = {
      name: 'Jane Doe',
      allergies: 'Peanuts, Shellfish',
      chronic_conditions: 'Hypertension',
      age: 42
    };
    const encryptedRecord = encryptFields(patientRecord, ['allergies', 'chronic_conditions']);

    assert.equal(encryptedRecord.name, 'Jane Doe');
    assert.equal(encryptedRecord.age, 42);
    assert.notEqual(encryptedRecord.allergies, 'Peanuts, Shellfish');
    const decryptedRecord = decryptFields(encryptedRecord, ['allergies', 'chronic_conditions']);
    assert.equal(decryptedRecord.allergies, 'Peanuts, Shellfish');
    assert.equal(decryptedRecord.chronic_conditions, 'Hypertension');
  });

  it('generates and verifies signed JWTs', () => {
    const user = { id: 'u123', email: 'doc@hospital.com', role: 'doctor', name: 'Dr. Smith' };
    const tokens = generateTokenPair(user);

    assert.ok(tokens.accessToken);
    assert.ok(tokens.refreshToken);
    const decoded = verifyAccessToken(tokens.accessToken);
    assert.equal(decoded.id, 'u123');
    assert.equal(decoded.role, 'doctor');
    assert.equal(verifyAccessToken(generateAccessToken(user)).id, 'u123');
  });

  it('removes password hashes from user output', () => {
    const sanitized = sanitizeUser({
      id: 'p1', name: 'John', email: 'john@test.com',
      password_hash: '$2b$12$somehashhere', role: 'patient'
    });
    assert.equal(sanitized.password_hash, undefined);
    assert.equal(sanitized.email, 'john@test.com');
  });
});

describe('Request validation', () => {
  it('accepts a compliant patient registration', () => {
    const result = registerPatientSchema.safeParse({
      name: 'Alex Johnson', email: 'alex@example.com', password: 'SecurePassword123!',
      age: 28, gender: 'male', weight: 72.5, height: 178
    });
    assert.equal(result.success, true);
  });

  it('rejects a weak patient password', () => {
    const result = registerPatientSchema.safeParse({
      name: 'Alex Johnson', email: 'alex@example.com', password: 'weakpassword',
      age: 28, gender: 'male'
    });
    assert.equal(result.success, false);
  });

  it('accepts doctor feedback with a valid diagnosis UUID', () => {
    const result = feedbackSchema.safeParse({
      diagnosis_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      action: 'correct',
      correction: {
        conditions: [{ name: 'Viral Pharyngitis', confidence: 0.9 }],
        notes: 'Clinical presentation indicates viral origin'
      },
      notes: 'Overrode AI preliminary prediction'
    });
    assert.equal(result.success, true);
  });
});
