# Accuracy audit

Generated from the live database by `packages/db/audit.ts`. 55 opportunities.

A verdict is only as good as the criteria behind it. This lists every row that can
produce a wrong answer, and why.

## Summary

| | count |
|---|---|
| Opportunities | 55 |
| Criteria rows | 89 |
| **Zero criteria** (pass for everyone) | **17** |
| **Unencoded restriction** (page restricts, criteria don't) | **3** |
| **Vocabulary mismatch** (can never match a profile) | **6** |

## Every opportunity

| Opportunity | Category | Criteria | Fields covered | Flags |
|---|---|---:|---|---|
| 3D Websites Hackathon | hackathon | 0 | — | ZERO |
| Aditya Birla Capital Scholarship 2026-27: Application Form, Eligibility & Sele | scholarship | 2 | annual_family_income, percentage | ok |
| Aditya Birla Scholarship Programme 2026-27: Application Form, Eligibility & Se | scholarship | 1 | category | ok |
| Agentic Cinema: The Blockbuster Hackathon | hackathon | 0 | — | ZERO |
| AICTE Pragati Scholarship for Girl Students 2026-27 | scholarship | 4 | annual_family_income, gender, institution_type, percentage | ok |
| All Things Agentic Hackathon | hackathon | 0 | — | ZERO |
| Amazon Future Engineer Scholarship (India) 2026-27: Application Form, Eligibil | scholarship | 4 | annual_family_income, gender, percentage, year_of_study | VOCAB |
| Azim Premji Scholarship 2026 | scholarship | 2 | institution_type, year_of_study | ok |
| BCWD Post-Matric Scholarship, Karnataka 2027 | scholarship | 7 | annual_family_income, category, institution_type, percentage, state | ok |
| Bharti Airtel Scholarship Program 2026-27: Application Form, Eligibility & Sel | scholarship | 4 | annual_family_income, branch, gender, year_of_study | VOCAB |
| BITS Pilani Board Topper & Alumni Endowed Scholarships 2026-27: Application Fo | scholarship | 3 | annual_family_income, category, percentage | ok |
| Buddy4Study Education Funding Program For Medical and Allied Health Sciences | scholarship | 1 | region | ok |
| Buddy4Study India Foundation Scholarship 2026-27: Application Form, Eligibilit | scholarship | 1 | annual_family_income | ok |
| CM Raitha Vidya Nidhi - Farmer's Children Scholarship (Karnataka) 2026-27 | scholarship | 1 | state | ok |
| Coursera Plus | scholarship | 0 | — | ZERO |
| DBT Biotech Industrial Training Programme (BITP) 2026-27 | scholarship | 2 | branch, percentage | ok |
| Digital Gujarat Scholarship Portal (Pre-Matric & Post-Matric) 2026-27 | scholarship | 2 | annual_family_income, state | ok |
| DRDO SSPL Junior Research Fellowship 2026 | scholarship | 2 | age, nationality | ok |
| DRDO SSPL Research Associate 2026 | scholarship | 4 | age, branch, experience_years, nationality | ok |
| DreamHacks 2026 | hackathon | 0 | — | ZERO |
| Foundation for Excellence (FFE) Scholarship 2026-27: Application Form, Eligibi | scholarship | 3 | annual_family_income, category, percentage | ok |
| GyanDhan Scholarship 2026-27: Application Form, Eligibility & Selection List | scholarship | 2 | annual_family_income, branch | ok |
| Hack the Habitat | hackathon | 0 | — | ZERO |
| Hack The Limit | hackathon | 0 | — | ZERO |
| Hacksocial 2026 | hackathon | 0 | — | ZERO |
| Infosys Foundation STEM Stars Scholarship Program 2026-27: Application Form, E | scholarship | 3 | annual_family_income, gender, region | VOCAB |
| JSPN Scholarship 2026-27 | scholarship | 1 | nationality | ok |
| KJSSE CSI Gemini Hackday | hackathon | 0 | — | ZERO |
| Kotak Kanya Scholarship 2026-27: Application Form, Eligibility & Selection Lis | scholarship | 2 | annual_family_income, percentage | UNENCODED |
| L'Or'éal India For Young Women in Science (FYWIS) Scholarship 2026-27: Applica | scholarship | 4 | annual_family_income, percentage | UNENCODED |
| Labour Department Scheme for Unorganized Workers' Children (Karnataka) 2026-27 | scholarship | 4 | annual_family_income, percentage, state | ok |
| LIC HFL Vidyadhan Scholarship 2026-27: Application Form, Eligibility & Selecti | scholarship | 2 | annual_family_income, percentage | ok |
| Midnight Hackathon: August 2026 | hackathon | 0 | — | ZERO |
| Narotam Sekhsaria Postgraduate Scholarship 2026-27: Application Form, Eligibil | scholarship | 1 | percentage | ok |
| NSP Financial Assistance for Education to the Wards of Beedi/Cine/Iomc/Lsdm, P | scholarship | 1 | nationality | ok |
| OP Jindal Engineer & Management Scholarships 2026 | scholarship | 1 | branch | ok |
| OP Jindal Engineering & Management Scholarship 2026-27: Application Form, Elig | scholarship | 1 | category | ok |
| Practice Submission | hackathon | 0 | — | ZERO |
| Raman Kant Munjal Scholarship 2026-27: Application Form, Eligibility & Selecti | scholarship | 4 | annual_family_income, branch, percentage, year_of_study | VOCAB |
| Reliance Foundation Scholarship 2026-27: UG Apply Online, Eligibility & Select | scholarship | 2 | annual_family_income, year_of_study | ok |
| SBI Asha Scholarship 2026-27: ₹15,000 - Eligibility, Last Date & Apply Online | scholarship | 3 | annual_family_income, cgpa, percentage | ok |
| SemiCon Hackathon - Explore, Innovate & Build with Semiconductors - IIT Bombay | hackathon | 1 | team_size | ok |
| Siemens Scholarship Program 2026-27: Application Form, Eligibility & Selection | scholarship | 2 | annual_family_income, category | UNENCODED |
| Simplify building your tech stack with AI | hackathon | 0 | — | ZERO |
| Smart City Hackathon Lahore | hackathon | 0 | — | ZERO |
| SSP Pre-Matric & Post-Matric Scholarship (Karnataka) 2026-27 | scholarship | 2 | category, state | VOCAB |
| STEP eLearn – General Communication Online (10% Discount) | scholarship | 1 | nationality | ok |
| STEP eLearn – General Communication Online (54% Discount) | scholarship | 1 | nationality | ok |
| TATA AIA PARAS Scholarship 2026-27: Application Form, Eligibility & Selection  | scholarship | 2 | annual_family_income, percentage | ok |
| Tata Realty Scholarship for Girls 2026-27: Application Form, Eligibility & Sel | scholarship | 4 | annual_family_income, branch, gender, percentage | VOCAB |
| The Great Agent Hackathon | hackathon | 0 | — | ZERO |
| The WebMCP Challenge | hackathon | 0 | — | ZERO |
| Veteran Innovation Hackathon | hackathon | 0 | — | ZERO |
| VIT B.Tech GV School Development Programme (GVSDP) Merit Scholarship 2026-27:  | scholarship | 2 | annual_family_income, percentage | ok |
| VLSI Design Internship at Kukbit SL | internship | 0 | — | ZERO |

## Zero criteria — the biggest accuracy risk

These return `eligible` for every profile, because `evaluate()` with an empty criteria list has nothing to fail on. Either they get a real criterion with a verbatim quote, or they leave the catalogue.

### 3D Websites Hackathon
- https://3d-websites-hackathon.devpost.com/
- category: hackathon, criteria: 0 (—)
- **ZERO**: no criteria — passes for every profile

### Agentic Cinema: The Blockbuster Hackathon
- https://agentic-cinema.devpost.com
- category: hackathon, criteria: 0 (—)
- **ZERO**: no criteria — passes for every profile

### All Things Agentic Hackathon
- https://allthingsagentichackathon.devpost.com
- category: hackathon, criteria: 0 (—)
- **ZERO**: no criteria — passes for every profile

### Coursera Plus
- https://imp.i384100.net/c/7449621/4017009/14726
- category: scholarship, criteria: 0 (—)
- **ZERO**: no criteria — passes for every profile

### DreamHacks 2026
- https://dreamhacks-gt.devpost.com/
- category: hackathon, criteria: 0 (—)
- **ZERO**: no criteria — passes for every profile

### Hack the Habitat
- https://hack-the-habitat-2026.devpost.com/
- category: hackathon, criteria: 0 (—)
- **ZERO**: no criteria — passes for every profile

### Hack The Limit
- https://hack-the-limit-1.devpost.com/
- category: hackathon, criteria: 0 (—)
- **ZERO**: no criteria — passes for every profile

### Hacksocial 2026
- https://hacksocial2026.devpost.com/
- category: hackathon, criteria: 0 (—)
- **ZERO**: no criteria — passes for every profile

### KJSSE CSI Gemini Hackday
- https://kjsse-csi-gemini-hackday.devpost.com/
- category: hackathon, criteria: 0 (—)
- **ZERO**: no criteria — passes for every profile

### Midnight Hackathon: August 2026
- https://midnight-hackathon-august-2026.devpost.com/
- category: hackathon, criteria: 0 (—)
- **ZERO**: no criteria — passes for every profile

### Practice Submission
- https://practice-submission.devpost.com/
- category: hackathon, criteria: 0 (—)
- **ZERO**: no criteria — passes for every profile

### Simplify building your tech stack with AI
- https://stripedhakahackathon.devpost.com/
- category: hackathon, criteria: 0 (—)
- **ZERO**: no criteria — passes for every profile

### Smart City Hackathon Lahore
- https://smart-city-hackathon-lahore.devpost.com/
- category: hackathon, criteria: 0 (—)
- **ZERO**: no criteria — passes for every profile

### The Great Agent Hackathon
- https://the-great-agent-hackathon.devpost.com/
- category: hackathon, criteria: 0 (—)
- **ZERO**: no criteria — passes for every profile

### The WebMCP Challenge
- https://webmcp.devpost.com
- category: hackathon, criteria: 0 (—)
- **ZERO**: no criteria — passes for every profile

### Veteran Innovation Hackathon
- https://veteran-innovation-hackathon.devpost.com/
- category: hackathon, criteria: 0 (—)
- **ZERO**: no criteria — passes for every profile

### VLSI Design Internship at Kukbit SL
- https://unstop.com/internships/vlsi-design-internship-kukbit-sl-1737771
- category: internship, criteria: 0 (—)
- **ZERO**: no criteria — passes for every profile

## Unencoded restrictions

The page states a limit that no criterion encodes, so ineligible students are told they qualify. This is the Kotak Kanya class of bug.

### Kotak Kanya Scholarship 2026-27: Application Form, Eligibility & Selection List
- https://www.indiascholarships.in/scholarships/kotak-kanya-scholarship
- category: scholarship, criteria: 2 (annual_family_income, percentage)
- **UNENCODED**: girls/women only — no `gender` criterion. Page says: "Note: Exclusively for girl students pursuing professional graduation."

### L'Or'éal India For Young Women in Science (FYWIS) Scholarship 2026-27: Application Form, Eligibility & Selection List
- https://www.indiascholarships.in/scholarships/loreal-fyws-scholarship
- category: scholarship, criteria: 4 (annual_family_income, percentage)
- **UNENCODED**: girls/women only — no `gender` criterion. Page says: "title says "L'Or'éal India For Young Women in Science (FYWIS) Scholarship 2026-27: Application Form, Eligibility & Selection List""

### Siemens Scholarship Program 2026-27: Application Form, Eligibility & Selection List
- https://www.indiascholarships.in/scholarships/siemens-scholarship-program
- category: scholarship, criteria: 2 (annual_family_income, category)
- **UNENCODED**: domicile: Selected States — no `state` criterion. Page says: "Domicile State Selected States"

## Vocabulary mismatches

The stored value cannot `===` any value a profile holds, so the criterion silently rejects (or passes) everyone. Fixed by canonicalising both sides — see `packages/db/vocab.ts`.

### Amazon Future Engineer Scholarship (India) 2026-27: Application Form, Eligibility & Selection List
- https://www.indiascholarships.in/scholarships/amazon-future-engineer-scholarship-india
- category: scholarship, criteria: 4 (annual_family_income, gender, percentage, year_of_study)
- **VOCAB**: gender "female" → canonical "Female"

### Bharti Airtel Scholarship Program 2026-27: Application Form, Eligibility & Selection List
- https://www.indiascholarships.in/scholarships/bharti-airtel-scholarship-program
- category: scholarship, criteria: 4 (annual_family_income, branch, gender, year_of_study)
- **VOCAB**: branch "engineering" → canonical "Engineering"
- **VOCAB**: gender "female" → canonical "Female"

### Infosys Foundation STEM Stars Scholarship Program 2026-27: Application Form, Eligibility & Selection List
- https://www.indiascholarships.in/scholarships/infosys-foundation-stem-stars-scholarship-program
- category: scholarship, criteria: 3 (annual_family_income, gender, region)
- **VOCAB**: gender "female" → canonical "Female"

### Raman Kant Munjal Scholarship 2026-27: Application Form, Eligibility & Selection List
- https://www.indiascholarships.in/scholarships/raman-kant-munjal-scholarship
- category: scholarship, criteria: 4 (annual_family_income, branch, percentage, year_of_study)
- **VOCAB**: branch "finance and commerce" → canonical "Finance and Commerce"

### SSP Pre-Matric & Post-Matric Scholarship (Karnataka) 2026-27
- https://www.indiascholarships.in/scholarships/ssp-pre-matric-post-matric-scholarship-karnataka
- category: scholarship, criteria: 2 (category, state)
- **VOCAB**: category ["SC","ST","OBC","Minority","General (EWS)"] → canonical ["SC","ST","OBC","Minority","EWS"]

### Tata Realty Scholarship for Girls 2026-27: Application Form, Eligibility & Selection List
- https://www.indiascholarships.in/scholarships/tata-realty-scholarship-for-girls
- category: scholarship, criteria: 4 (annual_family_income, branch, gender, percentage)
- **VOCAB**: gender "female" → canonical "Female"
