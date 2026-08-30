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

/**
 * Stream -> the concrete branches the onboarding form actually offers.
 *
 * The listing pages publish a course taxonomy ("Course / Stream Engineering,
 * Medical, Law") while a student picks from a branch list ("Computer Science",
 * "Mechanical"). Left alone, `branch in ["Engineering", ...]` matches NOBODY —
 * a computer science student is silently rejected from an engineering
 * scholarship. Expanding the stream keeps the restriction exactly as strict
 * (a Medical-only scholarship still excludes engineers) while making it
 * possible to match at all. The criterion's source_text is untouched: the page
 * still speaks for itself, this only translates its vocabulary into the one
 * the profile is written in.
 */
const STREAM_BRANCHES: Record<string, string[]> = {
  engineering: ["Computer Science", "Electronics", "Mechanical", "Civil", "Chemical", "CSE"],
  technical: ["Computer Science", "Electronics", "Mechanical", "Civil", "Chemical", "CSE"],
  "b.tech": ["Computer Science", "Electronics", "Mechanical", "Civil", "Chemical", "CSE"],
  "computer science": ["Computer Science", "CSE"],
  electronics: ["Electronics"],
  mechanical: ["Mechanical"],
  civil: ["Civil"],
  chemical: ["Chemical"],
};

/** The concrete branches implied by a stream name, if any. */
export function branchesForStream(value: string): string[] {
  return STREAM_BRANCHES[value.trim().toLowerCase()] ?? [];
}

/**
 * Canonicalises a whole criterion, because widening a branch can change the
 * OPERATOR as well as the value: `eq "Engineering"` has to become
 * `in ["Engineering", "Computer Science", ...]`. Returning only a value here
 * would silently hand `eq` an array, which evaluate() reads as a categorical
 * hard failure — rejecting everyone instead of matching more people.
 */
export function canonicalCriterion<T extends { field: string; operator: string; value: unknown }>(
  criterion: T,
): { operator: string; value: unknown } {
  const { field, operator, value } = criterion;
  const canonical = Array.isArray(value) ? value.map((v) => canonicalValue(field, v)) : canonicalValue(field, value);

  if (field !== "branch" || (operator !== "eq" && operator !== "in")) {
    return { operator, value: canonical };
  }

  // Branch is the one field where the page and the profile speak different
  // languages. Widen the list to cover both; never narrow it. `not_in` is
  // deliberately excluded — widening an exclusion list would lock people OUT.
  const listed = (Array.isArray(canonical) ? canonical : [canonical]).filter((v): v is string => typeof v === "string");
  const expanded = new Set(listed);
  for (const entry of listed) for (const branch of branchesForStream(entry)) expanded.add(branch);
  if (expanded.size === listed.length) return { operator, value: canonical };

  return { operator: "in", value: [...expanded] };
}
