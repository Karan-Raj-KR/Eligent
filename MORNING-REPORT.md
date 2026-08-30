# Morning Report - Overnight Run

## Status: IN PROGRESS

Started: 2026-08-30 (overnight run)

---

## TASK 1 — GET REAL DATA IN

### Diagnostics - CURRENT STATUS

#### Seed File Loaded to Supabase
- ✅ **19 opportunities** loaded successfully
- ✅ **76 criteria** loaded successfully
- ✅ Supabase now has **22 rows** in opportunity table

#### Coverage Report - PROBLEM IDENTIFIED

**Test Profile**: CGPA 8.4, percentage 82, year 2, CSE, Karnataka, income 3L, private institution, General, male

**Current Bucket Counts**:
```
  eligible:  1  ⚠️ (needs 3)
  near_miss: 0  ⚠️ (needs 3)
  rejected:  18
```

**Root Cause Analysis**:
- Most scholarships target **specific states** (Gujarat, Maharashtra, Kerala, Telangana, HP) — not Karnataka
- Many target **specific categories** (SC, ST, OBC, Minority) — our profile is General
- Several target **high school students** (year_of_study 9-12) — our profile is year 2 UG
- Some are **female-only** — our profile is male
- Income limits often too low (1L, 2.5L) — our profile is 3L annual_family_income

### Why Buddy4Study URLs Weren't Harvested

Looking at `scripts/urls.txt` — all 20 URLs are from `indiascholarships.in`. The `discover.ts` script filters Buddy4Study links to only match `/scholarship/<slug>` pattern, but those still need to be discovered from the listing pages.

### Current Sources (scripts/sources.txt)
1. https://www.buddy4study.com/scholarships/engineering  ← **NOT HARVESTED YET**
2. https://www.buddy4study.com/scholarships/karnataka   ← **NOT HARVESTED YET**  
3. https://www.indiascholarships.in/scholarships       ← ✅ Harvested

### Action Plan to Fix Coverage

1. **Run discover.ts** on Buddy4Study URLs to get new scholarship links
2. **Find Karnataka-specific UG engineering scholarships** that match:
   - year_of_study: 1-4 (UG level)
   - state: Karnataka or "All India"
   - category: General or "All"
   - annual_family_income: >= 300000
   - percentage: <= 82 or CGPA <= 8.4

3. **Add targeted URLs** for Karnataka scholarships if discover doesn't yield enough

---

## TASK 2 — REPLACE FRONTEND

Status: NOT STARTED (blocked on Task 1)

---

## Summary

| Task | Status | Notes |
|------|--------|-------|
| Task 1: Load to DB | ✅ Done | 19 opps, 76 criteria loaded |
| Task 1: Coverage | ❌ Failed | Only 1 eligible, 0 near_miss |
| Task 1: Discover | 🔄 Next | Run on Buddy4Study URLs |
| Task 2: Frontend | Pending | Not started |

---

## Files Modified So Far

1. Created `scripts/coverage.ts` - test coverage report tool
2. Created `.env.local` - Supabase credentials (from .env.example)
3. Created `MORNING-REPORT.md` - this file
