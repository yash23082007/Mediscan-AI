const { Pool } = require('pg');

// Build connection config from environment
const getConnectionConfig = () => {
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
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'medical_diagnosis',
    password: process.env.DB_PASSWORD || 'postgres123',
    port: parseInt(process.env.DB_PORT) || 5432,
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
};

const pool = new Pool(getConnectionConfig());

// Log pool errors
pool.on('error', (err) => {
  console.error('[FATAL] Unexpected PostgreSQL client pool error:', err.message);
});

/**
 * Execute a query with parameters
 * Fails honestly if database is unreachable (F1).
 *
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<object>} Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 200) {
      console.warn(`[SLOW QUERY] ${duration}ms: ${text.slice(0, 80)}...`);
    }
    return res;
  } catch (err) {
    console.error(`[DB ERROR] Query failed: ${err.message}\nQuery: ${text}`);
    throw err;
  }
};

/**
 * Get a client from the pool for transactions
 */
const getClient = async () => {
  const client = await pool.connect();
  return client;
};

/**
 * Helper to run a callback inside an atomic database transaction (C1)
 *
 * @param {Function} callback - Async function that receives the client
 * @returns {Promise<any>} Result of the callback
 */
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  query,
  getClient,
  withTransaction,
  pool
};
