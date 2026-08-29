// Static dictionary: Indian scholarship-portal form labels -> profile keys.
// Pure, no DOM, no network. The caller passes whatever text it could scrape for
// a field (label text, aria-label, placeholder, name, id) and gets back a
// profile key or null. Match is case-insensitive on whitespace-normalised text,
// comparing whole tokens so "name as per marksheet" hits `name` but not `marks`.

export type ProfileKey =
  | "full_name"
  | "cgpa"
  | "percentage"
  | "year_of_study"
  | "branch"
  | "state"
  | "annual_family_income"
  | "institution_type"
  | "gender"
  | "category";

const norm = (s: string): string =>
  (s ?? "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[_\-/\\.,:;()\[\]]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokens = (s: string): string[] => norm(s).split(" ").filter(Boolean);

/** Is `needle` (token list) a contiguous run inside `hay` (token list)? */
function hasRun(hay: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > hay.length) return false;
  for (let i = 0; i + needle.length <= hay.length; i += 1) {
    let ok = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (hay[i + j] !== needle[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

// Ordered: the first entry whose phrase appears wins, so put the labels that
// would otherwise be shadowed by a shorter phrase first (full_name before
// percentage's "marks", institution_type before a bare "type", etc.).
const ENTRIES: Array<{ key: ProfileKey; phrases: string[]; not?: string[] }> = [
  {
    key: "annual_family_income",
    phrases: [
      "annual family income",
      "family income",
      "parental income",
      "household income",
      "annual income",
      "parents income",
      "income",
    ],
  },
  {
    key: "institution_type",
    phrases: [
      "institution type",
      "type of institution",
      "college type",
      "type of college",
      "institute type",
      "institution category",
    ],
  },
  {
    key: "full_name",
    phrases: [
      "full name",
      "name as per marksheet",
      "name as per marks sheet",
      "applicant name",
      "candidate name",
      "student name",
      "name of applicant",
      "name of candidate",
      "name of student",
      "your name",
      "name",
    ],
    // "father's name", "college name", "bank name" etc. are real fields but not
    // ours — never claim them for full_name.
    not: [
      "father",
      "mother",
      "guardian",
      "parent",
      "bank",
      "account",
      "college",
      "institute",
      "institution",
      "school",
      "course",
      "scheme",
      "user",
      "login",
    ],
  },
  {
    key: "year_of_study",
    phrases: [
      "year of study",
      "current year",
      "study year",
      "academic year of study",
      "year",
      "semester",
      "sem",
    ],
    not: ["passing", "birth", "dob", "admission", "joining"],
  },
  {
    key: "cgpa",
    phrases: ["current cgpa", "cgpa", "gpa", "cumulative grade point average", "grade point average"],
  },
  {
    key: "percentage",
    phrases: [
      "aggregate percentage",
      "percentage",
      "percent",
      "aggregate",
      "marks",
      "marks obtained",
      "overall percentage",
    ],
  },
  {
    key: "branch",
    phrases: ["branch", "course", "stream", "discipline", "department", "specialisation", "specialization", "trade"],
  },
  {
    key: "state",
    phrases: ["state of residence", "state of domicile", "domicile state", "home state", "domicile", "state"],
  },
  { key: "gender", phrases: ["gender", "sex"] },
  {
    key: "category",
    phrases: ["social category", "reservation category", "category", "caste", "community"],
  },
];

/** The one export. label/aria/placeholder/name/id text -> profile key | null. */
export function lookup(labelText: string): ProfileKey | null {
  const hay = tokens(labelText);
  if (hay.length === 0) return null;
  for (const { key, phrases, not } of ENTRIES) {
    if (not && not.some((n) => hay.some((t) => t.includes(n)))) continue;
    if (phrases.some((p) => hasRun(hay, tokens(p)))) return key;
  }
  return null;
}
