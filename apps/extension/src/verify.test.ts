// Verification harness for the Scan states. Run: pnpm --filter opportunity-extension test:verify
// (esbuild -> CJS -> node; any failed assert exits non-zero).
//
// The DOM walk itself (fillForm / documentDiff traversing input/select/file
// nodes) is exercised in a real browser against TEST-PAGE.html — see
// EXT-REPORT.md. This file locks down the logic that decides each state: the
// document string-match and the four state renderers.

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { docMatches, type DocDiff, type FillOutcome } from "./form-scan";
import { blockedView, errorView, resultView, BROWSER_PAGE_MESSAGE } from "./scan-view";

// ---- TEST-PAGE.html: the six upload labels the content script would derive ----
const html = readFileSync(new URL("../TEST-PAGE.html", import.meta.url), "utf8");
const pageUploads = [...html.matchAll(/<label for="d\d+">([^<]+)<\/label>/g)].map((m) => m[1].trim());
assert.deepStrictEqual(
  pageUploads,
  [
    "Class 10 Marksheet",
    "Class 12 Marksheet",
    "Income Certificate (latest)",
    "Aadhaar Card",
    "Domicile / Residence Certificate",
    "Migration Certificate",
  ],
  "TEST-PAGE upload labels changed — update the fixtures",
);

/** Mirror of content.documentDiff's decision, over already-derived names. */
function diffOf(uploads: string[], official: string[]): DocDiff {
  const unlisted: string[] = [];
  const matched: string[] = [];
  for (const name of uploads) {
    if (official.some((d) => docMatches(name, d))) matched.push(name);
    else unlisted.push(name);
  }
  return { formDemands: uploads.length, pageListed: official.length, unlisted, matched };
}

// ---- DOC DIFF: exactly the two unlisted documents ---------------------------
const docdiff = JSON.parse(readFileSync(new URL("../public/demo-docdiff.json", import.meta.url), "utf8"));
const dd = diffOf(pageUploads, docdiff.opportunity.official_documents);
assert.strictEqual(dd.formDemands, 6, "form demands 6");
assert.strictEqual(dd.pageListed, 4, "page listed 4");
assert.deepStrictEqual(
  dd.unlisted,
  ["Domicile / Residence Certificate", "Migration Certificate"],
  "diff must name exactly the two unlisted documents",
);

const ddView = resultView({ found: 12, filled: 10, need: ["Mobile Number", "Email Address"], unmappedLabels: [], declarations: ["I hereby declare that all information provided above is true and correct."] }, dd);
assert.strictEqual(ddView.cls, "diff");
assert.ok(ddView.headline.includes("demands 6 documents"));
assert.ok(ddView.headline.includes("listed 4"));
assert.ok(ddView.html.includes("Domicile / Residence Certificate"));
assert.ok(ddView.html.includes("Migration Certificate"));
assert.ok(ddView.html.includes("you tick these, not Eligent"), "declaration is surfaced, never ticked");

// ---- FILLED: all six page uploads on the official list -> no diff -----------
const filled = JSON.parse(readFileSync(new URL("../public/demo-filled.json", import.meta.url), "utf8"));
const fd = diffOf(pageUploads, filled.opportunity.official_documents);
assert.deepStrictEqual(fd.unlisted, [], "demo-filled: nothing unlisted");

const filledView = resultView({ found: 12, filled: 10, need: ["Mobile Number", "Email Address"], unmappedLabels: [], declarations: [] }, fd);
assert.strictEqual(filledView.cls, "filled");
assert.ok(/12 fields found\. 10 filled from your profile\. 2 need you\./.test(filledView.headline));
assert.ok(filledView.html.includes("Mobile Number") && filledView.html.includes("Email Address"));

// ---- BLOCKED --------------------------------------------------------------
const blocked = JSON.parse(readFileSync(new URL("../public/demo-blocked.json", import.meta.url), "utf8"));
const bView = blockedView({
  reason: blocked.reason,
  clauseText: blocked.clause.displayText,
  sourceText: blocked.source_text,
  sourceUrl: blocked.source_url,
});
assert.strictEqual(bView.cls, "blocked");
assert.ok(bView.html.includes("Family income exceeds ₹3L"), "shows the clause");
assert.ok(bView.html.includes("does not exceed Rs. 3,00,000"), "quotes the source sentence");
assert.ok(bView.html.includes("buddy4study.com"), "links the source page");
assert.ok(bView.html.includes("See what you qualify for"));
assert.ok(!/filled/i.test(bView.html) || bView.html.includes("Nothing was filled"), "blocked fills nothing");

// ---- ERROR ---------------------------------------------------------------
const eView = errorView(BROWSER_PAGE_MESSAGE);
assert.strictEqual(eView.cls, "error");
assert.ok(eView.html.includes("Browser pages are off limits to extensions"));
assert.ok(!eView.html.includes("Error:") && !eView.html.includes("stack"), "plain language, no stack trace");

// ---- state selection: diff beats filled, present only when unlisted -------
const noDiff: DocDiff = { formDemands: 0, pageListed: 0, unlisted: [], matched: [] };
const okFill: FillOutcome = { found: 3, filled: 3, need: [], unmappedLabels: [], declarations: [] };
assert.strictEqual(resultView(okFill, noDiff).cls, "filled");
assert.strictEqual(resultView(okFill, dd).cls, "diff");

console.log("verify: DOC DIFF (2 unlisted) + FILLED + BLOCKED + ERROR all render OK");
