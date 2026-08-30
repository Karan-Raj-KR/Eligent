import { evaluate } from "@opportunity/engine";
import { fetchPageAuto } from "./lib/fetch-cache";
import { pageRecords } from "./lib/page-records";

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

async function testUrl(url: string) {
  const fetched = await fetchPageAuto(url);
  if ("error" in fetched) {
    console.log(url, "fetch error:", fetched.error);
    return;
  }
  const records = pageRecords(fetched.html, url);
  for (const r of records) {
    console.log("\n---", r.name, "---");
    console.log("text snippet:", r.text.slice(0, 300));
  }
}

async function main() {
  const urls = [
    "https://www.indiascholarships.in/scholarships/ashoka-university-merit-scholarships",
    "https://www.indiascholarships.in/scholarships/colgate-keep-india-smiling-scholarship",
    "https://www.indiascholarships.in/scholarships/dr-hargobind-khurana-scholarship-scheme",
    "https://www.indiascholarships.in/scholarships/haryana-state-merit-scholarship",
    "https://www.indiascholarships.in/scholarships/uttarakhand-state-merit-scholarship",
    "https://www.indiascholarships.in/scholarships/tata-trusts-education-grants",
    "https://www.indiascholarships.in/scholarships/lic-golden-jubilee-scholarship",
  ];

  for (const u of urls) {
    await testUrl(u);
  }
}

main();
