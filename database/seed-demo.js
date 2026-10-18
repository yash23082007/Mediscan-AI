/**
 * MediscanAI — Runtime seed script
 * Seeds demo doctor accounts with runtime-hashed passwords.
 * Passwords are generated randomly and printed once to stdout.
 *
 * Usage: node database/seed-demo.js
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
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'medical_diagnosis',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

const generatePassword = () => crypto.randomBytes(8).toString('base64url').slice(0, 12);

async function seedSchema() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
  console.log('✅ Schema created');
}

async function seedQuestions() {
  const seedPath = path.resolve(__dirname, 'seed.sql');
  const seed = fs.readFileSync(seedPath, 'utf8');
  await pool.query(seed);
  console.log('✅ Question bank seeded');
}

async function seedDemoAccounts() {
  const accounts = [
    { name: 'Dr. Sarah Mitchell', email: 'sarah.mitchell@hospital.com', specialization: 'General Medicine', license: 'MED-2024-001', role: 'doctor' },
    { name: 'Dr. James Rodriguez', email: 'james.rodriguez@hospital.com', specialization: 'Pulmonology', license: 'MED-2024-002', role: 'doctor' },
    { name: 'Dr. Emily Chen', email: 'emily.chen@hospital.com', specialization: 'Cardiology', license: 'MED-2024-003', role: 'doctor' },
    { name: 'Admin User', email: 'admin@hospital.com', specialization: 'Administration', license: 'ADM-2024-001', role: 'admin' },
  ];

  console.log('\n🔑 Demo account credentials (save these — they are shown only once):\n');
  console.log('─'.repeat(70));

  for (const acct of accounts) {
    const password = generatePassword();
    const hash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO doctors (name, email, password_hash, specialization, license_number, role, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       ON CONFLICT (email) DO NOTHING`,
      [acct.name, acct.email, hash, acct.specialization, acct.license, acct.role]
    );

    console.log(`  ${acct.role.toUpperCase().padEnd(7)} ${acct.email.padEnd(35)} ${password}`);
  }

  console.log('─'.repeat(70));
  console.log('\n⚠️  These passwords are not stored anywhere else. Save them now.\n');
}

async function main() {
  try {
    console.log('🏥 MediscanAI — Seeding database...\n');

    await seedSchema();
    await seedQuestions();
    await seedDemoAccounts();

    console.log('✅ Database seeded successfully!\n');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
