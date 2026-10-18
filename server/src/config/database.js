const { Pool } = require('pg');

// Build connection config from environment
const getConnectionConfig = () => {
  // Support DATABASE_URL (Render, Heroku, etc.) or individual vars
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'medical_diagnosis',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
};

const pool = new Pool(getConnectionConfig());

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
});

/**
 * Execute a SQL query against the real Postgres database.
 * No mock fallback — if Postgres is down, the error propagates.
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Query executed in ${duration}ms — rows: ${result.rowCount}`);
    }
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`❌ Query failed after ${duration}ms:`, err.message);
    throw err;
  }
};

/**
 * Execute multiple queries inside a single Postgres transaction.
 * Automatically rolls back on error.
 *
 * Usage:
 *   const result = await withTransaction(async (tx) => {
 *     await tx.query('INSERT INTO ...', [...]);
 *     await tx.query('UPDATE ...', [...]);
 *     return { ok: true };
 *   });
 */
const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn({
      query: (text, params) => client.query(text, params),
    });
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Health check — verify the database is reachable.
 */
const checkHealth = async () => {
  try {
    const result = await pool.query('SELECT 1 AS ok');
    return { status: 'healthy', latencyMs: 0 };
  } catch (err) {
    return { status: 'unhealthy', error: err.message };
  }
};

module.exports = { pool, query, withTransaction, checkHealth };
