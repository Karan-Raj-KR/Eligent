# Accuracy audit

Generated from the live database by `packages/db/audit.ts`. 49 opportunities.

A verdict is only as good as the criteria behind it. This lists every row that can
produce a wrong answer, and why.

## Summary

| | count |
|---|---|
| Opportunities | 49 |
| Criteria rows | 113 |
| **Zero criteria** (pass for everyone) | **0** |
| **Unencoded restriction** (page restricts, criteria don't) | **1** |
| **Vocabulary mismatch** (can never match a profile) | **0** |

## Every opportunity

| Opportunity | Category | Criteria | Fields covered | Flags |
|---|---|---:|---|---|
| 3D Websites Hackathon | hackathon | 2 | institution_type, student_status | ok |
| Aditya Birla Capital Scholarship 2026-27: Application Form, Eligibility & Sele | scholarship | 2 | annual_family_income, percentage | ok |
| Aditya Birla Scholarship Programme 2026-27: Application Form, Eligibility & Se | scholarship | 1 | category | ok |
| Agentic Cinema: The Blockbuster Hackathon | hackathon | 1 | nationality | ok |
| AICTE Pragati Scholarship for Girl Students 2026-27 | scholarship | 4 | annual_family_income, gender, institution_type, percentage | ok |
| Amazon Future Engineer Scholarship (India) 2026-27: Application Form, Eligibil | scholarship | 4 | annual_family_income, gender, percentage, year_of_study | ok |
| Azim Premji Scholarship 2026 | scholarship | 2 | institution_type, year_of_study | ok |
| BCWD Post-Matric Scholarship, Karnataka 2027 | scholarship | 7 | annual_family_income, category, institution_type, percentage, state | ok |
| Bharti Airtel Scholarship Program 2026-27: Application Form, Eligibility & Sel | scholarship | 4 | annual_family_income, branch, gender, year_of_study | ok |
| BITS Pilani Board Topper & Alumni Endowed Scholarships 2026-27: Application Fo | scholarship | 3 | annual_family_income, category, percentage | ok |
| Buddy4Study Education Funding Program For Medical and Allied Health Sciences | scholarship | 1 | region | ok |
| Buddy4Study India Foundation Scholarship 2026-27: Application Form, Eligibilit | scholarship | 1 | annual_family_income | ok |
| CM Raitha Vidya Nidhi - Farmer's Children Scholarship (Karnataka) 2026-27 | scholarship | 1 | state | ok |
| Coursera Plus | scholarship | 1 | region | ok |
| DBT Biotech Industrial Training Programme (BITP) 2026-27 | scholarship | 2 | branch, percentage | ok |
| Digital Gujarat Scholarship Portal (Pre-Matric & Post-Matric) 2026-27 | scholarship | 2 | annual_family_income, state | ok |
| DRDO SSPL Junior Research Fellowship 2026 | scholarship | 2 | age, nationality | ok |
| DRDO SSPL Research Associate 2026 | scholarship | 4 | age, branch, experience_years, nationality | ok |
| DreamHacks 2026 | hackathon | 6 | age, student_status, team_size | ok |
| Foundation for Excellence (FFE) Scholarship 2026-27: Application Form, Eligibi | scholarship | 3 | annual_family_income, category, percentage | ok |
| GyanDhan Scholarship 2026-27: Application Form, Eligibility & Selection List | scholarship | 2 | annual_family_income, branch | ok |
| Hack the Habitat | hackathon | 2 | student_status, team_size | ok |
| Hack The Limit | hackathon | 1 | student_status | ok |
| Hacksocial 2026 | hackathon | 2 | age, student_status | ok |
| Infosys Foundation STEM Stars Scholarship Program 2026-27: Application Form, E | scholarship | 3 | annual_family_income, gender, region | ok |
| JSPN Scholarship 2026-27 | scholarship | 1 | nationality | ok |
| KJSSE CSI Gemini Hackday | hackathon | 2 | student_status, team_size | ok |
| Kotak Kanya Scholarship 2026-27: Application Form, Eligibility & Selection Lis | scholarship | 5 | annual_family_income, branch, gender, percentage, year_of_study | ok |
| L'Or'éal India For Young Women in Science (FYWIS) Scholarship 2026-27: Applica | scholarship | 4 | annual_family_income, gender, percentage | ok |
| Labour Department Scheme for Unorganized Workers' Children (Karnataka) 2026-27 | scholarship | 4 | annual_family_income, percentage, state | ok |
| LIC HFL Vidyadhan Scholarship 2026-27: Application Form, Eligibility & Selecti | scholarship | 2 | annual_family_income, percentage | ok |
| Narotam Sekhsaria Postgraduate Scholarship 2026-27: Application Form, Eligibil | scholarship | 1 | percentage | ok |
| NSP Financial Assistance for Education to the Wards of Beedi/Cine/Iomc/Lsdm, P | scholarship | 1 | nationality | ok |
| OP Jindal Engineer & Management Scholarships 2026 | scholarship | 1 | branch | ok |
| OP Jindal Engineering & Management Scholarship 2026-27: Application Form, Elig | scholarship | 1 | category | ok |
| Practice Submission | hackathon | 2 | student_status, team_size | ok |
| Raman Kant Munjal Scholarship 2026-27: Application Form, Eligibility & Selecti | scholarship | 4 | annual_family_income, branch, percentage, year_of_study | ok |
| Reliance Foundation Scholarship 2026-27: UG Apply Online, Eligibility & Select | scholarship | 2 | annual_family_income, year_of_study | ok |
| SBI Asha Scholarship 2026-27: ₹15,000 - Eligibility, Last Date & Apply Online | scholarship | 3 | annual_family_income, cgpa, percentage | ok |
| SemiCon Hackathon - Explore, Innovate & Build with Semiconductors - IIT Bombay | hackathon | 1 | team_size | ok |
| Siemens Scholarship Program 2026-27: Application Form, Eligibility & Selection | scholarship | 2 | annual_family_income, category | UNENCODED |
| Simplify building your tech stack with AI | hackathon | 1 | age | ok |
| SSP Pre-Matric & Post-Matric Scholarship (Karnataka) 2026-27 | scholarship | 2 | category, state | ok |
| STEP eLearn – General Communication Online (10% Discount) | scholarship | 1 | nationality | ok |
| STEP eLearn – General Communication Online (54% Discount) | scholarship | 1 | nationality | ok |
| TATA AIA PARAS Scholarship 2026-27: Application Form, Eligibility & Selection  | scholarship | 2 | annual_family_income, percentage | ok |
| Tata Realty Scholarship for Girls 2026-27: Application Form, Eligibility & Sel | scholarship | 4 | annual_family_income, branch, gender, percentage | ok |
| The Great Agent Hackathon | hackathon | 1 | team_size | ok |
| VIT B.Tech GV School Development Programme (GVSDP) Merit Scholarship 2026-27:  | scholarship | 2 | annual_family_income, percentage | ok |

## Zero criteria — the biggest accuracy risk

These return `eligible` for every profile, because `evaluate()` with an empty criteria list has nothing to fail on. Either they get a real criterion with a verbatim quote, or they leave the catalogue.

_None._

## Unencoded restrictions

The page states a limit that no criterion encodes, so ineligible students are told they qualify. This is the Kotak Kanya class of bug.

### Siemens Scholarship Program 2026-27: Application Form, Eligibility & Selection List
- https://www.indiascholarships.in/scholarships/siemens-scholarship-program
- category: scholarship, criteria: 2 (annual_family_income, category)
- **UNENCODED**: domicile: Selected States — no `state` criterion. Page says: "Domicile State Selected States"

## Vocabulary mismatches

The stored value cannot `===` any value a profile holds, so the criterion silently rejects (or passes) everyone. Fixed by canonicalising both sides — see `packages/db/vocab.ts`.

_None._
