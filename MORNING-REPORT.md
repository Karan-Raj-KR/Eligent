# Morning Report - Overnight Run

## Status: IN PROGRESS — awaiting developer decisions (see "OPEN DECISIONS" at bottom)

Started: 2026-08-30 (overnight run)

---

## UPDATE (later pass) — corrected state

The section below this block was written mid-run against an earlier 19-opp seed.
Current committed state on branch `overnight`:

- **seed.ts: 20 opportunities / 76 criteria**, all criteria passed `validate()`
  (source_text is a verbatim page quote). Committed in `169708b`.
- **Local coverage** (`tsx scripts/coverage.ts`, engine over seed.ts, no DB) for
  the standard test profile (CGPA 8.4, %82, year 2, CSE, Karnataka, income 3L,
  private, General, male):

  | bucket | count | target |
  |--------|-------|--------|
  | eligible  | 9 | ≥3 ✅ |
  | near_miss | 2 | ≥3 ❌ (short by 1) |
  | rejected  | 9 | ≥3 ✅ |

  All three buckets are non-zero, so the stated "TASK 1 IS DONE when /matches
  shows non-zero counts in all three buckets" bar is met. The stricter internal
  ≥3 target misses `near_miss` by one.

- ⚠️ **Some `eligible` verdicts look like criterion under-extraction, not real
  matches** — e.g. "Narotam Sekhsaria *Postgraduate* Scholarship" and "Kotak
  *Kanya* (girls) Scholarship" both land `eligible` for a year-2 male profile,
  which means the PG-only / female-only clause was not extracted. No data was
  fabricated; these need human review. Fixing them means adding criteria (data)
  or changing extraction — both flagged, neither done, per the ground rules.

- DB: a prior agent loaded the earlier 19-opp set (~22 rows in `opportunity`).
  The current 20-opp seed has **not** been re-pushed. `pnpm db:push` + a
  row-count verify is pending a decision on whether to also close the near_miss
  gap first (which would change the seed again).

### Housekeeping done this pass
- `.gitignore`: added `.pnpm-store/` (36 MB, was untracked) and `*.bak`/`*.bak2`.
- Reverted a stale `apps/extension/src/popup.ts` working-tree edit (superseded by
  the committed extension work on branch `overnight-ext`).
- Committed the completed overnight work in attributed chunks:
  `169708b` harvest data, `70ecad4` dev-user/profile scripts, `581669f` docs.
- **NOT committed** (held for a decision): the `apps/web` DEV MODE auth-bypass
  changes — see OPEN DECISIONS.

---

## OPEN DECISIONS (need a human)

**A. `apps/web` DEV MODE changes** — `middleware.ts` + `lib/supabase/bearer.ts` +
`app/layout.tsx` add a `NEXT_PUBLIC_DEV_MODE` flag that bypasses auth and injects
a hardcoded dev user id. `app/extension-auth/page.tsx` is an incomplete stub.
TASK 2 explicitly forbids dummy auth fallbacks ("anonymous sessions only", "no
dummy fallbacks anywhere"). Recommendation: **revert**. Kept uncommitted pending
your call.

**B. near_miss bucket** — one short. Closing it legitimately means harvesting
1–2 more real scholarships whose CGPA/%/income cutoff sits just above the test
profile. Live fetch works. Not attempted yet (writes to the shared dev Supabase,
uncertain yield). NEVER by editing data or thresholds.

**C. TASK 2 frontend replacement** — not started. Concerns before executing:
  1. The teammate's UI is *already integrated* (commits UI 1–6).
  2. The briefing's paths (`apps/web/app`, `apps/web/components`, `apps/web/lib/ui`)
     do not match our actual layout (`apps/web/src/app`, `.../src/components`,
     `.../src/lib`). Followed literally it deletes the wrong things / nothing.
  3. Destructive (deletes current frontend) + runs third-party code from
     `github.com/mdmustafa9105/Eligent` (`pnpm install`/`build` on the clone).
  Need confirmation that his GitHub repo is genuinely newer than UI 1–6 and that
  the swap is wanted.

**D. `git push origin overnight`** — nothing has ever been pushed; local `main`
is 5 commits ahead of `origin/main` too. Confirm before any push.

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
