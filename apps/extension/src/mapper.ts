/// <reference lib="dom" />
// Static dictionary: Indian scholarship-portal form labels -> profile keys.
// `lookup()` is pure (no DOM, no network) — the caller passes scraped text and
// gets a profile key or null. Match is case-insensitive on whitespace-normalised
// text, comparing whole tokens so "name as per marksheet" hits `name` but not
// `marks`.
//
// `extractLabel(el)` is the DOM side: the one label an <input>/<select>/<textarea>
// should be judged by, picked from a priority chain (first non-empty wins).

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

// ponytail: static hand-tuned dictionary, no fuzzy/synonym model. Add phrases as
// real portal markup shows up; graduate to a token-similarity score only if the
// phrase list becomes unmaintainable.
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

/** label/aria/placeholder/name/id text -> profile key | null. */
export function lookup(labelText: string): ProfileKey | null {
  const hay = tokens(labelText);
  if (hay.length === 0) return null;
  for (const { key, phrases, not } of ENTRIES) {
    if (not && not.some((n) => hay.some((t) => t.includes(n)))) continue;
    if (phrases.some((p) => hasRun(hay, tokens(p)))) return key;
  }
  return null;
}

// --------------------------------------------------------------- DOM labels ---

/** Collapse whitespace, drop a trailing "*" or "(required)" marker. Casing and
 *  inner punctuation are left for `lookup()`'s own `norm` to handle. */
function tidy(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s*\*+$/, "")
    .replace(/\s*\(\s*required\s*\)$/i, "")
    .replace(/\s*:$/, "")
    .trim();
}

function byLabelledBy(el: Element): string {
  const ids = (el.getAttribute("aria-labelledby") ?? "").split(/\s+/).filter(Boolean);
  if (!ids.length) return "";
  return ids.map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
}

function byLabelFor(el: Element): string {
  const id = el.getAttribute("id");
  if (!id) return "";
  try {
    return document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent ?? "";
  } catch {
    return "";
  }
}

/** Text nodes sitting immediately before the control ("Name: <input>"), plus a
 *  bare caption element if that's all that precedes it. */
function byPrecedingText(el: Element): string {
  let node: Node | null = el.previousSibling;
  let text = "";
  while (node && (node.nodeType === 3 /* text */ || (node as Element).tagName === "BR")) {
    if (node.nodeType === 3) text = (node.textContent ?? "") + text;
    node = node.previousSibling;
  }
  if (text.trim()) return text;
  // A bare <label>Foo</label><input> (no `for`, not wrapping) is still a label.
  const sib = el.previousElementSibling;
  if (sib && sib.tagName === "LABEL") return sib.textContent ?? "";
  return "";
}

/** Nearest heading (h1–h6) above the control, walking up and back. */
function byPrecedingHeading(el: Element): string {
  let node: Element | null = el;
  for (let hop = 0; node && hop < 5; hop += 1) {
    let sib: Element | null = node.previousElementSibling;
    while (sib) {
      if (/^H[1-6]$/.test(sib.tagName)) {
        const t = tidy(sib.textContent);
        if (t) return t;
      }
      const nested = sib.querySelector("h1,h2,h3,h4,h5,h6");
      if (nested) {
        const t = tidy(nested.textContent);
        if (t) return t;
      }
      sib = sib.previousElementSibling;
    }
    node = node.parentElement;
  }
  return "";
}

/**
 * The single label a control should be matched on. Priority chain, first
 * non-empty wins:
 *   aria-label / aria-labelledby -> <label for> -> wrapping <label> ->
 *   fieldset <legend> -> preceding text node -> placeholder -> name -> id ->
 *   nearest preceding heading.
 */
export function extractLabel(el: Element): string {
  const chain: Array<string | null | undefined> = [
    el.getAttribute("aria-label"),
    byLabelledBy(el),
    byLabelFor(el),
    el.closest("label")?.textContent,
    el.closest("fieldset")?.querySelector("legend")?.textContent,
    byPrecedingText(el),
    el.getAttribute("placeholder"),
    el.getAttribute("name"),
    el.getAttribute("id"),
    byPrecedingHeading(el),
  ];
  for (const candidate of chain) {
    const t = tidy(candidate);
    if (t) return t;
  }
  return "";
}
