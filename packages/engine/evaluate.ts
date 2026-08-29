// Pure eligibility evaluation. No runtime imports — safe to run anywhere.
// packages/engine has ZERO LLM calls: eligibility is arithmetic (see CLAUDE.md).

export type Operator = 'gte' | 'lte' | 'eq' | 'in' | 'not_in' | 'between';

export type CriterionValue = number | string | Array<number | string>;

export interface Criterion {
  field: string;
  operator: Operator;
  /** gte/lte/eq: scalar. in/not_in: array. between: [min, max]. */
  value: CriterionValue;
  display_text?: string;
  source_text?: string;
}

export type ProfileValue = number | string | boolean | null | undefined;
export type Profile = Record<string, ProfileValue>;

export interface Gap {
  amount: number;
  unit: string;
  /** 'short': profile value must rise to meet the threshold. 'over': it must fall. */
  direction: 'short' | 'over';
}

export interface Passed {
  field: string;
  displayText?: string;
  profileValue: ProfileValue;
  requirement: CriterionValue;
}

/** requirement is 'unknown' only for a failure caused by missing/unusable profile data. */
export type FailedRequirement = CriterionValue | 'unknown';

export interface Failed extends Omit<Passed, 'requirement'> {
  requirement: FailedRequirement;
  gap?: Gap;
}

export interface Evaluation {
  status: 'eligible' | 'near_miss' | 'rejected';
  passed: Passed[];
  failed: Failed[];
}

const UNITS: Record<string, string> = {
  cgpa: 'points',
  annual_family_income: 'INR',
  year_of_study: 'years',
};

const NEAR_MISS_TOLERANCE = 0.1;

/** A well-formed `between` value: exactly two finite numbers. */
function isNumericPair(value: CriterionValue): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((v) => typeof v === 'number' && Number.isFinite(v))
  );
}

function gapTo(field: string, from: number, to: number): Gap {
  return {
    amount: Math.abs(to - from),
    unit: UNITS[field] ?? field,
    direction: to > from ? 'short' : 'over',
  };
}

function withinTolerance(gap: Gap, threshold: number): boolean {
  return gap.amount <= Math.abs(threshold) * NEAR_MISS_TOLERANCE;
}

function isYearShortByOne(field: string, gap: Gap): boolean {
  return field === 'year_of_study' && gap.amount === 1 && gap.direction === 'short';
}

type Check =
  | { ok: true }
  | { ok: false; unknown: true }
  | { ok: false; gap?: Gap; within10pct: boolean; yearShortByOne: boolean };

function fail(field: string, from: number, to: number): Check {
  const gap = gapTo(field, from, to);
  return { ok: false, gap, within10pct: withinTolerance(gap, to), yearShortByOne: isYearShortByOne(field, gap) };
}

function check(profile: Profile, c: Criterion): Check {
  const pv = profile[c.field];
  if (pv === undefined || pv === null) return { ok: false, unknown: true };

  switch (c.operator) {
    case 'gte':
    case 'lte':
    case 'eq': {
      const t = c.value;
      if (typeof t === 'number') {
        if (typeof pv !== 'number' || !Number.isFinite(pv)) return { ok: false, unknown: true };
        const ok = c.operator === 'gte' ? pv >= t : c.operator === 'lte' ? pv <= t : pv === t;
        return ok ? { ok: true } : fail(c.field, pv, t);
      }
      // Non-numeric eq (or gte/lte misapplied to a string): categorical, never a near miss.
      return pv === t ? { ok: true } : { ok: false, within10pct: false, yearShortByOne: false };
    }

    case 'between': {
      // criterion.value arrives from a jsonb column. A malformed shape would
      // otherwise destructure to undefined, make both comparisons false, and
      // silently return ok:true — passing a criterion that should have failed.
      if (!isNumericPair(c.value)) return { ok: false, unknown: true };
      const [min, max] = c.value;
      if (typeof pv !== 'number' || !Number.isFinite(pv)) return { ok: false, unknown: true };
      if (pv < min) return fail(c.field, pv, min);
      if (pv > max) return fail(c.field, pv, max);
      return { ok: true };
    }

    case 'in':
    case 'not_in': {
      // Same jsonb provenance: a non-array here used to throw
      // "list.includes is not a function" in the middle of a request.
      if (!Array.isArray(c.value)) return { ok: false, unknown: true };
      const list = c.value;
      const found = list.includes(pv as number | string);
      const ok = c.operator === 'in' ? found : !found;
      return ok ? { ok: true } : { ok: false, within10pct: false, yearShortByOne: false };
    }
  }
}

export function evaluate(profile: Profile, criteria: Criterion[]): Evaluation {
  const passed: Passed[] = [];
  const failed: Failed[] = [];
  // Tracked per numeric failure; a categorical or unknown failure disqualifies near_miss outright.
  let allNumericWithin10pct = true;
  let hasHardFailure = false;

  for (const criterion of criteria) {
    const result = check(profile, criterion);
    const entry = {
      field: criterion.field,
      displayText: criterion.display_text,
      profileValue: profile[criterion.field],
      requirement: criterion.value,
    };
    if (result.ok) {
      passed.push(entry);
      continue;
    }
    // Missing/non-numeric profile data is conservative: always a hard failure, never near_miss.
    if ('unknown' in result) {
      failed.push({ ...entry, requirement: 'unknown' });
      hasHardFailure = true;
    } else {
      failed.push(result.gap ? { ...entry, gap: result.gap } : entry);
      if (!result.gap) hasHardFailure = true; // categorical
      allNumericWithin10pct &&= result.within10pct;
    }
  }

  // near_miss requires every failure to be numeric and within 10%, OR the sole failure
  // in the whole set to be year_of_study short by exactly one.
  const soleYearShortByOne =
    failed.length === 1 && failed[0].gap !== undefined && isYearShortByOne(failed[0].field, failed[0].gap);
  const isNear = !hasHardFailure && failed.length > 0 && (allNumericWithin10pct || soleYearShortByOne);

  return {
    status: failed.length === 0 ? 'eligible' : isNear ? 'near_miss' : 'rejected',
    passed,
    failed,
  };
}
