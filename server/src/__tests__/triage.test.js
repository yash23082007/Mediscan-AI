const { assessTriage } = require('../utils/triage');

describe('Clinical triage red flags', () => {
  test('flags severe breathing difficulty as urgent', () => {
    const result = assessTriage({
      'q0000000-0000-0000-0000-000000000008': 'severe'
    });

    expect(result.level).toBe('urgent');
    expect(result.redFlags).toHaveLength(1);
  });

  test('keeps non-red-flag responses routine', () => {
    const result = assessTriage({
      'q0000000-0000-0000-0000-000000000008': 'none'
    });

    expect(result.level).toBe('routine');
    expect(result.redFlags).toHaveLength(0);
  });
});
