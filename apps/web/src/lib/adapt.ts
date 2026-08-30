// Translates our API's shapes into the shapes the UI renders.
//
// The engine (packages/engine, off limits) already decided eligibility
// server-side; this file only *presents* that decision. It performs no
// eligibility logic of its own — no thresholds, no tolerances, no re-deciding.
// Every string it builds is derived from values the API actually returned.

import { inrCompact } from "@/lib/format";
import type {
  CriterionResult,
  CriterionStatus,
  EligibilityCriterion,
  MatchCounts,
  MatchGroups,
  MatchResult,
  MatchStatus,
  Requirement,
  Scholarship,
  UserProfile,
} from "@/lib/types";

/* ---------------------------------------------------------------- API types -- */

export interface ApiCriterion {
  id?: string;
  field: string;
  operator: string;
  value: number | string | Array<number | string>;
  display_text?: string | null;
  source_text?: string | null;
}

export interface ApiEvaluationEntry {
  field: string;
  displayText?: string;
  profileValue: number | string | boolean | null | undefined;
  requirement: number | string | Array<number | string> | "unknown";
  gap?: { amount: number; unit: string; direction: "short" | "over" };
}

export interface ApiEvaluation {
  status: "eligible" | "near_miss" | "rejected";
  passed: ApiEvaluationEntry[];
  failed: ApiEvaluationEntry[];
}

export interface ApiOpportunity {
  id: string;
  name: string;
  provider: string | null;
  url: string;
  deadline: string | null;
  amount: string | null;
  official_documents?: string[] | null;
}

export interface ApiMatch {
  opportunity: ApiOpportunity;
  evaluation: ApiEvaluation;
  criteria: ApiCriterion[];
}

export interface ApiMatchesResponse {
  eligible: ApiMatch[];
  near_miss: ApiMatch[];
  rejected: ApiMatch[];
}

export interface ApiProfile {
  full_name: string | null;
  cgpa: number | null;
  percentage: number | null;
  year_of_study: number | null;
  branch: string | null;
  state: string | null;
  annual_family_income: number | null;
  institution_type: string | null;
  category: string | null;
  gender: string | null;
}

export interface ApiRequirement {
  id: string;
  document_type: string;
  source: string;
  user_has: boolean | null;
}

/* ------------------------------------------------------------- presentation -- */

/** Short column labels. Unknown fields fall back to a de-snaked version. */
const SHORT: Record<string, string> = {
  cgpa: "CGPA",
  percentage: "Percentage",
  year_of_study: "Year",
  branch: "Branch",
  state: "Domicile",
  annual_family_income: "Family income",
  institution_type: "Institute",
  category: "Category",
  gender: "Gender",
};

function shortLabel(field: string): string {
  return SHORT[field] ?? field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const OPERATOR_SYMBOL: Record<string, string> = {
  gte: "≥",
  lte: "≤",
  eq: "=",
  in: "∈",
  not_in: "∉",
  between: "within",
};

/** Formats a value for display, using the field's natural unit. */
function fmt(field: string, value: unknown): string {
  if (value === null || value === undefined) return "not set";
  if (Array.isArray(value)) return value.join(" / ");
  if (field === "annual_family_income" && typeof value === "number") return inrCompact(value);
  if (field === "percentage" && typeof value === "number") return `${value}%`;
  return String(value);
}

/** "0.6 points short" / "₹50k over" — straight from the engine's gap arithmetic. */
function gapPhrase(gap: NonNullable<ApiEvaluationEntry["gap"]>): string {
  if (gap.unit === "INR") return `${inrCompact(gap.amount)} ${gap.direction}`;
  const n = Math.round(gap.amount * 100) / 100;
  // "1 years over" reads like a bug; singularise the countable units.
  const unit = n === 1 && gap.unit.endsWith("s") ? gap.unit.slice(0, -1) : gap.unit;
  return `${n} ${unit} ${gap.direction}`;
}

function toCriterion(field: string, apiCriteria: ApiCriterion[], displayText?: string): EligibilityCriterion {
  const source = apiCriteria.find(
    (c) => c.field === field && (!displayText || c.display_text === displayText),
  );
  return {
    id: source?.id ?? `${field}:${displayText ?? ""}`,
    kind: field,
    operator: (source?.operator as EligibilityCriterion["operator"]) ?? "eq",
    value: source?.value ?? "",
    label: displayText ?? source?.display_text ?? shortLabel(field),
    short: shortLabel(field),
    sourceText: source?.source_text ?? undefined,
  };
}

function toResult(
  entry: ApiEvaluationEntry,
  status: CriterionStatus,
  apiCriteria: ApiCriterion[],
): CriterionResult {
  const criterion = toCriterion(entry.field, apiCriteria, entry.displayText);
  const symbol = OPERATOR_SYMBOL[criterion.operator] ?? "";
  const actual = fmt(entry.field, entry.profileValue);
  const required = entry.requirement === "unknown" ? "not stated" : fmt(entry.field, entry.requirement);

  // A passing row reads as the true statement it is ("CGPA 8.4 ≥ 8"). A failing
  // one must not: "Family income ₹3L ≤ ₹2L" asserts something false, so failures
  // state the value and what was required instead.
  const comparison = (
    status === "pass"
      ? `${criterion.short} ${actual} ${symbol} ${required}`
      : `${criterion.short} ${actual} · requires ${symbol === "=" ? "" : symbol} ${required}`
  )
    .replace(/\s+/g, " ")
    .trim();
  const reason = entry.gap
    ? gapPhrase(entry.gap)
    : status === "pass"
      ? "Meets this criterion"
      : entry.requirement === "unknown"
        ? "Your profile is missing this detail"
        : criterion.label;

  return {
    criterion,
    status,
    comparison,
    reason,
    detail: criterion.label,
    actual,
    required,
  };
}

const STATUS_MAP: Record<ApiEvaluation["status"], MatchStatus> = {
  eligible: "ELIGIBLE",
  near_miss: "NEAR_MISS",
  rejected: "NOT_ELIGIBLE",
};

export function toScholarship(o: ApiOpportunity, criteria: ApiCriterion[]): Scholarship {
  return {
    id: o.id,
    title: o.name,
    provider: o.provider ?? "Provider not stated",
    amount: o.amount,
    deadline: o.deadline,
    url: o.url,
    // summary/cadence/openFor are not columns our API returns — left undefined
    // rather than invented. The UI treats them as optional.
    officialRequirements: (o.official_documents ?? []).map((label, i) => ({
      id: `${o.id}-official-${i}`,
      label,
      source: "official" as const,
    })),
    communityRequirements: [],
    criteria: criteria.map((c) => toCriterion(c.field, criteria, c.display_text ?? undefined)),
  };
}

export function toMatch(m: ApiMatch): MatchResult {
  const status = STATUS_MAP[m.evaluation.status];
  // The engine's near_miss means every failure is inside tolerance, so in a
  // near_miss evaluation the failures ARE the near misses. We do not re-derive
  // that per criterion — we read the verdict the engine already returned.
  const failStatus: CriterionStatus = status === "NEAR_MISS" ? "near" : "fail";

  const passed = m.evaluation.passed.map((e) => toResult(e, "pass", m.criteria));
  const failed = m.evaluation.failed.map((e) => toResult(e, failStatus, m.criteria));

  return {
    scholarship: toScholarship(m.opportunity, m.criteria),
    status,
    results: [...passed, ...failed],
    failures: failed.filter((r) => r.status === "fail"),
    nearMisses: failed.filter((r) => r.status === "near"),
  };
}

export function toGroups(res: ApiMatchesResponse): MatchGroups {
  return {
    eligible: (res.eligible ?? []).map(toMatch),
    nearMiss: (res.near_miss ?? []).map(toMatch),
    notEligible: (res.rejected ?? []).map(toMatch),
  };
}

export function toCounts(groups: MatchGroups): MatchCounts {
  return {
    eligible: groups.eligible.length,
    nearMiss: groups.nearMiss.length,
    notEligible: groups.notEligible.length,
    total: groups.eligible.length + groups.nearMiss.length + groups.notEligible.length,
  };
}

/* ------------------------------------------------------------------ profile -- */

const INSTITUTION_TYPES = ["Government", "Private", "Aided"] as const;
const CATEGORIES = ["General", "OBC", "SC", "ST", "EWS", "Other"] as const;

function titleCase(v: string): string {
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

export function toUserProfile(p: ApiProfile | null): UserProfile | null {
  if (!p) return null;
  // A profile without the fields the engine needs is not usable yet.
  if (p.cgpa === null || p.year_of_study === null || p.annual_family_income === null) return null;

  const institution = titleCase(p.institution_type ?? "");
  const category = (p.category ?? "").toUpperCase();

  return {
    name: p.full_name ?? "",
    cgpa: p.cgpa,
    year: p.year_of_study,
    branch: p.branch ?? "",
    state: p.state ?? "",
    income: p.annual_family_income,
    institutionType: (INSTITUTION_TYPES as readonly string[]).includes(institution)
      ? (institution as UserProfile["institutionType"])
      : "Private",
    category: (CATEGORIES as readonly string[]).includes(category)
      ? (category as UserProfile["category"])
      : ((CATEGORIES as readonly string[]).includes(titleCase(p.category ?? ""))
          ? (titleCase(p.category ?? "") as UserProfile["category"])
          : "General"),
    percentage: p.percentage,
    gender: p.gender,
  };
}

export function fromUserProfile(u: UserProfile): Record<string, unknown> {
  return {
    full_name: u.name,
    cgpa: u.cgpa,
    year_of_study: u.year,
    branch: u.branch,
    state: u.state,
    annual_family_income: u.income,
    institution_type: u.institutionType,
    category: u.category,
    percentage: u.percentage ?? null,
    gender: u.gender ?? null,
  };
}

export function toRequirement(r: ApiRequirement): Requirement {
  const match = /^(.*?)\s*\(reported by (\d+)\)$/.exec(r.document_type);
  return {
    id: r.id,
    label: match ? match[1] : r.document_type,
    source: r.source === "community" ? "community" : "official",
    communityReportCount: match ? Number(match[2]) : undefined,
  };
}
