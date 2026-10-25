/** Seed the questionnaire and one synthetic local administrator. */
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const bcrypt = require('../server/node_modules/bcryptjs');
const { connectDatabase, collection, closeDatabase } = require('../server/src/config/database');
const { seedQuestionnaire } = require('../server/scripts/initialize-database');
const { randomUUID } = require('node:crypto');

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seeding is disabled in production');
  const password = process.env.DEMO_ADMIN_PASSWORD;
  if (!password || password.length < 16) {
    throw new Error('Set DEMO_ADMIN_PASSWORD to a private value of at least 16 characters before seeding the demo clinician.');
  }

  await connectDatabase();
  await seedQuestionnaire();
  const now = new Date();
  await collection('users').updateOne(
    { email: 'demo-admin@local.invalid' },
    {
      $set: {
        name: 'Synthetic Local Admin',
        email: 'demo-admin@local.invalid',
        password_hash: await bcrypt.hash(password, 12),
        specialization: 'Demo administration',
        license_number: null,
        role: 'admin',
        is_verified: true,
        is_synthetic: true,
        is_active: true,
        updated_at: now
      },
      $setOnInsert: { _id: randomUUID(), created_at: now }
    },
    { upsert: true }
  );
  console.log('Questionnaire data and the synthetic local administrator are ready. Password was not printed.');
}

main()
  .catch(() => {
    console.error('MongoDB demo seeding failed. Check MONGODB_URI and the required environment settings.');
    process.exitCode = 1;
  })
  .finally(closeDatabase);
