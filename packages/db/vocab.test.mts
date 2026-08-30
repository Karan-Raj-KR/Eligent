// npx tsx vocab.test.mts   (from packages/db)
import assert from "node:assert/strict";
import { canonicalValue, canonicalCriterionValue } from "./vocab.js";

// The exact mismatch that made a girls-only scholarship unmatchable both ways.
assert.equal(canonicalValue("gender", "female"), "Female");
assert.equal(canonicalValue("gender", "Female"), "Female");
assert.equal(canonicalValue("gender", "girls"), "Female");
assert.equal(canonicalValue("gender", "  MALE "), "Male");

assert.equal(canonicalValue("institution_type", "private"), "Private");
assert.equal(canonicalValue("category", "st"), "ST");
assert.equal(canonicalValue("category", "general (ews)"), "EWS");
assert.equal(canonicalValue("state", "karnataka"), "Karnataka");
assert.equal(canonicalValue("state", "TAMIL NADU"), "Tamil Nadu");

// Unknown values are normalised, never dropped — losing a restriction is worse.
assert.equal(canonicalValue("branch", "civil engineering"), "Civil Engineering");
assert.equal(canonicalValue("category", "Zoroastrian"), "Zoroastrian");

// Deliberate internal capitals survive: "B.arch" / "Aicte-approved" would be
// values no source page ever stated.
assert.equal(canonicalValue("branch", "B.Arch"), "B.Arch");
assert.equal(canonicalValue("institution_type", "AICTE-approved"), "AICTE-approved");
assert.equal(canonicalValue("branch", "finance and commerce"), "Finance and Commerce");
assert.equal(canonicalValue("category", "EWS"), "EWS");

// Numbers and non-categorical fields pass straight through.
assert.equal(canonicalValue("percentage", 75), 75);
assert.equal(canonicalValue("cgpa", "8.5"), "8.5");
assert.deepEqual(canonicalCriterionValue("category", ["sc", "st", "obc"]), ["SC", "ST", "OBC"]);
assert.deepEqual(canonicalCriterionValue("annual_family_income", [0, 600000]), [0, 600000]);

console.log("vocab: ok");
