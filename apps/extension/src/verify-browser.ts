// Built to dist/verify-browser.js (IIFE) and run in a real browser tab holding
// TEST-PAGE.html, to prove the content-script DOM walk — not just the string
// renderers — behaves. See EXT-REPORT.md "Verification".
//
//   window.__eligentVerify(officialDocs) -> { fill, diff }

import { documentDiff, fillForm } from "./form-scan";

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

declare global {
  interface Window {
    __eligentVerify?: (officialDocs: string[]) => {
      fill: ReturnType<typeof fillForm>;
      diff: ReturnType<typeof documentDiff>;
      declarationChecked: boolean;
      fileInputsTouched: number;
    };
  }
}

window.__eligentVerify = (officialDocs: string[]) => {
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
  };
};
