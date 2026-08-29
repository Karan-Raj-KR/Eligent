/// <reference lib="dom" />
// Injected into a scholarship portal by the popup (chrome.scripting, activeTab).
// Three behaviours, all driven by one message from the popup:
//   A) FILL      — map the page's inputs to profile keys and set their values
//   B) BLOCK     — response.blocked === true -> touch nothing, report back
//   C) DOC DIFF  — compare the page's <input type=file> set against the
//                  official document list, by string matching. No LLM.
// It never clicks submit, never ticks a checkbox, never sets a file input.
import { lookup, type ProfileKey } from "./mapper";

interface FieldSpec {
  value: unknown;
  hints?: string[];
}
interface FillMessage {
  type: "ELIGENT_FILL";
  response:
    | { blocked: true }
    | { blocked: false; fields: Record<string, FieldSpec> };
  officialDocs: string[];
}

const norm = (s?: string | null): string => (s ?? "").replace(/\s+/g, " ").trim();

// ---------------------------------------------------------------- label text --

/** Every bit of text that could name this control, best signal first. */
function labelParts(el: Element): string[] {
  const out: string[] = [];
  const id = el.getAttribute("id");
  if (id) {
    try {
      const l = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (l) out.push(norm(l.textContent));
    } catch {
      /* bad id, ignore */
    }
  }
  const wrap = el.closest("label");
  if (wrap) out.push(norm(wrap.textContent));
  out.push(norm(el.getAttribute("aria-label")));
  for (const lid of norm(el.getAttribute("aria-labelledby")).split(" ")) {
    if (lid) out.push(norm(document.getElementById(lid)?.textContent));
  }
  out.push(norm(el.getAttribute("placeholder")));
  out.push(norm(el.getAttribute("name")));
  out.push(norm(id));
  out.push(norm(el.getAttribute("title")));
  return out.filter(Boolean);
}

function keyFor(el: Element): ProfileKey | null {
  for (const part of labelParts(el)) {
    const k = lookup(part);
    if (k) return k;
  }
  return null;
}

/** Nearest human-readable name for a control, falling back to a preceding heading. */
function nearestName(el: Element, fallback: string): string {
  const parts = labelParts(el);
  if (parts.length) return parts[0];
  let node: Element | null = el;
  for (let hops = 0; node && hops < 4; hops += 1) {
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

// -------------------------------------------------------------------- fill (A) --

// Anything whose label reads like a legal affirmation. We never tick a box, but
// these get called out so the human knows what is still theirs to do.
const DECLARATION_RE =
  /\b(declar\w*|consent|terms|conditions|attest\w*|undertak\w*|agree|hereby|certif\w*|authoris\w*|authoriz\w*|privacy|disclaimer|affirm\w*)\b/i;

/** Set a value the way a framework-controlled input will actually notice. */
function setNativeValue(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string): void {
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

function applyValue(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, raw: string): boolean {
  if (el instanceof HTMLSelectElement) {
    const want = raw.toLowerCase();
    const opt = Array.from(el.options).find(
      (o) => o.value.toLowerCase() === want || norm(o.text).toLowerCase() === want || norm(o.text).toLowerCase().includes(want),
    );
    if (!opt) return false;
    setNativeValue(el, opt.value);
    return true;
  }
  setNativeValue(el, raw);
  return true;
}

interface Skip {
  name: string;
  reason: string;
}

function fillForm(fields: Record<string, FieldSpec>): { filled: number; skipped: Skip[] } {
  const skipped: Skip[] = [];
  let filled = 0;

  const controls = document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    "input, select, textarea",
  );
  controls.forEach((el) => {
    if (el instanceof HTMLInputElement) {
      const t = el.type;
      if (["submit", "button", "reset", "image", "hidden", "file", "password"].includes(t)) return;
      if (t === "checkbox" || t === "radio") {
        const text = labelParts(el).join(" · ");
        if (DECLARATION_RE.test(text)) {
          skipped.push({
            name: nearestName(el, "checkbox"),
            reason: "declaration / consent — a human ticks this, not the extension",
          });
        }
        return; // never tick anything
      }
    }
    const key = keyFor(el);
    if (!key) return;
    const spec = fields[key];
    if (!spec || spec.value === null || spec.value === undefined || spec.value === "") {
      skipped.push({ name: key, reason: "no value for this in your profile" });
      return;
    }
    if (applyValue(el, String(spec.value))) filled += 1;
    else skipped.push({ name: key, reason: `no option matching "${String(spec.value)}"` });
  });

  return { filled, skipped };
}

// ---------------------------------------------------------------- doc diff (C) --

const GENERIC = new Set([
  "the","and","for","with","not","more","than","old","year","years","copy","copies","scan","scanned","self",
  "attested","proof","document","documents","certificate","certificates","upload","uploaded","photo","photograph",
  "details","detail","card","number","recent","latest","valid","original","photocopy","xerox","format","size",
  "passport","scanned","please","any","from","your","must","should","also","letter","form",
]);

function normDoc(s: string): string {
  return norm(s).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

/** True if the page's upload name plausibly refers to the same doc as `official`. */
function docMatches(pageName: string, official: string): boolean {
  const p = normDoc(pageName);
  const o = normDoc(official);
  if (!p || !o) return false;
  if (p.includes(o) || o.includes(p)) return true;

  const pw = p.split(" ").filter(Boolean);
  const ow = new Set(o.split(" ").filter(Boolean));
  const pSig = pw.filter((w) => w.length >= 3 && !GENERIC.has(w));
  const oSig = new Set(o.split(" ").filter((w) => w.length >= 3 && !GENERIC.has(w)));

  if (pSig.length && oSig.size) {
    for (const w of pSig) if (oSig.has(w)) return true;
    return false;
  }
  // Both names are basically generic ("ID proof", "photo") — fall back to any
  // shared word at all so we don't cry wolf.
  for (const w of pw) if (ow.has(w)) return true;
  return false;
}

interface DocDiff {
  formDemands: number;
  pageListed: number;
  unlisted: string[];
  matched: string[];
}

function documentDiff(officialDocs: string[]): DocDiff {
  const fileInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'));
  const names = fileInputs.map((el, i) => nearestName(el, `Upload #${i + 1}`));

  const unlisted: string[] = [];
  const matched: string[] = [];
  names.forEach((name) => {
    if (officialDocs.some((d) => docMatches(name, d))) matched.push(name);
    else unlisted.push(name);
  });

  return { formDemands: fileInputs.length, pageListed: officialDocs.length, unlisted, matched };
}

// ---------------------------------------------------------------- message hook --

declare global {
  interface Window {
    __eligentContentLoaded?: boolean;
  }
}

if (!window.__eligentContentLoaded) {
  window.__eligentContentLoaded = true;
  chrome.runtime.onMessage.addListener((msg: FillMessage, _sender, sendResponse) => {
    if (msg?.type !== "ELIGENT_FILL") return false;
    try {
      if (msg.response.blocked) {
        sendResponse({ blocked: true });
      } else {
        sendResponse({
          blocked: false,
          fill: fillForm(msg.response.fields ?? {}),
          diff: documentDiff(msg.officialDocs ?? []),
        });
      }
    } catch (err) {
      sendResponse({ error: String(err) });
    }
    return true;
  });
}
