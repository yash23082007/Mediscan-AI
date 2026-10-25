const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseQuestionnaireSeed } = require('../../scripts/initialize-database');

const seedSql = fs.readFileSync(path.resolve(__dirname, '../../../database/seed.sql'), 'utf8');

describe('MongoDB questionnaire bootstrap', () => {
  it('parses the questionnaire definitions and root node from the checked-in seed', () => {
    const nodes = parseQuestionnaireSeed(seedSql);
    const codes = new Set(nodes.map(node => node.code));
    assert.ok(nodes.length >= 10);
    assert.ok(codes.has('primary_concern'));
    assert.ok(nodes.every(node => Array.isArray(node.options) && node.options.length > 0));
  });

  it('rejects an incomplete seed instead of silently initializing an empty questionnaire', () => {
    assert.throws(() => parseQuestionnaireSeed(''), /missing its root node/);
  });
});
