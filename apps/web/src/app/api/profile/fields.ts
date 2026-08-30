// The profile field catalogue: order, human labels, and which fields count
// toward completeness. Lives here so the Chrome extension needs no schema
// knowledge of its own — GET /api/profile ships the labels with the values.
//
// Not a route file: Next only treats route.ts/page.tsx as handlers.

import { FIELD_HINTS } from "@/lib/field-hints";

export interface FieldSpec {
  key: string;
  label: string;
  /** Optional fields never count against completeness. */
  optional?: boolean;
}

/** Display order is the order onboarding asks for them. */
export const PROFILE_FIELDS: FieldSpec[] = [
  { key: "full_name", label: "Full name" },
  { key: "cgpa", label: "CGPA" },
  { key: "percentage", label: "Percentage" },
  { key: "year_of_study", label: "Year of study" },
  { key: "branch", label: "Branch" },
  { key: "state", label: "State" },
  { key: "annual_family_income", label: "Annual family income" },
  { key: "institution_type", label: "Institution type" },
  // Onboarding lets a student decline both of these ("Prefer not to say"), so a
  // blank one is a considered answer, not an incomplete profile.
  { key: "category", label: "Category", optional: true },
  { key: "gender", label: "Gender", optional: true },
];

export interface ProfileField {
  label: string;
  value: string | number | null;
  hints: string[];
  optional: boolean;
}

/** profile_key -> { label, value, hints, optional } — everything a form filler needs. */
export function toFieldMap(profile: Record<string, unknown> | null): Record<string, ProfileField> {
  return Object.fromEntries(
    PROFILE_FIELDS.map((field) => {
      const raw = profile?.[field.key];
      return [
        field.key,
        {
          label: field.label,
          value: raw === undefined || raw === "" ? null : (raw as string | number | null),
          hints: FIELD_HINTS[field.key] ?? [],
          optional: field.optional ?? false,
        },
      ];
    }),
  );
}

/** { filled, total, missing[] } over the required fields only. */
export function completeness(profile: Record<string, unknown> | null) {
  const required = PROFILE_FIELDS.filter((f) => !f.optional);
  const missing = required
    .filter((f) => {
      const value = profile?.[f.key];
      return value === null || value === undefined || value === "";
    })
    .map((f) => f.key);
  return { filled: required.length - missing.length, total: required.length, missing };
}
