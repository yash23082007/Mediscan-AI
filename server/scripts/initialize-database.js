const fs = require('node:fs/promises');
const path = require('node:path');
const { connectDatabase, collection, closeDatabase } = require('../src/config/database');

const repoRoot = path.resolve(__dirname, '../..');

function splitSqlList(input) {
  const values = [];
  let start = 0;
  let depth = 0;
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === "'" && input[index + 1] === "'") {
        index += 1;
      } else if (character === "'") {
        quoted = false;
      }
      continue;
    }
    if (character === "'") quoted = true;
    else if (character === '(') depth += 1;
    else if (character === ')') depth -= 1;
    else if (character === ',' && depth === 0) {
      values.push(input.slice(start, index).trim());
      start = index + 1;
    }
  }
  values.push(input.slice(start).trim());
  return values;
}

function readTupleGroups(valuesSql) {
  const tuples = [];
  let depth = 0;
  let quoted = false;
  let start = -1;
  for (let index = 0; index < valuesSql.length; index += 1) {
    const character = valuesSql[index];
    if (quoted) {
      if (character === "'" && valuesSql[index + 1] === "'") index += 1;
      else if (character === "'") quoted = false;
      continue;
    }
    if (character === "'") quoted = true;
    else if (character === '(') {
      if (depth === 0) start = index + 1;
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
      if (depth === 0 && start >= 0) tuples.push(valuesSql.slice(start, index));
    }
  }
  return tuples;
}

function parseSqlValue(value, column) {
  if (/^null$/i.test(value)) return null;
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith("'") && value.endsWith("'")) {
    const text = value.slice(1, -1).replace(/''/g, "'");
    if (['options', 'next_node_logic', 'condition_weights'].includes(column)) return JSON.parse(text);
    return text;
  }
  throw new Error(`Unsupported questionnaire seed value for ${column}`);
}

function parseQuestionnaireSeed(sql) {
  const pattern = /INSERT\s+INTO\s+decision_tree_nodes\s*\(([^)]+)\)\s*VALUES([\s\S]*?)\s*ON\s+CONFLICT/gi;
  const nodes = new Map();
  for (const match of sql.matchAll(pattern)) {
    const columns = match[1].split(',').map(column => column.trim());
    for (const tuple of readTupleGroups(match[2])) {
      const fields = splitSqlList(tuple);
      if (fields.length !== columns.length) throw new Error('Questionnaire seed column count mismatch');
      const node = Object.fromEntries(columns.map((column, index) => [column, parseSqlValue(fields[index], column)]));
      node.is_active = true;
      nodes.set(node.code, node);
    }
  }
  if (!nodes.size || !nodes.has('primary_concern')) throw new Error('Questionnaire seed is missing its root node');
  return [...nodes.values()];
}

async function seedQuestionnaire() {
  const source = await fs.readFile(path.join(repoRoot, 'database/seed.sql'), 'utf8');
  const nodes = parseQuestionnaireSeed(source);
  await collection('decision_tree_nodes').bulkWrite(nodes.map(node => ({
    updateOne: {
      filter: { code: node.code },
      update: { $set: node, $setOnInsert: { created_at: new Date() } },
      upsert: true
    }
  })), { ordered: true });
  return nodes.length;
}

async function initializeDatabase() {
  await connectDatabase();
  const count = await seedQuestionnaire();
  console.log(`MongoDB connected; ${count} questionnaire definitions verified.`);
}

if (require.main === module) {
  initializeDatabase()
    .catch(() => {
      console.error('MongoDB initialization failed. Check MONGODB_URI, database access, and network allowlisting.');
      process.exitCode = 1;
    })
    .finally(closeDatabase);
}

module.exports = { initializeDatabase, seedQuestionnaire, parseQuestionnaireSeed };
