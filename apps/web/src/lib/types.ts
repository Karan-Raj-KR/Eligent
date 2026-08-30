// Shapes the UI renders. Adapted from the teammate's prototype types so his
// components render unchanged, but widened where our real API differs from his
// mock data. Every divergence is deliberate and noted — nothing is invented to
// satisfy a shape.

/** Our profile columns, not a closed union: the engine accepts any field. */
export type CriterionKind = string;

/** Mirrors packages/engine Operator. */
export type CriterionOperator = "gte" | "lte" | "eq" | "in" | "not_in" | "between";

export interface EligibilityCriterion {
  id: string;
  kind: CriterionKind;
  operator: CriterionOperator;
  value: number | string | Array<number | string>;
  /** Human readable statement, e.g. "Minimum CGPA 8.0" (criterion.display_text). */
  label: string;
  /** Short label used inside comparison rows, e.g. "CGPA". */
  short: string;
  /** The verbatim sentence from the provider's own page (criterion.source_text). */
  sourceText?: string;
  note?: string;
}

export type CriterionStatus = "pass" | "near" | "fail";

export interface CriterionResult {
  criterion: EligibilityCriterion;
  status: CriterionStatus;
  /** e.g. "CGPA 8.4 ≥ 8.0" */
  comparison: string;
  /** e.g. "0.2 points short" */
  reason: string;
  /** Human sentence for the fail/near detail block */
  detail: string;
}

export type MatchStatus = "ELIGIBLE" | "NEAR_MISS" | "NOT_ELIGIBLE";

export type RequirementSource = "official" | "community";

export interface Requirement {
  id: string;
  label: string;
  source: RequirementSource;
  note?: string;
  communityReportCount?: number;
}

export interface Scholarship {
  id: string;
  title: string;
  provider: string;
  /**
   * Display string as published ("₹1.5 Lakh+"), not a number: the source pages
   * state ranges and qualifiers that no single integer can carry honestly.
   */
  amount: string | null;
  deadline: string | null;
  url: string;
  /** Not returned by our API — see EXT/MORNING report. Optional, never faked. */
  summary?: string;
  officialRequirements: Requirement[];
  communityRequirements: Requirement[];
  criteria: EligibilityCriterion[];
  cadence?: string;
  openFor?: string;
}

export type InstitutionType = "Government" | "Private" | "Aided";
export type Category = "General" | "OBC" | "SC" | "ST" | "EWS" | "Other";

export interface UserProfile {
  name: string;
  cgpa: number;
  year: number;
  branch: string;
  state: string;
  income: number;
  institutionType: InstitutionType;
  category: Category;
  percentage?: number | null;
  gender?: string | null;
}

export interface MatchResult {
  scholarship: Scholarship;
  status: MatchStatus;
  results: CriterionResult[];
  failures: CriterionResult[];
  nearMisses: CriterionResult[];
}

export interface MatchGroups {
  eligible: MatchResult[];
  nearMiss: MatchResult[];
  notEligible: MatchResult[];
}

export interface MatchCounts {
  total: number;
  eligible: number;
  nearMiss: number;
  notEligible: number;
}

export type ItemAvailability = "have" | "dont" | "unanswered";

export interface ApplicationState {
  scholarshipId: string;
  /** application row id from our API */
  applicationId: string;
  /** requirement id -> availability */
  items: Record<string, ItemAvailability>;
  requirements: Requirement[];
  lastUpdated: number;
}

export type ReportTopic =
  | "The deadline was wrong"
  | "It asked for a document that wasn't listed"
  | "There was a file size or format limit"
  | "The criteria didn't match what was listed"
  | "Applications are closed"
  | "Something else";

export interface ScholarshipReport {
  id: string;
  scholarshipId: string;
  topic: ReportTopic;
  details: string;
  createdAt: number;
}
