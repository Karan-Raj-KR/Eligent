/// <reference lib="dom" />
// The DOM half of a scan: map a page's fields to profile keys and set their
// values, and diff its file uploads against the official document list. Pure
// against the ambient `document` — content.ts wires it to a message, the verify
// harnesses import it directly.
//
// Non-negotiable behaviour lives here:
//   - never click submit, never tick a checkbox/radio (declarations least of all)
//   - never set an <input type=file> value — detect and name only
//   - the document diff is pure string comparison, no model call

import { extractLabel, lookup, type ProfileKey } from "./mapper";

export interface FieldSpec {
  value: unknown;
}

export interface FillOutcome {
  found: number;
  filled: number;
  need: string[];
  unmappedLabels: string[];
  declarations: string[];
}

export interface DocDiff {
  formDemands: number;
  pageListed: number;
  unlisted: string[];
  matched: string[];
}

const norm = (s?: string | null): string => (s ?? "").replace(/\s+/g, " ").trim();

// ------------------------------------------------------------------ labels ----

/** A control's label (mapper's priority chain), and the dictionary/learned key
 *  it resolves to. `label` doubles as the human-readable name in the popup. */
function resolveKey(label: string, extraMap: Record<string, string>): ProfileKey | null {
  if (!label) return null;
  return lookup(label) ?? (extraMap[label] as ProfileKey | undefined) ?? null;
}

// --------------------------------------------------------- visual feedback ----

const STYLE_ID = "eligent-fill-style";
type Mark = "filled" | "unmatched" | "blocked";

/** Inject the outline CSS once. green = filled, amber = unmatched, red = a field
 *  Eligent is hard-blocked from touching (declaration checkbox, file input). */
function ensureStyle(): void {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent =
    '[data-eligent="filled"]{outline:2px solid #16a34a!important;outline-offset:1px}' +
    '[data-eligent="unmatched"]{outline:2px solid #d97706!important;outline-offset:1px}' +
    '[data-eligent="blocked"]{outline:2px solid #dc2626!important;outline-offset:1px}';
  (document.head ?? document.documentElement).appendChild(style);
}

const mark = (el: Element, state: Mark): void => el.setAttribute("data-eligent", state);

/** Clear every mark so an explicit re-scan starts fresh. The MutationObserver
 *  path deliberately does NOT call this — a still-marked field is skipped, so
 *  only genuinely new controls get filled on a portal step change. */
export function clearMarks(): void {
  for (const el of document.querySelectorAll("[data-eligent]")) el.removeAttribute("data-eligent");
}

// -------------------------------------------------------------------- fill -----

// A label that reads like a legal affirmation. We never tick a box — this list
// only decides which skipped boxes are worth naming to the human.
const DECLARATION_RE =
  /\b(declar\w*|consent|terms|conditions|attest\w*|undertak\w*|agree|hereby|certif\w*|authoris\w*|authoriz\w*|privacy|disclaimer|affirm\w*|acknowledg\w*)\b/i;

const SKIP_INPUT_TYPES = new Set(["submit", "button", "reset", "image", "hidden", "file", "password"]);

/** Set a value the way a framework-controlled input will actually notice:
 *  React/Vue track the native `value` setter, so calling it via the prototype
 *  descriptor (not `el.value =`) is what makes the change stick. */
function setNativeValue(
  el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value: string,
): void {
  el.focus();
  const proto =
    el instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.blur();
}

function applyValue(
  el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  raw: string,
): boolean {
  if (el instanceof HTMLSelectElement) {
    const want = norm(raw).toLowerCase();
    // Exact value first, then exact normalised visible text. No fuzzy contains.
    const opt =
      Array.from(el.options).find((o) => o.value === raw) ??
      Array.from(el.options).find((o) => norm(o.text).toLowerCase() === want);
    if (!opt) return false;
    if (el.value !== opt.value) setNativeValue(el, opt.value);
    return true;
  }
  if (el.value !== raw) setNativeValue(el, raw);
  return true;
}

export function fillForm(
  fields: Record<string, FieldSpec>,
  extraMap: Record<string, string>,
): FillOutcome {
  ensureStyle();

  const need: string[] = [];
  const unmappedLabels: string[] = [];
  const declarations: string[] = [];
  let found = 0;
  let filled = 0;

  const controls = document.querySelectorAll<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >("input, select, textarea");

  controls.forEach((el) => {
    if (el.hasAttribute("data-eligent")) return; // resolved on this scan already

    if (el instanceof HTMLInputElement) {
      if (SKIP_INPUT_TYPES.has(el.type)) return;
      if (el.type === "checkbox" || el.type === "radio") {
        const text = extractLabel(el);
        if (DECLARATION_RE.test(text)) {
          declarations.push(text || "checkbox");
          mark(el, "blocked"); // never tick anything — flag it as the human's job
        }
        return;
      }
    }
    if (el.disabled || (el as HTMLInputElement).readOnly) return;

    found += 1;
    const label = extractLabel(el) || "this field";
    const key = resolveKey(label, extraMap);
    if (!key) {
      need.push(label);
      unmappedLabels.push(label);
      mark(el, "unmatched");
      return;
    }
    const value = fields[key]?.value;
    if (value === null || value === undefined || value === "") {
      need.push(label);
      mark(el, "unmatched");
      return;
    }
    if (applyValue(el, String(value))) {
      filled += 1;
      mark(el, "filled");
    } else {
      need.push(label);
      mark(el, "unmatched");
    }
  });

  return { found, filled, need, unmappedLabels, declarations };
}

// ------------------------------------------------------------- re-scan hook ---

/** Debounce for the multi-step re-scan. */
export const OBSERVE_DEBOUNCE_MS = 400;

let activeObserver: MutationObserver | null = null;

/**
 * Re-run the fill (debounced) whenever the form DOM changes — multi-step portals
 * swap in the next page of fields without navigating. Marked controls are
 * skipped, so only genuinely new fields get touched. Calling again re-points the
 * single observer at the new payload.
 */
export function observeForm(
  fields: Record<string, FieldSpec>,
  extraMap: Record<string, string>,
): void {
  stopObserving();
  if (typeof MutationObserver === "undefined" || !document.body) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  activeObserver = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        fillForm(fields, extraMap);
      } catch {
        /* portal mid-render — the next mutation retries */
      }
    }, OBSERVE_DEBOUNCE_MS);
  });
  activeObserver.observe(document.body, { childList: true, subtree: true });
}

export function stopObserving(): void {
  activeObserver?.disconnect();
  activeObserver = null;
}

// --------------------------------------------------------------- doc diff -----

const GENERIC = new Set([
  "the", "and", "for", "with", "not", "copy", "copies", "scan", "scanned", "self",
  "attested", "proof", "document", "documents", "certificate", "certificates",
  "upload", "uploaded", "photo", "photograph", "details", "detail", "card",
  "number", "recent", "latest", "valid", "original", "photocopy", "xerox",
  "format", "size", "please", "any", "from", "your", "must", "should", "also",
  "letter", "form", "id",
]);

function normDoc(s: string): string {
  return norm(s)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True if a page upload plausibly names the same document as `official`. */
export function docMatches(pageName: string, official: string): boolean {
  const p = normDoc(pageName);
  const o = normDoc(official);
  if (!p || !o) return false;
  if (p.includes(o) || o.includes(p)) return true;

  const pWords = p.split(" ").filter(Boolean);
  const oWords = o.split(" ").filter(Boolean);
  const pSig = pWords.filter((w) => w.length >= 3 && !GENERIC.has(w));
  const oSig = new Set(oWords.filter((w) => w.length >= 3 && !GENERIC.has(w)));

  if (pSig.length && oSig.size) return pSig.some((w) => oSig.has(w));
  // Both all-generic ("ID proof" vs "ID proof") — any shared word will do.
  const oAll = new Set(oWords);
  return pWords.some((w) => oAll.has(w));
}

export function documentDiff(officialDocs: string[]): DocDiff {
  ensureStyle();
  const fileInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'));
  const names = fileInputs.map((el, i) => {
    mark(el, "blocked"); // Eligent never sets a file input — the human uploads
    return extractLabel(el) || `Upload #${i + 1}`;
  });

  const unlisted: string[] = [];
  const matched: string[] = [];
  for (const name of names) {
    if (officialDocs.some((d) => docMatches(name, d))) matched.push(name);
    else unlisted.push(name);
  }
  return { formDemands: fileInputs.length, pageListed: officialDocs.length, unlisted, matched };
}
