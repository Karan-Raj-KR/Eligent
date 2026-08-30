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
  /** The profile's own value, formatted — e.g. "82%". */
  actual: string;
  /** What the criterion demands, formatted — e.g. "85%". */
  required: string;
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
  /** opportunity.category — 'scholarship' | 'hackathon' | 'internship' | … */
  category?: string;
  /** opportunity.location_type */
  locationType?: "india" | "abroad" | "online";
  /** opportunity.funded — travel/stay/fees covered */
  funded?: boolean;
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
  skills?: string[];
  interests?: string[];
  preferredLocations?: string[];
  preferredOpportunityTypes?: string[];
}

export type PlatformOpportunityCategory =
  | "scholarship"
  | "fellowship"
  | "grant"
  | "hackathon"
  | "internship"
  | "job"
  | "programme"
  | "event"
  | "competition"
  | "workshop";

export type OpportunityStatus = "draft" | "pending_review" | "published" | "rejected" | "expired";

export type ApplicationMode = "eligent" | "external";

export interface PlatformOpportunity {
  id: string;
  name: string;
  provider: string;
  organization?: string;
  /** External application URL. Only meaningful when applicationMode is "external". */
  url: string | null;
  deadline: string | null;
  amount: string | null;
  category: PlatformOpportunityCategory;
  locationType: "india" | "abroad" | "online";
  funded?: boolean;
  description?: string;
  tags?: string[];
  skills?: string[];
  status: OpportunityStatus;
  creatorUserId?: string | null;
  createdAt: string;
  updatedAt?: string;
  /** "eligent" = apply through ELIGENT, "external" = redirect to provider URL */
  applicationMode?: ApplicationMode;
}

export type NotificationType =
  | "matching_opportunity"
  | "deadline_approaching"
  | "status_changed"
  | "community_report"
  | "general";

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  opportunityId?: string;
  createdAt: string;
}

export interface SavedOpportunity {
  id: string;
  userId: string;
  opportunityId: string;
  createdAt: string;
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
