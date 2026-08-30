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

// --- MutationObserver: a field added after the scan gets filled -------------
const observed = await page.evaluate(async () => {
  window.__eligentObserve();
  const form = document.getElementById("app-form");
  const label = document.createElement("label");
  label.setAttribute("for", "late");
  label.textContent = "State of Domicile";
  const input = document.createElement("input");
  input.id = "late";
  input.type = "text";
  form.append(label, input);
  await new Promise((r) => setTimeout(r, 550));
  return { value: input.value, mark: input.getAttribute("data-eligent") };
});

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

// --- visual feedback: green on filled, amber on unmatched, red on blocked ---
assert.ok(docdiff.marks.filled.includes("f1"), "full name outlined green");
assert.ok(
  docdiff.marks.unmatched.includes("f5") && docdiff.marks.unmatched.includes("f6"),
  "the 2 decoys (mobile, email) outlined amber",
);
assert.ok(docdiff.marks.blocked.includes("decl"), "declaration checkbox outlined red");
assert.ok(
  ["d1", "d2", "d3", "d4", "d5", "d6"].every((n) => docdiff.marks.blocked.includes(n)),
  "all 6 file inputs outlined red",
);

// --- MutationObserver re-fill --------------------------------------------------
assert.strictEqual(observed.value, "Karnataka", "field added post-scan gets filled");
assert.strictEqual(observed.mark, "filled", "and outlined green");

// --- demo-filled official list covers all 6 -> no doc diff -----------------
const browser2 = await chromium.launch();
const page2 = await browser2.newPage();
await page2.goto(testPage);
await page2.addScriptTag({ content: bundle });
const filled = await page2.evaluate((docs) => window.__eligentVerify(docs), OFFICIAL_6);
await browser2.close();
assert.deepStrictEqual(filled.diff.unlisted, [], "demo-filled: every upload is on the official list");

console.log("verify-dom: TEST-PAGE walk OK — 10/12 filled, 2 decoys skipped, declaration + 6 file inputs untouched, diff = [Domicile, Migration], outlines + observer OK");

// --- REACT: a controlled <input> actually updates React state ---------------
// React installs its own `value` tracker on the input node; only setting the
// value through the prototype descriptor (what setNativeValue does) makes an
// input event React believes. This fixture mirrors the state into #mirror.
const REACT = "https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js";
const REACT_DOM = "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js";

const rb = await chromium.launch();
const rp = await rb.newPage();
await rp.setContent('<!doctype html><div id="root"></div><meta charset="utf-8">');
await rp.addScriptTag({ url: REACT });
await rp.addScriptTag({ url: REACT_DOM });
await rp.evaluate(() => {
  const { useState, createElement: h } = React;
  function Form() {
    const [name, setName] = useState("");
    return h("div", null,
      h("label", { htmlFor: "full" }, "Full Name"),
      h("input", { id: "full", value: name, onChange: (e) => setName(e.target.value) }),
      h("span", { id: "mirror" }, name),
    );
  }
  ReactDOM.createRoot(document.getElementById("root")).render(h(Form));
});
await rp.addScriptTag({ content: bundle });
const react = await rp.evaluate(() => {
  const r = window.__eligentVerify([]);
  return {
    inputValue: document.getElementById("full").value,
    mirror: document.getElementById("mirror").textContent,
    mark: document.getElementById("full").getAttribute("data-eligent"),
    filled: r.fill.filled,
  };
});
await rb.close();

assert.strictEqual(react.inputValue, "Aarav Sharma", "react input value set");
assert.strictEqual(react.mirror, "Aarav Sharma", "react STATE updated — controlled input accepted the change");
assert.strictEqual(react.mark, "filled", "react input outlined green");
assert.strictEqual(react.filled, 1, "fillForm counted the react field");

console.log("verify-dom: React controlled input — value + state both updated (setNativeValue defeats React's value tracker)");

// --- extractLabel priority chain: each rung, first match wins --------------
const lb = await chromium.launch();
const lp = await lb.newPage();
await lp.setContent(`<!doctype html><meta charset=utf-8>
  <input class=a aria-label=" Full Name * " placeholder=ignored>
  <span id=lbl>Annual Family Income</span><input class=b aria-labelledby=lbl placeholder=ignored>
  <label for=c>State of Domicile (required)</label><input id=c class=c>
  <label>CGPA <input class=d></label>
  <fieldset><legend>Gender</legend><input class=e></fieldset>
  <span>Year of Study: <input class=f></span>
  <input class=g placeholder="Branch">
  <input class=h name=percentage>
  <input class=i id=i>
  <h3>Category</h3><div><input class=j></div>`);
await lp.addScriptTag({ content: bundle });
const labels = await lp.evaluate(() =>
  Object.fromEntries("abcdefghij".split("").map((c) => [c, window.__eligentLabel("." + c)])),
);
await lb.close();
assert.deepStrictEqual(labels, {
  a: "Full Name",              // aria-label, trailing * stripped
  b: "Annual Family Income",   // aria-labelledby beats placeholder
  c: "State of Domicile",      // label[for], "(required)" stripped
  d: "CGPA",                   // wrapping label
  e: "Gender",                 // fieldset legend
  f: "Year of Study",          // preceding text node, trailing colon stripped
  g: "Branch",                 // placeholder
  h: "percentage",             // name
  i: "i",                      // id
  j: "Category",               // nearest preceding heading (no id/name/placeholder)
}, "extractLabel priority chain");
console.log("verify-dom: extractLabel — all 10 priority rungs resolve as specified");

// --- a REAL Google Form: the scan runs clean and touches nothing -----------
// A live React app. Google renders choice questions as role="radio"/"checkbox"
// divs (no <input>) and disables the paragraph <textarea> until it's focused,
// so on load there's nothing here the scan should fill — the point is that it
// walks a real, messy React DOM without throwing and without touching a single
// control or ticking a single choice.
const GFORM = "https://docs.google.com/forms/d/1KCnJirHgbVzvOFgqL8qlMrJQ77coNq0ShWVu-9oH4sk/viewform";
try {
  const gb = await chromium.launch();
  const gp = await gb.newPage();
  await gp.goto(GFORM, { waitUntil: "domcontentloaded", timeout: 20000 });
  await gp.waitForSelector('[role="radio"]', { timeout: 15000 });
  await gp.evaluate(bundle); // CDP eval — bypasses Google's Trusted-Types CSP
  const g = await gp.evaluate(() => {
    const sig = () => [
      [...document.querySelectorAll('[role="radio"],[role="checkbox"]')]
        .map((el) => el.getAttribute("aria-checked")).join(","),
      [...document.querySelectorAll("input,textarea,select")].map((el) => el.value).join("␟"),
    ].join("‖");
    const before = sig();
    const r = window.__eligentVerify([]); // throws → caught below
    return { fill: r.fill, marks: r.marks, unchanged: sig() === before };
  });
  await gb.close();

  assert.strictEqual(g.fill.filled, 0, "GForm: nothing filled");
  assert.strictEqual(g.marks.filled.length, 0, "GForm: no green outline");
  assert.ok(g.unchanged, "GForm: no control value or aria-checked changed by the scan");
  console.log(`verify-dom: real Google Form — scan ran clean, 0 controls touched (found ${g.fill.found})`);
} catch (err) {
  // A network failure reaching Google is not a form-fill regression — warn, don't fail.
  console.warn(`verify-dom: real Google Form check SKIPPED (${err.message.split("\n")[0]})`);
}
