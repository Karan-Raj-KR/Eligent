// npx tsx vocab.test.mts   (from packages/db)
import assert from "node:assert/strict";
import { canonicalValue, canonicalCriterion } from "./vocab.js";

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
assert.deepEqual(canonicalCriterion({ field: "category", operator: "in", value: ["sc", "st", "obc"] }), { operator: "in", value: ["SC", "ST", "OBC"] });
assert.deepEqual(canonicalCriterion({ field: "annual_family_income", operator: "between", value: [0, 600000] }), { operator: "between", value: [0, 600000] });

// Branch: a CSE student must match an engineering scholarship, and must NOT
// match a medical-only one.
const engineering = canonicalCriterion({ field: "branch", operator: "in", value: ["Engineering", "Medical", "Law"] }).value as string[];
assert.ok(engineering.includes("Computer Science"), "a CS student is an engineering student");
assert.ok(engineering.includes("Engineering"), "the page's own wording survives");
assert.ok(!engineering.includes("MBBS"), "expansion must never invent unrelated branches");
const medical = canonicalCriterion({ field: "branch", operator: "in", value: ["Medical"] }).value as string[];
assert.ok(!medical.includes("Computer Science"), "medical-only stays closed to engineers");
assert.deepEqual(canonicalCriterion({ field: "branch", operator: "eq", value: "B.Arch" }), { operator: "eq", value: "B.Arch" }, "an unmapped branch is left exactly as published");

// Widening a scalar MUST carry the operator with it — `eq` holding an array is
// a hard failure in evaluate(), i.e. everyone rejected.
assert.deepEqual(canonicalCriterion({ field: "branch", operator: "eq", value: "Engineering" }), {
  operator: "in",
  value: ["Engineering", "Computer Science", "Electronics", "Mechanical", "Civil", "Chemical", "CSE"],
});
// An exclusion list is never widened — that would lock people out, not in.
assert.deepEqual(canonicalCriterion({ field: "branch", operator: "not_in", value: ["Engineering"] }), {
  operator: "not_in",
  value: ["Engineering"],
});

console.log("vocab: ok");
