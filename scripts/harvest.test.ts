// Self-check for harvest.ts's pure logic — the parts a bad LLM response or a
// messy HTML page would actually break. Run: pnpm tsx --test scripts/harvest.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { coerceNumericValue, isPastDeadline, validateCriterion, valueMatchesOperator } from "./harvest";
import { htmlToText, normalizeWhitespace } from "./lib/html";

test("htmlToText strips scripts/styles and decodes entities", () => {
  const html = `<html><head><style>.a{color:red}</style><script>alert(1)</script></head>
    <body><p>CGPA &gt; 8.0 &amp; income &lt; 3L</p></body></html>`;
  const text = htmlToText(html);
  assert.ok(!text.includes("alert"));
  assert.ok(!text.includes("color:red"));
  assert.ok(text.includes("CGPA > 8.0 & income < 3L"));
});

test("normalizeWhitespace collapses newlines/tabs for substring matching", () => {
  assert.equal(normalizeWhitespace("a\n\n  b\tc"), "a b c");
});

test("validateCriterion accepts a criterion whose source_text is verbatim on the page", () => {
  const page = normalizeWhitespace("Applicants must have a CGPA of at least 8.0 to qualify.");
  const result = validateCriterion(
    {
      field: "cgpa",
      operator: "gte",
      value: 8.0,
      display_text: "CGPA >= 8.0",
      source_text: "Applicants must have a CGPA of at least 8.0 to qualify.",
    },
    page,
  );
  assert.ok(!("reason" in result), `expected acceptance, got rejection: ${JSON.stringify(result)}`);
});

test("validateCriterion rejects a criterion whose source_text is not on the page", () => {
  const page = normalizeWhitespace("This page never mentions any threshold.");
  const result = validateCriterion(
    { field: "cgpa", operator: "gte", value: 8.0, display_text: "x", source_text: "Made up sentence." },
    page,
  );
  assert.ok("reason" in result && result.reason.includes("not found verbatim"));
});

test("validateCriterion rejects an unknown field", () => {
  const page = normalizeWhitespace("SAT score must be at least 1200.");
  const result = validateCriterion(
    { field: "sat", operator: "gte", value: 1200, display_text: "x", source_text: "SAT score must be at least 1200." },
    page,
  );
  assert.ok("reason" in result && result.reason.includes("unknown field"));
});

test("validateCriterion rejects an unknown operator", () => {
  const page = normalizeWhitespace("Must live within 50 miles.");
  const result = validateCriterion(
    { field: "state", operator: "within", value: 50, display_text: "x", source_text: "Must live within 50 miles." },
    page,
  );
  assert.ok("reason" in result && result.reason.includes("unknown operator"));
});

test("validateCriterion rejects a value shape that doesn't match its operator", () => {
  const page = normalizeWhitespace("Applicants must be from Karnataka, Kerala, or Tamil Nadu.");
  const result = validateCriterion(
    {
      field: "state",
      operator: "in",
      value: "Karnataka", // should be an array for `in`
      display_text: "x",
      source_text: "Applicants must be from Karnataka, Kerala, or Tamil Nadu.",
    },
    page,
  );
  assert.ok("reason" in result && result.reason.includes("does not match operator"));
});

test("valueMatchesOperator validates between as a 2-number ascending tuple", () => {
  assert.equal(valueMatchesOperator("between", [1, 4]), true);
  assert.equal(valueMatchesOperator("between", [4, 1]), false);
  assert.equal(valueMatchesOperator("between", [1, 2, 3]), false);
  assert.equal(valueMatchesOperator("between", "1-4"), false);
});

test("isPastDeadline flags yesterday and clears next year", () => {
  const past = new Date();
  past.setUTCDate(past.getUTCDate() - 1);
  const future = new Date();
  future.setUTCFullYear(future.getUTCFullYear() + 1);
  assert.equal(isPastDeadline(past.toISOString().slice(0, 10)), true);
  assert.equal(isPastDeadline(future.toISOString().slice(0, 10)), false);
});

// --- numeric coercion (added with the SPA adapter work) ---

test("coerces a numeric string to a number for numeric fields", () => {
  const page = "Applicants must have scored at least 75% in Class 12.";
  const result = validateCriterion(
    {
      field: "percentage",
      operator: "gte",
      value: "75",
      display_text: "At least 75%",
      source_text: page,
    },
    page,
  );
  assert.ok(!("reason" in result), `expected acceptance, got ${JSON.stringify(result)}`);
  assert.equal(result.value, 75);
  assert.equal(typeof result.value, "number");
});

test("rejects prose the model failed to quantify rather than interpreting it", () => {
  const page = "Open to students in the first year of a graduation programme.";
  const result = validateCriterion(
    {
      field: "year_of_study",
      operator: "eq",
      value: "first year",
      display_text: "First year",
      source_text: page,
    },
    page,
  );
  assert.ok("reason" in result, "'first year' must not be silently turned into 1");
  assert.match(result.reason, /not a number/);
});

test("leaves categorical values alone", () => {
  const page = "Open for meritorious girl students across India.";
  const result = validateCriterion(
    { field: "gender", operator: "eq", value: "female", display_text: "Female", source_text: page },
    page,
  );
  assert.ok(!("reason" in result));
  assert.equal(result.value, "female");
});

test("coerces every element of an array value, or rejects the whole criterion", () => {
  const page = "Applicants in years 1 and 2 are eligible.";
  const ok = validateCriterion(
    { field: "year_of_study", operator: "in", value: ["1", "2"], display_text: "Year 1 or 2", source_text: page },
    page,
  );
  assert.ok(!("reason" in ok));
  assert.deepEqual(ok.value, [1, 2]);

  const bad = validateCriterion(
    { field: "year_of_study", operator: "in", value: ["1", "final"], display_text: "x", source_text: page },
    page,
  );
  assert.ok("reason" in bad);
});
