export type CriterionKind =
  | "cgpa"
  | "income"
  | "year"
  | "state"
  | "branch"
  | "category"
  | "institution";

export interface EligibilityCriterion {
  id: string;
  kind: CriterionKind;
  operator: "gte" | "lte" | "in";
  /** Threshold value (number) or allowed list (string[]) */
  value: number | string[];
  /** Human readable label, e.g. "Minimum CGPA" */
  label: string;
  /** Short label used inside comparison rows, e.g. "CGPA" */
  short: string;
  /** Static clarification text */
  note?: string;
}

export type CriterionStatus = "pass" | "near" | "fail";

export interface CriterionResult {
  criterion: EligibilityCriterion;
  status: CriterionStatus;
  /** e.g. "CGPA 8.4 ≥ 8.0" */
  comparison: string;
  /** e.g. "0.2 CGPA short" */
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
  /** Handy note, e.g. "Photocopy, self-attested" */
  note?: string;
  communityReportCount?: number;
}

export interface Scholarship {
  id: string;
  title: string;
  provider: string;
  amount: number;
  amountNote?: string;
  deadline: string;
  summary: string;
  officialRequirements: Requirement[];
  communityRequirements: Requirement[];
  criteria: EligibilityCriterion[];
  /** Semester / cadence, e.g. "Every year" */
  cadence?: string;
  openFor?: string;
}

export type InstitutionType = "Government" | "Private" | "Aided";
export type Category =
  | "General"
  | "OBC"
  | "SC"
  | "ST"
  | "EWS"
  | "Other";

export interface UserProfile {
  name: string;
  cgpa: number;
  year: number;
  branch: string;
  state: string;
  income: number;
  institutionType: InstitutionType;
  category: Category;
}

export interface MatchResult {
  scholarship: Scholarship;
  status: MatchStatus;
  results: CriterionResult[];
  /** Failing criteria shown for NOT_ELIGIBLE */
  failures: CriterionResult[];
  /** Near criteria making a NEAR_MISS hiscore */
  nearMisses: CriterionResult[];
}

export type ItemAvailability = "have" | "dont" | "unanswered";

export interface ApplicationState {
  scholarshipId: string;
  /** requirement id -> availability */
  items: Record<string, ItemAvailability>;
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