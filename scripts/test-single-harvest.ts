import { evaluate, Criterion } from "@opportunity/engine";
import { harvestUrl } from "./harvest";

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

async function main() {
  const urls = [
    "https://www.indiascholarships.in/scholarships/infosys-foundation-stem-stars-scholarship-program",
    "https://www.indiascholarships.in/scholarships/pm-yashasvi-scholarship",
    "https://www.indiascholarships.in/scholarships/nit-surathkal-merit-cum-means-scholarships",
    "https://www.indiascholarships.in/scholarships/pm-yasasvi-top-class-education",
    "https://www.indiascholarships.in/scholarships/idfc-first-bank-mba-scholarship",
  ];

  for (const u of urls) {
    const res = await harvestUrl(u);
    for (const entry of res) {
      if (!entry.name) continue;
      const result = evaluate(TEST_PROFILE, entry.accepted as Criterion[]);
      console.log(`[${result.status.toUpperCase()}] ${entry.name}`);
      console.log("  Criteria:", entry.accepted.map(c => `${c.field} ${c.operator} ${JSON.stringify(c.value)}`).join(", "));
      if (result.failed.length > 0) {
        console.log("  Failed:", JSON.stringify(result.failed));
      }
    }
  }
}

main();
