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

import { lookup, type ProfileKey } from "./mapper";

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

/** Every string that might name a control, strongest signal first. */
function labelParts(el: Element): string[] {
  const out: string[] = [];
  const id = el.getAttribute("id");
  if (id) {
    try {
      const forEl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (forEl) out.push(norm(forEl.textContent));
    } catch {
      /* malformed id */
    }
  }
  const wrapping = el.closest("label");
  if (wrapping) out.push(norm(wrapping.textContent));
  out.push(norm(el.getAttribute("aria-label")));
  for (const ref of norm(el.getAttribute("aria-labelledby")).split(" ")) {
    if (ref) out.push(norm(document.getElementById(ref)?.textContent));
  }
  out.push(norm(el.getAttribute("placeholder")));
  out.push(norm(el.getAttribute("name")));
  out.push(norm(id));
  out.push(norm(el.getAttribute("title")));
  return out.filter(Boolean);
}

/** Best human-readable name: a real label, else the nearest heading above it. */
function displayName(el: Element, fallback: string): string {
  const parts = labelParts(el);
  if (parts.length) return parts[0];
  let node: Element | null = el;
  for (let hop = 0; node && hop < 4; hop += 1) {
    let sib = node.previousElementSibling;
    while (sib) {
      if (/^(H[1-6]|LABEL|LEGEND|STRONG|B|P|SPAN|DIV|TD|TH)$/.test(sib.tagName)) {
        const t = norm(sib.textContent);
        if (t && t.length <= 120) return t;
      }
      sib = sib.previousElementSibling;
    }
    node = node.parentElement;
  }
  return fallback;
}

function resolveKey(el: Element, extraMap: Record<string, string>): ProfileKey | null {
  for (const part of labelParts(el)) {
    const fromDict = lookup(part);
    if (fromDict) return fromDict;
    const learned = extraMap[part];
    if (learned) return learned as ProfileKey;
  }
  return null;
}

// -------------------------------------------------------------------- fill -----

// A label that reads like a legal affirmation. We never tick a box — this list
// only decides which skipped boxes are worth naming to the human.
const DECLARATION_RE =
  /\b(declar\w*|consent|terms|conditions|attest\w*|undertak\w*|agree|hereby|certif\w*|authoris\w*|authoriz\w*|privacy|disclaimer|affirm\w*|acknowledg\w*)\b/i;

const SKIP_INPUT_TYPES = new Set(["submit", "button", "reset", "image", "hidden", "file", "password"]);

/** Set a value the way a framework-controlled input will actually notice. */
function setNativeValue(
  el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value: string,
): void {
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
}

function applyValue(
  el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  raw: string,
): boolean {
  if (el instanceof HTMLSelectElement) {
    const want = raw.toLowerCase();
    const opt = Array.from(el.options).find(
      (o) =>
        o.value.toLowerCase() === want ||
        norm(o.text).toLowerCase() === want ||
        norm(o.text).toLowerCase().includes(want),
    );
    if (!opt) return false;
    setNativeValue(el, opt.value);
    return true;
  }
  setNativeValue(el, raw);
  return true;
}

export function fillForm(
  fields: Record<string, FieldSpec>,
  extraMap: Record<string, string>,
): FillOutcome {
  const need: string[] = [];
  const unmappedLabels: string[] = [];
  const declarations: string[] = [];
  let found = 0;
  let filled = 0;

  const controls = document.querySelectorAll<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >("input, select, textarea");

  controls.forEach((el) => {
    if (el instanceof HTMLInputElement) {
      if (SKIP_INPUT_TYPES.has(el.type)) return;
      if (el.type === "checkbox" || el.type === "radio") {
        const text = labelParts(el).join(" · ");
        if (DECLARATION_RE.test(text)) declarations.push(displayName(el, "checkbox"));
        return; // never tick anything, declaration or otherwise
      }
    }
    if (el.disabled || (el as HTMLInputElement).readOnly) return;

    found += 1;
    const label = displayName(el, "this field");
    const key = resolveKey(el, extraMap);
    if (!key) {
      need.push(label);
      unmappedLabels.push(label);
      return;
    }
    const value = fields[key]?.value;
    if (value === null || value === undefined || value === "") {
      need.push(label);
      return;
    }
    if (applyValue(el, String(value))) filled += 1;
    else need.push(label);
  });

  return { found, filled, need, unmappedLabels, declarations };
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
  const fileInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'));
  const names = fileInputs.map((el, i) => displayName(el, `Upload #${i + 1}`));

  const unlisted: string[] = [];
  const matched: string[] = [];
  for (const name of names) {
    if (officialDocs.some((d) => docMatches(name, d))) matched.push(name);
    else unlisted.push(name);
  }
  return { formDemands: fileInputs.length, pageListed: officialDocs.length, unlisted, matched };
}
