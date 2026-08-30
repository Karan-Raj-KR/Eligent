import { evaluate, type Profile, type Criterion } from "@opportunity/engine";
import { seedOpportunities } from "../packages/db/seed";

const TEST_PROFILE: Profile = {
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

console.log("Test Profile:", JSON.stringify(TEST_PROFILE, null, 2));
console.log("\n=== Checking each scholarship ===\n");

for (const opp of seedOpportunities) {
  const criteria: Criterion[] = opp.criteria.map((c) => ({
    field: c.field,
    operator: c.operator as Criterion["operator"],
    value: c.value,
    display_text: c.display_text,
    source_text: c.source_text,
  }));

  console.log(`\n--- ${opp.name} ---`);
  console.log(`Criteria:`);
  for (const c of criteria) {
    console.log(`  ${c.field} ${c.operator} ${JSON.stringify(c.value)}`);
  }

  const result = evaluate(TEST_PROFILE, criteria);
  console.log(`\nResult: ${result.status}`);
  console.log(`Passed: ${result.passed.map((p) => p.field).join(", ") || "none"}`);
  console.log(`Failed: ${result.failed.map((f) => `${f.field} (profile: ${f.profileValue}, required: ${JSON.stringify(f.requirement)})`).join(", ") || "none"}`);
}
