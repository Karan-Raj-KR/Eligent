// Real-browser check of the content-script DOM walk against TEST-PAGE.html.
// Uses Playwright (already a repo devDependency for the harvester) — no new dep,
// no Chrome extension needed.
//
// Run: node src/verify-dom.mjs   (after `pnpm build` and building verify-browser.js)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert";
import { chromium } from "playwright";

const here = fileURLToPath(new URL(".", import.meta.url));
const testPage = `file://${here}../TEST-PAGE.html`;
const bundle = readFileSync(new URL("../dist/verify-browser.js", import.meta.url), "utf8");

const OFFICIAL_4 = ["Class 10 Marksheet", "Class 12 Marksheet", "Income Certificate", "Aadhaar Card"];
const OFFICIAL_6 = [...OFFICIAL_4, "Domicile Certificate", "Migration Certificate"];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(testPage);
await page.addScriptTag({ content: bundle });

const docdiff = await page.evaluate((docs) => window.__eligentVerify(docs), OFFICIAL_4);
const values = await page.evaluate(() =>
  ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12"].map(
    (id) => document.getElementById(id).value,
  ),
);

await browser.close();

// --- DOC DIFF against TEST-PAGE: exactly the two unlisted --------------------
assert.strictEqual(docdiff.diff.formDemands, 6, "6 file inputs on the page");
assert.strictEqual(docdiff.diff.pageListed, 4);
assert.deepStrictEqual(
  docdiff.diff.unlisted,
  ["Domicile / Residence Certificate", "Migration Certificate"],
  "diff names exactly the two unlisted documents",
);

// --- FILL: mapped fields set, decoys + declaration + files untouched --------
assert.strictEqual(docdiff.fill.found, 12, "12 fillable controls (f1..f12)");
assert.strictEqual(docdiff.fill.filled, 10, "10 mapped and filled");
assert.deepStrictEqual(docdiff.fill.need.sort(), ["Email Address", "Mobile Number"], "the 2 decoys need the user");
assert.deepStrictEqual(docdiff.fill.declarations, [
  "I hereby declare that all information provided above is true and correct.",
]);
assert.strictEqual(docdiff.declarationChecked, false, "declaration checkbox never ticked");
assert.strictEqual(docdiff.fileInputsTouched, 0, "no file input value set");

assert.strictEqual(values[0], "Aarav Sharma", "full name filled");
assert.strictEqual(values[6], "8.6", "cgpa filled");
assert.strictEqual(values[8], "2nd Year", "year_of_study select matched to option");
assert.strictEqual(values[9], "Computer Science", "branch select matched");
assert.strictEqual(values[10], "Private", "institution_type select matched");
assert.strictEqual(values[4], "", "mobile decoy left empty");
assert.strictEqual(values[5], "", "email decoy left empty");

// --- demo-filled official list covers all 6 -> no doc diff -----------------
const browser2 = await chromium.launch();
const page2 = await browser2.newPage();
await page2.goto(testPage);
await page2.addScriptTag({ content: bundle });
const filled = await page2.evaluate((docs) => window.__eligentVerify(docs), OFFICIAL_6);
await browser2.close();
assert.deepStrictEqual(filled.diff.unlisted, [], "demo-filled: every upload is on the official list");

console.log("verify-dom: TEST-PAGE walk OK — 10/12 filled, 2 decoys skipped, declaration + 6 file inputs untouched, diff = [Domicile, Migration]");
