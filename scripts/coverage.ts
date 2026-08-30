import { evaluate } from "@opportunity/engine";
import { seedOpportunities } from "../packages/db/seed";
import { canonicalValue } from "../packages/db/vocab";

// The agreed test profile, written exactly as the brief states it.
const SPEC_PROFILE = {
  cgpa: 8.4,
  percentage: 82,
  year_of_study: 2,
  branch: "CSE",
  state: "Karnataka",
  annual_family_income: 300000,
  institution_type: "private",
  category: "General",
  gender: "male",
};

// What this student's row ACTUALLY holds. POST /api/profile canonicalises
// categorical values on save, so "private" is stored as "Private". Evaluating
// the raw spelling instead would measure a profile no student can have, and
// the engine compares categorical values with ===.
const TEST_PROFILE = Object.fromEntries(
  Object.entries(SPEC_PROFILE).map(([field, value]) => [field, canonicalValue(field, value)]),
) as typeof SPEC_PROFILE;

const buckets = { eligible: 0, near_miss: 0, rejected: 0 };
const details: Record<string, Array<{ name: string; failed: string[] }>> = {
  eligible: [],
  near_miss: [],
  rejected: [],
};

for (const opp of seedOpportunities) {
  const criteria = opp.criteria.map((c) => ({
    field: c.field,
    operator: c.operator as "gte" | "lte" | "eq" | "in" | "not_in" | "between",
    value: c.value,
    display_text: c.display_text,
    source_text: c.source_text,
  }));

  const result = evaluate(TEST_PROFILE, criteria);
  buckets[result.status]++;
  details[result.status].push({
    name: opp.name,
    failed: result.failed.map((f) => f.field),
  });
}

console.log("\n=== COVERAGE REPORT ===");
console.log(`Test profile: CGPA 8.4, percentage 82, year 2, CSE, Karnataka, income 3L, private institution, General, male`);
const canonicalised = Object.keys(SPEC_PROFILE).filter(
  (k) => (SPEC_PROFILE as Record<string, unknown>)[k] !== (TEST_PROFILE as Record<string, unknown>)[k],
);
if (canonicalised.length > 0) {
  console.log(`  (stored canonically as: ${canonicalised.map((k) => `${k}="${(TEST_PROFILE as Record<string, string>)[k]}"`).join(", ")})`);
}
console.log(`\nOpportunities in catalog: ${seedOpportunities.length}  (target: 40)`);

// The accuracy gate: a criterion-less opportunity returns `eligible` for every
// student alive, so it is counted here and must be zero.
const noCriteria = seedOpportunities.filter((o) => o.criteria.length === 0);
console.log(`Opportunities with ZERO criteria: ${noCriteria.length}  (gate: 0)`);
for (const o of noCriteria) console.log(`  ⚠️  ${o.name}`);

const byCategory = new Map<string, number>();
for (const o of seedOpportunities) byCategory.set(o.category, (byCategory.get(o.category) ?? 0) + 1);
console.log("\nRows per category:");
for (const [cat, n] of [...byCategory].sort()) console.log(`  ${cat}: ${n}`);

const fundedScholarships = seedOpportunities.filter(
  (o) => o.category === "scholarship" || (o.category === "programme" && o.funded),
).length;
console.log(`\nScholarships or funded programmes: ${fundedScholarships}  (gate: >= 8)`);

console.log("\nBucket counts:");
console.log(`  eligible:  ${buckets.eligible}`);
console.log(`  near_miss: ${buckets.near_miss}`);
console.log(`  rejected:  ${buckets.rejected}`);

if (fundedScholarships < 8) console.log(`\n⚠️  GATE: only ${fundedScholarships} scholarships / funded programmes (< 8)`);
for (const [bucket, count] of Object.entries(buckets)) {
  if (count < 3) console.log(`\n⚠️  GATE: bucket "${bucket}" has only ${count} (< 3)`);
}

if (details.eligible.length > 0) {
  console.log("\nEligible opportunities:");
  details.eligible.forEach((o) => console.log(`  - ${o.name}`));
}
if (details.near_miss.length > 0) {
  console.log("\nNear-miss opportunities:");
  details.near_miss.forEach((o) => console.log(`  - ${o.name} (failed: ${o.failed.join(", ")})`));
}
if (details.rejected.length > 0) {
  console.log("\nRejected opportunities (first 5):");
  details.rejected.slice(0, 5).forEach((o) => console.log(`  - ${o.name} (failed: ${o.failed.join(", ")})`));
}
