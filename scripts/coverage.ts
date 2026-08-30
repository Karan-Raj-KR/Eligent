import { evaluate } from "@opportunity/engine";
import { seedOpportunities } from "../packages/db/seed";

// Test profile
const TEST_PROFILE = {
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
console.log(`\nOpportunities seeded: ${seedOpportunities.length}`);
console.log("\nBucket counts:");
console.log(`  eligible:  ${buckets.eligible}`);
console.log(`  near_miss: ${buckets.near_miss}`);
console.log(`  rejected:  ${buckets.rejected}`);

for (const [bucket, count] of Object.entries(buckets)) {
  if (count < 3) console.log(`\n⚠️  WARNING: bucket "${bucket}" has only ${count} (< 3)`);
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
