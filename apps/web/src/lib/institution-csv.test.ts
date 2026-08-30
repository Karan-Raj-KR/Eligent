// Standalone self-check: `npx tsx src/lib/institution-csv.test.ts`
import assert from "node:assert/strict";
import { parseAmount, parseCsv } from "./institution-csv";

const rows = parseCsv(
  'name,cgpa,percentage,year,branch,state,family_income,institution_type,gender\n' +
    '"Doe, Jane",8.5,85,2,Computer Science,Karnataka,"3,00,000",Government,Female\n' +
    'No CGPA,,70,1,Civil,Delhi,900000,Private,Male\n',
);

assert.equal(rows.length, 2);
assert.deepEqual(rows[0], {
  cgpa: 8.5,
  percentage: 85,
  year_of_study: 2,
  branch: "Computer Science",
  state: "Karnataka",
  annual_family_income: 300000,
  institution_type: "Government",
  gender: "Female",
});
// name is never mapped, and blank cells stay absent (engine treats missing as a hard fail).
assert.equal("name" in rows[0], false);
assert.equal("cgpa" in rows[1], false);
assert.deepEqual(parseCsv("only,a,header"), []);

assert.equal(parseAmount("₹1.5 Lakh+"), 150000);
assert.equal(parseAmount("₹50k+"), 50000);
assert.equal(parseAmount("₹2 Crore"), 20000000);
assert.equal(parseAmount("Rs. 2,00,000"), 200000);
assert.equal(parseAmount("Varies"), null);
assert.equal(parseAmount(null), null);

console.log("institution-csv: ok");
