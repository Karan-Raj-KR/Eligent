// Turns the engine's arithmetic into a sentence a student can act on.
//
// The engine reports a gap as { amount, unit, direction } and deliberately has
// no .message field — building the prose is the UI's job. It also does plain
// floating-point subtraction, so 8.5 - 8.2 arrives as 0.2999999999999998 and
// must be rounded before anyone sees it.

import type { Failed } from "@opportunity/engine";

const INR = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** Trims float noise without inventing precision: 0.2999999999999998 -> "0.3". */
function tidy(n: number): string {
  return String(Math.round(n * 100) / 100);
}

function money(n: number): string {
  return `₹${INR.format(Math.round(n))}`;
}

function withUnit(amount: number, unit: string): string {
  if (unit === "INR") return money(amount);
  if (unit === "percentage") return `${tidy(amount)}%`;
  if (unit === "years") return `${tidy(amount)} ${amount === 1 ? "year" : "years"}`;
  return `${tidy(amount)} ${unit}`;
}

/**
 * The threshold, in the same units as the gap. Symbol units (%, ₹) repeat
 * naturally; a word unit does not — "0.3 points short of 7.5" reads, "0.3 points
 * short of 7.5 points" does not.
 */
function threshold(value: Failed["requirement"], unit: string): string | null {
  if (typeof value !== "number") return null;
  if (unit === "INR" || unit === "percentage") return withUnit(value, unit);
  return tidy(value);
}

/**
 * "₹40,000 over the ₹6,00,000 limit" / "3% short of 75%".
 * Returns null when there is no numeric gap — a categorical or unknown failure,
 * which is a rejection reason, not a distance.
 */
export function gapSentence(failed: Failed): string | null {
  if (!failed.gap) return null;
  const { amount, unit, direction } = failed.gap;
  const distance = withUnit(amount, unit);
  const limit = threshold(failed.requirement, unit);

  if (direction === "over") {
    if (!limit) return `${distance} over the limit`;
    // "₹40,000 over the ₹6,00,000 limit" reads; "2 years over the 1 limit" does not.
    const symbolic = unit === "INR" || unit === "percentage";
    return symbolic ? `${distance} over the ${limit} limit` : `${distance} over the limit of ${limit}`;
  }
  return limit ? `${distance} short of ${limit}` : `${distance} short`;
}

/** "You have 72%" — the student's own value, for context next to the gap. */
export function profileValueLabel(failed: Failed): string | null {
  const { profileValue, gap } = failed;
  if (profileValue === null || profileValue === undefined) return null;
  if (typeof profileValue !== "number") return String(profileValue);
  return gap ? withUnit(profileValue, gap.unit) : String(profileValue);
}

/** Why a criterion failed when there is no arithmetic to show. */
export function failureReason(failed: Failed): string {
  if (failed.requirement === "unknown") {
    return "Your profile is missing this detail, so we could not check it.";
  }
  const req = Array.isArray(failed.requirement)
    ? failed.requirement.join(", ")
    : String(failed.requirement);
  const have = failed.profileValue === null || failed.profileValue === undefined ? "nothing set" : String(failed.profileValue);
  return `Requires ${req}; your profile says ${have}.`;
}

// ---------------------------------------------------------------------------
// Structured gap, for the near_miss hero
// ---------------------------------------------------------------------------

/** Human names for the profile fields the engine reports on. Display only. */
const FIELD_LABELS: Record<string, string> = {
  cgpa: "CGPA",
  percentage: "Class 12 percentage",
  year_of_study: "year of study",
  annual_family_income: "annual family income",
  branch: "branch",
  state: "state",
  institution_type: "institution type",
  category: "category",
  gender: "gender",
  full_name: "name",
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, " ");
}

export interface GapParts {
  /** "8.0 CGPA" — the threshold, in context. */
  need: string;
  /** "7.8" — what the student actually has. */
  have: string | null;
  /** "0.2 short" / "₹40,000 over" — the distance, on its own. */
  delta: string;
  direction: "short" | "over";
  /** "You need 8.0 CGPA — you have 7.8. You're 0.2 short." */
  sentence: string;
}

/**
 * Splits a numeric gap into the pieces a card needs to typeset separately, so
 * the number can be the largest thing on the card. Returns null when there is
 * no arithmetic to show — a categorical or unknown failure is a reason, not a
 * distance.
 */
export function describeGap(failed: Failed): GapParts | null {
  const gap = failed.gap;
  if (!gap) return null;
  if (typeof failed.requirement !== "number") return null;

  const label = fieldLabel(failed.field);
  // "75% Class 12 percentage" reads; "7.5 points CGPA" does not — the label
  // already carries the unit for word-unit fields. Symbol units keep theirs.
  const symbolic = gap.unit === "INR" || gap.unit === "percentage";
  const need = symbolic
    ? `${withUnit(failed.requirement, gap.unit)} ${label}`
    : `${tidy(failed.requirement)} ${label}`;
  // Same rule for the student's own value: "7.2", not "7.2 points", so it reads
  // against "7.5 CGPA". The delta keeps its unit — it stands alone.
  const have =
    typeof failed.profileValue === "number"
      ? symbolic
        ? withUnit(failed.profileValue, gap.unit)
        : tidy(failed.profileValue)
      : profileValueLabel(failed);
  const delta = `${withUnit(gap.amount, gap.unit)} ${gap.direction}`;

  const opening = gap.direction === "over" ? `The limit is ${need}` : `You need ${need}`;
  const middle = have ? ` — you have ${have}.` : ".";
  const sentence = `${opening}${middle} You're ${delta}.`;

  return { need, have, delta, direction: gap.direction, sentence };
}
