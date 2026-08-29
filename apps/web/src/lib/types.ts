import type { Criterion, Evaluation } from "@opportunity/engine";

export interface Opportunity {
  id: string;
  name: string;
  provider: string | null;
  url: string | null;
  /** A date string, or null. Never assume it parses. */
  deadline: string | null;
  /** TEXT in the schema ("Up to 2,00,000"). Never a number, never .toLocaleString(). */
  amount: string | null;
  official_documents?: string[] | null;
}

export interface Match {
  opportunity: Opportunity;
  evaluation: Evaluation;
  criteria: Criterion[];
}

export type Matches = Record<Evaluation["status"], Match[]>;

export interface Requirement {
  id: string;
  document_type: string;
  source: "official" | "community";
  user_has: boolean | null;
}

export interface ApplicationDetail {
  application: { id: string; status: string; opportunity: Opportunity | null } | null;
  requirements: Requirement[];
  eligibility: Evaluation | null;
}

export const REPORT_TYPES = [
  { value: "wrong_deadline", label: "The deadline is wrong" },
  { value: "extra_document", label: "They asked for a document not listed" },
  { value: "file_limit", label: "File upload limit problem" },
  { value: "criteria_mismatch", label: "The eligibility criteria are wrong" },
  { value: "closed", label: "Applications are closed" },
  { value: "other", label: "Something else" },
] as const;
