// Run: pnpm --filter opportunity-extension test
// (esbuild bundles this to CJS and node runs it; any failed assert exits non-zero.)
import assert from "node:assert";
import { lookup } from "./mapper";

const hit: Array<[string, string]> = [
  // full_name
  ["Full Name", "full_name"],
  ["Name as per marksheet", "full_name"],
  ["Applicant Name", "full_name"],
  ["NAME_OF_CANDIDATE", "full_name"],
  // cgpa
  ["CGPA", "cgpa"],
  ["Current CGPA", "cgpa"],
  ["gpa", "cgpa"],
  // percentage
  ["Percentage", "percentage"],
  ["Aggregate Marks (%)", "percentage"],
  ["12th aggregate", "percentage"],
  // year_of_study
  ["Year of Study", "year_of_study"],
  ["Current Year", "year_of_study"],
  ["Semester", "year_of_study"],
  // branch
  ["Branch", "branch"],
  ["Course / Stream", "branch"],
  ["Discipline", "branch"],
  ["Department", "branch"],
  // state
  ["State", "state"],
  ["Domicile", "state"],
  ["State of Residence", "state"],
  // annual_family_income
  ["Annual Family Income", "annual_family_income"],
  ["Family Income (INR)", "annual_family_income"],
  ["Parental Income", "annual_family_income"],
  // institution_type
  ["Institution Type", "institution_type"],
  ["College Type", "institution_type"],
  // gender
  ["Gender", "gender"],
  ["Sex", "gender"],
  // category (bonus — present in FIELD_HINTS)
  ["Category", "category"],
  ["Caste", "category"],
];

for (const [label, key] of hit) {
  assert.strictEqual(lookup(label), key, `${label} -> expected ${key}, got ${lookup(label)}`);
}

// Must NOT match — these look close but aren't ours.
const miss = [
  "Father's Name",
  "College Name",
  "Bank Account Number",
  "Year of Passing",
  "Date of Birth",
  "Email Address",
  "Mobile Number",
  "Aadhaar Number",
  "",
  "   ",
];
for (const label of miss) {
  assert.strictEqual(lookup(label), null, `${label} -> expected null, got ${lookup(label)}`);
}

console.log(`mapper: ${hit.length} hits + ${miss.length} misses OK`);
