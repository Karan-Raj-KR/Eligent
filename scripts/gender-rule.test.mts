// npx tsx scripts/gender-rule.test.mts
// The Kotak Kanya regression, at the extractor level: these are the exact
// sentences from the real pages that decide whether a male profile is told he
// qualifies for a girls-only scholarship.
import assert from "node:assert/strict";
import { genderRestriction } from "./harvest.js";

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const check = (name: string | null, text: string) => genderRestriction(name, text, norm(text));

// --- restrictions that MUST be caught -------------------------------------
const kanya = check(
  "Kotak Kanya Scholarship 2026-27",
  "Minimum Marks 75 %. Note: Exclusively for girl students pursuing professional graduation. Income Limit Up to 6 Lakh.",
);
assert.ok(kanya, "Kanya: exclusivity sentence must produce a criterion");
assert.equal(kanya.field, "gender");
assert.equal(kanya.operator, "eq");
assert.equal(kanya.value, "Female");
assert.equal(kanya.source_text, "Note: Exclusively for girl students pursuing professional graduation.");

// Title-only, no eligibility prose — the real L'Oréal FYWIS page.
const fywis = check(
  "L'Oréal India For Young Women in Science (FYWIS) Scholarship 2026-27",
  "L'Oréal India For Young Women in Science (FYWIS) Scholarship 2026-27. Minimum Marks 85 %. Category / Caste Open to all.",
);
assert.ok(fywis, "FYWIS: a women-only title is still a published restriction");
assert.equal(fywis.value, "Female");

assert.ok(check("Tata Realty Scholarship for Girls", "Tata Realty Scholarship for Girls. Income limit 6L."), "name: for Girls");

// --- things that are NOT restrictions -------------------------------------
assert.equal(
  check("Siemens Scholarship Program", "Benefits: laptops, stipend — 50% reserved for girls — holistic development."),
  null,
  "a 50% quota is not an eligibility restriction — boys still apply",
);
assert.equal(
  check("Buddy4Study India Foundation Scholarship", "Preference is given to female students, students with disabilities, orphans."),
  null,
  "a preference is not a restriction",
);
assert.equal(
  check("DRDO SSPL Fellowship", "Note:- Age relaxation for SC/ST/OBC candidates is applicable as per rules."),
  null,
  "an age relaxation is not a gender restriction",
);
assert.equal(check("Reliance Foundation Scholarship", "Open to all students across India."), null, "unrestricted stays unrestricted");

// --- the verbatim gate ----------------------------------------------------
assert.equal(
  genderRestriction("Kanya Scholarship", "Exclusively for girl students.", "a completely different page"),
  null,
  "a source_text that is not on the page must never ship",
);

console.log("gender-rule: ok");
