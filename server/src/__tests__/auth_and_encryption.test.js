const { encrypt, decrypt, encryptFields, decryptFields } = require('../config/encryption');
const { generateAccessToken, verifyAccessToken, generateTokenPair } = require('../config/jwt');
const { registerPatientSchema, loginSchema, feedbackSchema } = require('../middleware/validate');
const { sanitizeUser } = require('../utils/helpers');

// Set test environment variables
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_key_1234567890';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_1234567890';

describe('Security & Encryption Tests', () => {
  test('AES-256-GCM encrypts and decrypts text accurately', () => {
    const sensitiveData = 'Patient has severe penicillin allergy and chronic asthma';
    const encrypted = encrypt(sensitiveData);

    expect(encrypted).not.toBe(sensitiveData);
    expect(encrypted.split(':')).toHaveLength(3); // iv:encrypted:tag

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(sensitiveData);
  });

  test('Field-level encryption and decryption works for patient records', () => {
    const patientRecord = {
      name: 'Jane Doe',
      allergies: 'Peanuts, Shellfish',
      chronic_conditions: 'Hypertension',
      age: 42
    };

    const encryptedRecord = encryptFields(patientRecord, ['allergies', 'chronic_conditions']);
    expect(encryptedRecord.name).toBe('Jane Doe');
    expect(encryptedRecord.age).toBe(42);
    expect(encryptedRecord.allergies).not.toBe('Peanuts, Shellfish');

    const decryptedRecord = decryptFields(encryptedRecord, ['allergies', 'chronic_conditions']);
    expect(decryptedRecord.allergies).toBe('Peanuts, Shellfish');
    expect(decryptedRecord.chronic_conditions).toBe('Hypertension');
  });

  test('JWT generation and token verification works correctly', () => {
    const user = { id: 'u123', email: 'doc@hospital.com', role: 'doctor', name: 'Dr. Smith' };
    const tokens = generateTokenPair(user);

    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();

    const decoded = verifyAccessToken(tokens.accessToken);
    expect(decoded.id).toBe('u123');
    expect(decoded.role).toBe('doctor');
  });

  test('sanitizeUser strips password hash from output', () => {
    const rawUser = {
      id: 'p1',
      name: 'John',
      email: 'john@test.com',
      password_hash: '$2b$12$somehashhere',
      role: 'patient'
    };

    const sanitized = sanitizeUser(rawUser);
    expect(sanitized.password_hash).toBeUndefined();
    expect(sanitized.email).toBe('john@test.com');
  });
});

describe('Zod Validation Schemas', () => {
  test('Validates compliant patient registration', () => {
    const validPatient = {
      name: 'Alex Johnson',
      email: 'alex@example.com',
      password: 'SecurePassword123!',
      age: 28,
      gender: 'male',
      weight: 72.5,
      height: 178
    };

    const result = registerPatientSchema.safeParse(validPatient);
    expect(result.success).toBe(true);
  });

  test('Rejects invalid patient passwords (missing uppercase or special char)', () => {
    const invalidPatient = {
      name: 'Alex Johnson',
      email: 'alex@example.com',
      password: 'weakpassword',
      age: 28,
      gender: 'male'
    };

    const result = registerPatientSchema.safeParse(invalidPatient);
    expect(result.success).toBe(false);
  });

  test('Validates doctor feedback payload', () => {
    const validFeedback = {
      diagnosis_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      action: 'correct',
      correction: {
        conditions: [{ name: 'Viral Pharyngitis', confidence: 0.9 }],
        notes: 'Clinical presentation indicates viral origin'
      },
      notes: 'Overrode AI preliminary prediction'
    };

    const result = feedbackSchema.safeParse(validFeedback);
    expect(result.success).toBe(true);
  });
});
