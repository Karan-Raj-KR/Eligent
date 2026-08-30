// Built to dist/verify-browser.js (IIFE) and run in a real browser tab holding
// TEST-PAGE.html, to prove the content-script DOM walk — not just the string
// renderers — behaves. See EXT-REPORT.md "Verification".
//
//   window.__eligentVerify(officialDocs) -> { fill, diff }

import { clearMarks, documentDiff, fillForm, observeForm } from "./form-scan";
import { extractLabel } from "./mapper";

const DEMO_FIELDS: Record<string, { value: unknown }> = {
  full_name: { value: "Aarav Sharma" },
  cgpa: { value: "8.6" },
  percentage: { value: "81.4" },
  year_of_study: { value: "2nd Year" },
  branch: { value: "Computer Science" },
  state: { value: "Karnataka" },
  annual_family_income: { value: "220000" },
  institution_type: { value: "Private" },
  gender: { value: "Male" },
  category: { value: "General" },
};

const marksByState = () => {
  const out: Record<string, string[]> = { filled: [], unmatched: [], blocked: [] };
  for (const el of document.querySelectorAll<HTMLElement>("[data-eligent]")) {
    const s = el.getAttribute("data-eligent")!;
    (out[s] ??= []).push(el.id || el.getAttribute("name") || el.tagName.toLowerCase());
  }
  return out;
};

declare global {
  interface Window {
    __eligentVerify?: (officialDocs: string[]) => {
      fill: ReturnType<typeof fillForm>;
      diff: ReturnType<typeof documentDiff>;
      declarationChecked: boolean;
      fileInputsTouched: number;
      marks: Record<string, string[]>;
    };
    /** Start the multi-step observer, for the MutationObserver e2e check. */
    __eligentObserve?: (fields?: Record<string, { value: unknown }>) => void;
    __eligentMarks?: () => Record<string, string[]>;
    /** extractLabel by CSS selector, for the priority-chain e2e check. */
    __eligentLabel?: (selector: string) => string;
  }
}

window.__eligentLabel = (selector: string) => {
  const el = document.querySelector(selector);
  return el ? extractLabel(el) : "";
};

window.__eligentVerify = (officialDocs: string[]) => {
  clearMarks();
  const fill = fillForm(DEMO_FIELDS, {});
  const diff = documentDiff(officialDocs);
  const decl = document.querySelector<HTMLInputElement>('input[name="declaration"]');
  const fileInputsTouched = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[type="file"]'),
  ).filter((el) => el.value !== "").length;
  return {
    fill,
    diff,
    declarationChecked: Boolean(decl?.checked),
    fileInputsTouched,
    marks: marksByState(),
  };
};

window.__eligentObserve = (fields = DEMO_FIELDS) => observeForm(fields, {});
window.__eligentMarks = marksByState;
