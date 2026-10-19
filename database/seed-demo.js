/**
 * MediscanAI — Runtime seed script
 * Seeds one visibly synthetic local admin with a random password.
 *
 * Usage: after starting local PostgreSQL, run `node database/seed-demo.js`.
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'medical_diagnosis',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

const generatePassword = () => crypto.randomBytes(8).toString('base64url').slice(0, 12);

async function ensureSyntheticColumn() {
  await pool.query('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN NOT NULL DEFAULT FALSE');
  console.log('Synthetic-account marker is ready');
}

async function seedQuestions() {
  const seedPath = path.resolve(__dirname, 'seed.sql');
  const seed = fs.readFileSync(seedPath, 'utf8');
  await pool.query(seed);
  console.log('Question bank seeded');
}

async function seedDemoAccounts() {
  const account = {
    name: 'Synthetic Local Admin',
    email: 'demo-admin@local.invalid',
    specialization: 'Demo administration',
    role: 'admin',
  };

  await pool.query(`
    UPDATE doctors
    SET is_synthetic = TRUE, is_verified = FALSE, license_number = NULL
    WHERE email IN (
      'sarah.mitchell@hospital.com',
      'james.rodriguez@hospital.com',
      'emily.chen@hospital.com'
    )
  `);

  const password = generatePassword();
  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO doctors (name, email, password_hash, specialization, license_number, role, is_verified, is_synthetic)
     VALUES ($1, $2, $3, $4, NULL, $5, TRUE, TRUE)
     ON CONFLICT (email) DO UPDATE
     SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash,
         specialization = EXCLUDED.specialization, is_verified = TRUE, is_synthetic = TRUE`,
    [account.name, account.email, hash, account.specialization, account.role]
  );

  console.log('\nSynthetic local admin credentials (save these; the password is shown only once):\n');
  console.log('-'.repeat(70));
  console.log(`  ${account.role.toUpperCase().padEnd(7)} ${account.email.padEnd(35)} ${password}`);
  console.log('-'.repeat(70));
  console.log('\nThis password is not stored anywhere else. Save it now.\n');
}

async function main() {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Demo seeding is disabled in production');
    }
    console.log('MediscanAI: seeding local demo data...\n');

    await ensureSyntheticColumn();
    await seedQuestions();
    await seedDemoAccounts();

    console.log('Local demo data seeded successfully.\n');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
