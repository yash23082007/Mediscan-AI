const { assessTriage } = require('../utils/triage');

describe('Clinical triage red flags', () => {
  test('flags severe breathing difficulty as an emergency', () => {
    const result = assessTriage({
      breathing_difficulty: 'severe'
    });

    expect(result.urgency_level).toBe('emergency');
    expect(result.red_flags).toHaveLength(1);
  });

  test('keeps non-red-flag responses routine', () => {
    const result = assessTriage({
      breathing_difficulty: 'none'
    });

    expect(result.urgency_level).toBe('routine');
    expect(result.red_flags).toHaveLength(0);
  });
});
