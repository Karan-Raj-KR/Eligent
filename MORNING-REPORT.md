# Morning Report — overnight run

**Branch:** `overnight-web` (off `overnight`). Nothing merged to `main`. **Nothing pushed.**

End state: **the teammate's frontend, on the real backend and database, with a working extension.**

---

## How to run it

```bash
pnpm install
pnpm --filter web dev          # http://localhost:3000
```

Requires `apps/web/.env.local` (already present, gitignored):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
Root `.env.local` (service-role + OpenAI) is only for `pnpm db:push` and the harvester.

Extension:
```bash
pnpm --filter opportunity-extension build
```
`chrome://extensions` → Developer mode → **Load unpacked** → `apps/extension/dist/`.
Full walkthrough in `apps/extension/EXT-REPORT.md`.

---

## Task 1 — real data

| | |
|---|---|
| Seed | 20 opportunities / 76 criteria, every `source_text` a verbatim page quote |
| Database | `opportunity` **20**, `criterion` **52**, reconciled — see note |
| Fetch method | all 20 via plain **FETCH** from `indiascholarships.in` (cached in `scripts/.cache/`, 82 pages). Buddy4Study listing pages were never harvested. |

**DB reconciliation:** the table held **39** rows — 19 orphans from earlier harvest experiments under different URLs (reliancefoundation.org, buddy4study `/application/` links, ~15 trimmed indiascholarships URLs). They would have polluted `/matches`, so they and their criteria were deleted. DB now matches `seed.ts` exactly.

**Coverage** (test profile: CGPA 8.4, 82%, year 2, CSE, Karnataka, ₹3L, Private, General, Male) — the UI reproduces the engine's own report exactly:

| bucket | count |
|---|---|
| eligible | **9** |
| near miss | **2** |
| rejected | **9** |

All three buckets non-zero → the stated Task 1 bar is met. `near_miss` is one short of the internal ≥3 target; **not forced**. Closing it honestly means harvesting 1–2 more real scholarships with a cutoff in the 83–88% band (add them to the top of `scripts/urls.txt`; harvest stops at `TARGET_OPPORTUNITIES=20`). Re-running the whole harvest would regenerate all 20 through a non-deterministic model and risk drifting the good 9/2/9, so it was left alone.

### ⚠ Known data-quality issue (needs a human)
Some `eligible` verdicts are **criterion under-extraction, not real matches**:
- *Kotak **Kanya** Scholarship* (girls-only) and *Narotam Sekhsaria **Postgraduate** Scholarship* both pass for a year-2 male profile — the gender / PG clause was never extracted from those pages.

Nothing was fabricated; the criteria simply aren't in the data. Fixing means re-harvesting those pages or hand-entering the missing criterion — both are data decisions, deliberately left to you.

---

## Task 2 — frontend replacement

Cloned `github.com/mdmustafa9105/Eligent`. It was a **100% mock-driven prototype**: 726 lines of fake scholarships, its own client-side eligibility engine, all state in `localStorage`, zero network calls, no auth. His **components were kept unchanged**; everything underneath them was replaced.

### Deleted
`apps/web/src/app/{page,onboarding,matches,proof,application}` (our routes), all of `apps/web/src/components/**` (incl. `ui/`), our `lib/{api,cn,format,gap,session,types,utils}.ts`, `tailwind.config.ts`, `components.json`, `postcss.config.js`.

### Kept (backend untouched — verified by diff)
`apps/web/src/app/api/**` · `src/lib/supabase/**` · `src/lib/eligibility.ts` · `src/lib/field-hints.ts` · `packages/engine`.

### Not copied from his repo
`lib/data/scholarships.ts` (mock data) and `lib/eligibility.ts` (his client engine) — our API and `packages/engine` are authoritative. His form option lists were kept as `lib/form-options.ts`.

### Dependencies — adopted his, nothing downgraded
`next 15.5.24 → 16.3.3` · `react 18.3 → 19.2.8` · `tailwind 3 → 4` (his `globals.css` is v4 `@theme`) · `lucide 0.4 → 1.37` · `eslint 8 → 9`. Dropped radix / cva / tailwind-merge / tailwindcss-animate / autoprefixer — his UI uses plain elements plus `components/clay.tsx`.

### Wiring (`lib/adapt.ts` + `components/provider.tsx`)
`/api/matches` → his `MatchResult`/`Scholarship`/`CriterionResult`. The adapter is **presentation only** — it never re-decides eligibility, it renders the verdict the engine returned. Auth is `signInAnonymously()`; no Google, no OAuth, no callback. The profile is read straight from Postgres through RLS rather than adding `GET /api/profile`.

| his mock | now |
|---|---|
| `SCHOLARSHIPS` array | `GET /api/matches` |
| `getMatches()` client engine | server verdict from `packages/engine` |
| `localStorage` profile | `POST /api/profile` + RLS read |
| `localStorage` application | `POST /api/application`, `PATCH /api/application/:id/requirement` |
| `localStorage` reports | `POST /api/report` |
| simulated Google sign-in | `supabase.auth.signInAnonymously()` |

### Integration bugs found by actually running it
1. **His onboarding collected neither `percentage` nor `gender`** — but 15 of 20 scholarships state a percentage cutoff and 3 are gender-restricted. Without them the engine correctly failed those as `unknown` and `/matches` collapsed to **2/0/18**. Both columns were *already* accepted by `POST /api/profile`; the form was simply missing them. Added → **9/2/9**.
2. **His near-miss card regex-scraped** "your value" and "required" out of his mock's sentence phrasing, so both slots showed identical text. `CriterionResult` now carries `actual`/`required` as data; the two regex helpers are deleted.
3. **Failing rows asserted falsehoods** — `Family income ₹3L ≤ ₹2L`. Now `Family income ₹3L · requires ≤ ₹2L`. Units singularise (`1 year over`).
4. Hardcoded **"43 scholarships"** copy replaced with the real count.

### Fields his UI wanted that our API does not return
Left optional and simply not rendered — **not invented, and not added to the API**:
`Scholarship.summary`, `.cadence`, `.openFor`, `.amountNote` · `Requirement.communityReportCount` (we store community rows but no count on the match payload) · `CriterionResult.comparison/reason/detail` (his engine wrote these; ours are derived from real `gap` arithmetic + `display_text`).

`Scholarship.amount` was `number` in his types; ours is a published **display string** (`"₹1.5 Lakh+"`) because the sources state ranges and qualifiers. Rendered as-is rather than fabricating an integer.

### Brand
Product name is **Eligent** everywhere. The domain term *cutoff* was deliberately kept in 4 places (`rejected at the cutoff`, `official cutoff`, `state their cutoff as a percentage`, `cutoff stage`).

---

## Extension — two real breaks, both fixed

1. The bridge derived the application id from `/application/<uuid>`, **a route the new UI doesn't have**. `/apply/<id>` carries the *opportunity* id, while `/api/fill/:application_id` needs the application row's id — which only exists after that page creates it. The apply page now publishes it as a data attribute; the bridge reads that.
2. The bridge read the session from **localStorage**, but `@supabase/ssr` stores it in a **cookie** (`base64-` wrapped, chunked `.0/.1` when large). Rewritten to parse the cookie jar and reassemble chunks. It also must not take the first `sb-*-auth-token` it finds — a browser can hold several, and a stale `sb-127` cookie from the extension test page was making every call 401. It now decodes each JWT `exp`, discards expired tokens and keeps the longest-lived.

**Verified live against the app + database:**

| path | result |
|---|---|
| eligible | `200`, `blocked:false`, real values (`Aarav Sharma`, `8.4`, `82`, `Karnataka`), 5 official documents |
| rejected | `200`, `blocked:true`, **0 fields filled**, verbatim clause: *"Only students currently enrolled in the 1st year…"* |

Extension `build` + `mapper` tests (29 hits / 10 misses) + `tsc` all clean.

---

## Verification summary

| check | result |
|---|---|
| `packages/engine` diff | **unchanged** ✓ |
| `apps/web/src/app/api/**` diff | **unchanged** ✓ |
| engine tests (vitest) | **19/19 pass** ✓ |
| web `tsc --noEmit` | clean ✓ |
| web `next build` | clean — 5 pages + 7 API routes + middleware ✓ |
| extension build / test / tsc | clean ✓ |
| end-to-end in browser | sign-in → onboarding → 9/2/9 → apply → checklist persists across reload ✓ |

No `any` casts were used to silence a type error.

---

## Open decisions for you

1. **Push.** Nothing is pushed. `overnight-web` is local; `main` is also 5 commits ahead of `origin/main`. Say the word and I'll `git push origin overnight-web`.
2. **Under-extracted criteria** (Kotak Kanya, Narotam Sekhsaria) — re-harvest those pages or hand-enter the missing clause.
3. **near_miss = 2** — accept, or harvest 1–2 more scholarships in the 83–88% band.
4. **Housekeeping done:** `.pnpm-store/` (36 MB) and `*.bak*` are now gitignored; the dead `NEXT_PUBLIC_DEV_MODE` flag and its auth-bypass were reverted; the incomplete `extension-auth` stub was deleted.
5. **`.env.example` still contains a live-looking `sk-proj-…` OpenAI key** (pre-existing, committed before this run). Worth rotating.
