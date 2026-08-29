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
