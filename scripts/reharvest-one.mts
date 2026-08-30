// Re-harvest a single URL through the real pipeline and print what it produces.
//   npx tsx --env-file=apps/web/.env.local scripts/reharvest-one.mts <url>...
import { evaluate } from "@opportunity/engine";
import { harvestUrl } from "./harvest.js";

const MALE = { cgpa: 8.4, percentage: 82, year_of_study: 2, branch: "CSE", state: "Karnataka", annual_family_income: 300000, institution_type: "Private", category: "General", gender: "Male" };
const FEMALE = { ...MALE, gender: "Female" };

for (const url of process.argv.slice(2)) {
  for (const entry of await harvestUrl(url)) {
    console.log(`\n=== ${entry.name ?? "(no name)"}`);
    console.log(`    status: ${entry.fetchStatus}, accepted: ${entry.accepted.length}, rejected: ${entry.rejectedCriteria.length}`);
    for (const c of entry.accepted) console.log(`      ✓ ${c.field} ${c.operator} ${JSON.stringify(c.value)}  |  "${c.source_text.slice(0, 100)}"`);
    for (const r of entry.rejectedCriteria) console.log(`      ✗ ${JSON.stringify(r.raw)} — ${r.reason}`);
    const crit = entry.accepted as never;
    console.log(`    MALE   -> ${evaluate(MALE, crit).status}`);
    console.log(`    FEMALE -> ${evaluate(FEMALE, crit).status}`);
  }
}
