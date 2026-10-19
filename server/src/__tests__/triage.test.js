const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { assessTriage } = require('../utils/triage');

describe('Clinical triage red flags', () => {
  it('flags severe breathing difficulty as an emergency', () => {
    const result = assessTriage({
      breathing_difficulty: 'severe'
    });

    assert.equal(result.urgency_level, 'emergency');
    assert.equal(result.red_flags.length, 1);
  });

  it('keeps non-red-flag responses routine', () => {
    const result = assessTriage({
      breathing_difficulty: 'none'
    });

    assert.equal(result.urgency_level, 'routine');
    assert.equal(result.red_flags.length, 0);
  });
});
