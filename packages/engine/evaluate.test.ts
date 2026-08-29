import { describe, expect, it } from 'vitest';
import { evaluate, type Criterion, type Profile } from './evaluate';

const profile: Profile = {
  full_name: 'A',
  cgpa: 8.5,
  year_of_study: 3,
  branch: 'CSE',
  state: 'Karnataka',
  annual_family_income: 300000,
  institution_type: 'government',
  category: 'general',
};

const c = (field: string, operator: Criterion['operator'], value: Criterion['value']): Criterion =>
  ({ field, operator, value, display_text: `${field} ${operator} ${value}` });

describe('evaluate', () => {
  it('is eligible when every criterion passes', () => {
    const r = evaluate(profile, [
      c('cgpa', 'gte', 7),
      c('annual_family_income', 'lte', 800000),
      c('state', 'in', ['Karnataka', 'Kerala']),
      c('branch', 'not_in', ['Arts']),
      c('year_of_study', 'between', [1, 4]),
      c('institution_type', 'eq', 'government'),
    ]);
    expect(r.status).toBe('eligible');
    expect(r.failed).toHaveLength(0);
    expect(r.passed).toHaveLength(6);
  });

  it('is a near miss when the only numeric failure is within 10%', () => {
    const r = evaluate(profile, [c('cgpa', 'gte', 9), c('state', 'in', ['Karnataka'])]);
    expect(r.status).toBe('near_miss');
    expect(r.failed[0].gap).toEqual({ amount: 0.5, unit: 'points', direction: 'short' });
    expect(r.failed[0].requirement).toBe(9);
    expect(r.passed).toHaveLength(1);
  });

  it('rejects a numeric failure beyond 10%', () => {
    const r = evaluate(profile, [c('cgpa', 'gte', 9.5)]);
    expect(r.status).toBe('rejected');
    expect(r.failed[0].gap?.amount).toBeCloseTo(1);
  });

  it('computes the gap arithmetically, direction over for an income ceiling', () => {
    const r = evaluate({ ...profile, annual_family_income: 820000 }, [
      c('annual_family_income', 'lte', 800000),
    ]);
    expect(r.status).toBe('near_miss');
    expect(r.failed[0].gap).toEqual({ amount: 20000, unit: 'INR', direction: 'over' });
  });

  it('treats year_of_study short by exactly one as near miss', () => {
    const r = evaluate(profile, [c('year_of_study', 'gte', 4)]);
    expect(r.status).toBe('near_miss');
    expect(r.failed[0].gap).toEqual({ amount: 1, unit: 'years', direction: 'short' });

    // Two years short is not forgiven, and 10% of 5 would not cover it either.
    expect(evaluate(profile, [c('year_of_study', 'gte', 5)]).status).toBe('rejected');
    // Too senior: being over the cap is not a "short by one" case.
    expect(evaluate(profile, [c('year_of_study', 'lte', 2)]).status).toBe('rejected');
  });

  it('never calls a categorical failure a near miss', () => {
    for (const criterion of [
      c('state', 'in', ['Kerala']),
      c('branch', 'not_in', ['CSE']),
      c('category', 'eq', 'obc'),
      c('institution_type', 'eq', 'private'),
    ]) {
      const r = evaluate(profile, [criterion, c('cgpa', 'gte', 7)]);
      expect(r.status).toBe('rejected');
      expect(r.failed[0].gap).toBeUndefined();
    }
  });

  it('two simultaneous numeric failures both within 10% are still a near miss', () => {
    const r = evaluate(profile, [c('cgpa', 'gte', 9), c('annual_family_income', 'lte', 290000)]);
    expect(r.status).toBe('near_miss');
    expect(r.failed).toHaveLength(2);
  });

  it('two simultaneous failures: rejected when the year-short-by-one exception no longer applies alone', () => {
    // year_of_study's gap (1) exceeds 10% of its own threshold (4), so it only rescues a
    // status when it is the *sole* failure. With a second failure present, it does not.
    const r = evaluate(profile, [c('cgpa', 'gte', 9), c('year_of_study', 'gte', 4)]);
    expect(r.status).toBe('rejected');
    expect(r.failed).toHaveLength(2);
  });

  it('mixing a near miss with a categorical failure still rejects', () => {
    const r = evaluate(profile, [c('cgpa', 'gte', 9), c('state', 'in', ['Kerala'])]);
    expect(r.status).toBe('rejected');
    expect(r.failed).toHaveLength(2);
  });

  it('a missing profile field is a failure with requirement "unknown" and forces rejected, never near_miss', () => {
    const r = evaluate({ ...profile, category: null }, [
      c('category', 'eq', 'sc_st'),
      c('disability', 'eq', 'yes'), // field absent from profile entirely
      c('cgpa', 'gte', 7),
    ]);
    expect(r.status).toBe('rejected');
    expect(r.failed.map((f) => f.requirement)).toEqual(['unknown', 'unknown']);
    expect(r.failed[0].profileValue).toBeNull();
    expect(r.failed[0].gap).toBeUndefined();
  });

  it('treats a non-numeric value for a numeric criterion as unknown, not a near miss', () => {
    const r = evaluate({ ...profile, cgpa: 'first class' as never }, [c('cgpa', 'gte', 8.6)]);
    expect(r.status).toBe('rejected');
    expect(r.failed[0].requirement).toBe('unknown');
  });

  // --- malformed criterion.value (it arrives from a jsonb column) ---

  describe('malformed criterion values fail as unknown', () => {
    const malformedBetween: Array<[string, Criterion['value']]> = [
      ['not an array', 5],
      ['one element', [5]],
      ['three elements', [1, 2, 3]],
      ['non-numeric members', ['1', '2']],
    ];

    for (const [label, value] of malformedBetween) {
      it(`between with ${label} is rejected, never silently passed`, () => {
        const r = evaluate(profile, [c('cgpa', 'between', value)]);
        expect(r.status).toBe('rejected');
        expect(r.failed).toHaveLength(1);
        expect(r.failed[0].requirement).toBe('unknown');
        expect(r.failed[0].gap).toBeUndefined();
      });
    }

    it('between with a well-formed pair still works', () => {
      expect(evaluate(profile, [c('cgpa', 'between', [8, 9])]).status).toBe('eligible');
      // 8.5 against a floor of 9 is a 0.5 gap on a 9 threshold — inside 10%.
      expect(evaluate(profile, [c('cgpa', 'between', [9, 10])]).status).toBe('near_miss');
      // 300000 against a floor of 500000 is far outside it.
      expect(evaluate(profile, [c('annual_family_income', 'between', [500000, 800000])]).status).toBe('rejected');
    });

    it('in with a non-array value fails as unknown instead of throwing', () => {
      const r = evaluate(profile, [c('branch', 'in', 'CSE' as never)]);
      expect(r.status).toBe('rejected');
      expect(r.failed[0].requirement).toBe('unknown');
    });

    it('not_in with a non-array value fails as unknown instead of throwing', () => {
      const r = evaluate(profile, [c('branch', 'not_in', 42 as never)]);
      expect(r.status).toBe('rejected');
      expect(r.failed[0].requirement).toBe('unknown');
    });

    it('a malformed value never rescues a near miss', () => {
      const r = evaluate(profile, [c('cgpa', 'gte', 8.6), c('branch', 'in', 'CSE' as never)]);
      expect(r.status).toBe('rejected');
    });
  });
});
