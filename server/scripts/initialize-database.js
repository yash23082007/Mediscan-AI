const fs = require('node:fs/promises')
const path = require('node:path')
const { pool } = require('../src/config/database')

const repoRoot = path.resolve(__dirname, '../..')

async function initializeDatabase() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock($1)', [731904221])

    const { rows } = await client.query("SELECT to_regclass('public.patients') AS patients")
    if (!rows[0].patients) {
      const schema = await fs.readFile(path.join(repoRoot, 'database/schema.sql'), 'utf8')
      const seed = await fs.readFile(path.join(repoRoot, 'database/seed.sql'), 'utf8')
      await client.query(schema)
      await client.query(seed)
      console.log('Database schema and questionnaire seed initialized.')
    } else {
      const { rows: questions } = await client.query('SELECT COUNT(*)::int AS count FROM decision_tree_nodes')
      if (questions[0].count === 0) {
        const seed = await fs.readFile(path.join(repoRoot, 'database/seed.sql'), 'utf8')
        await client.query(seed)
        console.log('Questionnaire seed initialized.')
      }
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

initializeDatabase().catch(error => {
  console.error('Database initialization failed:', error.message)
  process.exitCode = 1
})
