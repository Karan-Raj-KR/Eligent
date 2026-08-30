// The categorical vocabulary shared by the profile and by criterion values.
//
// WHY THIS EXISTS: packages/engine compares strings with `===` and is
// deliberately field-agnostic — it must not know that "Female" and "female" are
// the same person. So both SIDES of the comparison are canonicalised here
// instead: /api/profile canonicalises what a student saves, and the seed loader
// canonicalises what the harvester extracted. The engine stays untouched.
//
// Canonical form = exactly what the onboarding form renders, because that is
// what the UI displays back to the student.

/** Fields whose values are categorical strings compared with === by the engine. */
export const CATEGORICAL_FIELDS = [
  "gender",
  "institution_type",
  "category",
  "state",
  "branch",
  "nationality",
  "region",
  "student_status",
] as const;

/** Known spellings -> canonical. Anything unknown is Title Cased, not dropped. */
const SYNONYMS: Record<string, string> = {
  // gender
  m: "Male", male: "Male", boy: "Male", boys: "Male", men: "Male",
  f: "Female", female: "Female", girl: "Female", girls: "Female", women: "Female", woman: "Female",
  // category
  gen: "General", general: "General", ews: "EWS", "general (ews)": "EWS",
  obc: "OBC", sc: "SC", st: "ST", "sc/st": "SC", minority: "Minority",
  // institution_type
  govt: "Government", government: "Government", public: "Government",
  private: "Private", aided: "Aided",
};

const MINOR_WORDS = new Set(["and", "of", "the", "for", "in"]);

/**
 * Case-normalises ONLY when the author gave us no casing signal — an all-lower
 * or all-upper string. Anything with deliberate internal capitals ("B.Arch",
 * "AICTE-approved") is left exactly as written: mangling it into "B.arch" would
 * invent a value no page ever stated.
 */
function titleCase(value: string): string {
  const isAllLower = value === value.toLowerCase();
  const isAllUpper = value === value.toUpperCase();
  if (!isAllLower && !isAllUpper) return value;
  if (isAllUpper && value.replace(/[^A-Za-z]/g, "").length <= 4) return value; // EWS, OBC, SC/ST
  return value
    .split(/\s+/)
    .map((word, i) =>
      i > 0 && MINOR_WORDS.has(word.toLowerCase())
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}

/** Canonicalises one categorical value. Non-strings and unknown fields pass through. */
export function canonicalValue(field: string, value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (!(CATEGORICAL_FIELDS as readonly string[]).includes(field)) return value;
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return SYNONYMS[trimmed.toLowerCase()] ?? titleCase(trimmed);
}

/** Canonicalises a criterion's value, including the array forms of in/not_in. */
export function canonicalCriterionValue(field: string, value: unknown): unknown {
  if (Array.isArray(value)) return value.map((v) => canonicalValue(field, v));
  return canonicalValue(field, value);
}
