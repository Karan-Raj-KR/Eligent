# HANDOFF

Autonomous session, overnight 2026-08-29 → 2026-08-30. Branch `main`, 10 commits
on top of your `f8cfd20 pre-autonomous baseline`. Nothing force-pushed, no
history rewritten, no `.env` file created or modified.

---

## ⚠️ READ THIS FIRST — live credentials are in a git-tracked file

At some point before this session you replaced the placeholders in **`.env.example`**
— which **is tracked by git** — with real values:

- a live Supabase URL, anon key, **service-role key**, and project id
- a live **OpenAI API key** (`sk-proj-…`)

`f8cfd20` still holds the safe placeholder version, so **these are not yet in
git history**. They are sitting as an uncommitted modification. I left the file
completely untouched and staged every commit by explicit path — never `git add -A`
— specifically so I would not commit them for you.

The next person who runs `git add -A` publishes your service-role key, which
bypasses RLS on every table.

**Rotate both keys, then move the real values into `apps/web/.env.local`** (which
is correctly gitignored) and restore `.env.example` to placeholders.

I did use the OpenAI key, once, for the harvest you asked me to run — passed into
a single process via the environment, never written to disk. I did **not** use
the Supabase credentials; see "What I did not do" below.

---

## What I completed, per phase

### Phase 0 — Reconcile · `3137cec`
- `packages/db/schema.sql` promoted to `supabase/migrations/20260829220000_initial_schema.sql`.
- Deleted `supabase/migrations/001_initial_schema.sql` (the US-market
  `applicants`/`scholarships`/`evaluations`/`llm_cache` schema).
- Deleted `packages/db/src/` entirely. `client.ts` held a module-scope
  **service-role Supabase singleton** — an RLS bypass one stray import away from
  production. Nothing imported it; `@opportunity/db` was a declared dependency of
  `web` with zero importers, so it came out of `web`'s deps too.
- Fixed the root tsconfig path alias, which pointed at `packages/engine/src` and
  `packages/db/src`. Neither directory exists — engine is flat.
- Deleted the four 0-byte files at `apps/extension/`.

### Phase 1 — Data pipeline · `77ae45d`, `9b1b18c`
`scripts/discover.ts` already existed and already met the spec, so I ran it
rather than rewriting it. It found almost nothing, and the reason mattered:

**buddy4study is a Next.js SPA.** The served HTML is an empty shell —
`htmlToText()` returned **65 characters** from a 68 KB page — and every word of
the eligibility text lives inside the `__NEXT_DATA__` JSON blob that
`htmlToText()` strips along with all other `<script>` content. The fetches were
fine; extraction was blind.

`scripts/lib/page-records.ts` reads that JSON back out. Two consequences:

- **One page publishes many opportunities** — the live edition plus every expired
  past one (the Reliance page carries 11). `harvest.ts` assumed one page = one
  opportunity and would have blended six years of criteria into one row. Now
  `harvestUrl()` → `harvestRecord()`, and expired editions are dropped *before*
  the model call.
- The site's own structured fields (`title`, `deadline`, `purposeAward`,
  `applyLink`) beat anything the model reports. The model is now asked only for
  the hard part: prose → typed criteria.

Four more bugs, all found by running it:

- `oppurtunityType` is not a usable allowlist. The live Reliance editions are
  filed as **"Outreach Project"**, not "Scholarship" — my first filter silently
  dropped the two best opportunities on the page.
- The model returns `"60"` where the schema needs `60`. `eq` accepts strings, so
  these slipped past validation into the seed as criteria **no profile could ever
  satisfy** (`year_of_study eq "1"` against an int `1`). `coerceNumericValue()`
  re-types clean numbers; prose it failed to quantify (`"first year"`) is
  rejected and logged, never interpreted.
- A failed extraction still carried the page's structured name, so `writeSeedFile`
  seeded it with **zero criteria** — which `evaluate()` correctly reads as
  eligible-for-everyone. A fabricated match dressed as real data. Now excluded.
- `gpt-4o-mini` returns 403 for your project. See "Constraints" below.

**Seeded (`packages/db/seed.ts`), every criterion carrying a verbatim
`source_text` checked against the fetched page:**

| Opportunity | Deadline | Criteria |
|---|---|---|
| Reliance Foundation UG 2026-27 | 2026-10-05 | `percentage>=60`, `year_of_study=1`, `annual_family_income<=1500000` |
| Reliance Foundation PG 2026-27 | 2026-10-05 | `year_of_study=1`, `cgpa>=7.5` |
| Kotak Kanya Scholarship 2026-27 | 2026-08-31 | `percentage>=75`, `annual_family_income<=600000`, `year_of_study=1` |

**3 opportunities, 8 criteria, 0 rejected by validation.** No URL and no
criterion was invented.

`packages/db/load.ts` is the seed → Postgres loader, wired as the `db:push` turbo
task. Idempotent in both directions: opportunities upsert on a unique `url`, and
an opportunity's criteria are replaced wholesale so a re-harvest that drops a
criterion drops it from the database too.

### Phase 2 — Engine guards · `7494a4c`
Guards only. **No decision logic changed, no branch reordered, no threshold
touched.** Both unchecked casts replaced by narrowing:

- `between` destructured `c.value as [number, number]`. A malformed jsonb value
  gave `min`/`max === undefined`, made both comparisons false, and returned
  **`ok: true`** — silently *passing* a criterion that should have failed. The
  worst failure mode available: a student told they qualify when they do not.
- `in`/`not_in` called `.includes` on an unchecked cast; a non-array threw
  mid-request.

Both now fail closed as `requirement: 'unknown'`, the same conservative path
missing profile data already took. **All 11 pre-existing tests pass unmodified** —
the diff removes no line from them. 8 new cases; 19 total. `evaluate.ts` still has
**zero imports**.

### Phase 3 — UI · `3d528bb`, `6fe722a`, `7e80cf6`, `be8d1b7`
`src/app/page.tsx` deleted, not ported. Built fresh: `/`, `/auth/error`,
`/onboarding`, `/matches`, `/application/[id]`.

`lib/api.ts` is the only place a browser→API call is made, so `res.ok` before
`res.json()`, non-JSON bodies, and network failures are handled once rather than
remembered five times. Every caller has a `finally` that clears loading.

**Two deviations from your field list, both load-bearing — tell me if you disagree:**

- **`percentage` added.** Two of the three seeded scholarships gate on it
  (Kotak ≥75, Reliance UG ≥60). Without it those evaluate as `unknown` → hard
  failure → **every opportunity renders rejected**. Your six fields would have
  produced a demo where nothing is ever eligible.
- **`full_name` added.** `/api/profile` returns 400 `"full_name is required"`
  without it and the column is `NOT NULL`, so onboarding could never have succeeded.

`category` and `gender` are optional and never required to reach `/matches`.

Two small changes to existing routes, both to serve the rejected-clause
requirement: `/api/matches` and `/api/fill` now return the criteria /
`source_text` alongside the evaluation. The engine's `Failed` carries
`display_text` but not the quote, and `evaluate.ts` was off-limits.

### Phase 4 — Extension · `de25d50`
The shipped extension did the one thing this product exists to prevent: it ran on
`<all_urls>`, fired `autofillForm()` on **every page load with no user gesture**,
filled US fields from a local `chrome.storage` profile, and never contacted the
backend. `/api/fill/[application_id]` — the eligibility gate, the blocked clause,
`FIELD_HINTS` — **had zero callers.** The product's core moment did not exist in
shipped code.

- `host_permissions` scoped to the domains in the seeded URLs
  (`buddy4study.com`, `reliancefoundation.org`) plus the app's own origins. No `<all_urls>`.
- The always-on content script is gone. Filling happens via
  `chrome.scripting.executeScript` from one click in the popup.
- `bridge.ts` runs **only on the app's own pages**, lifts the session from
  localStorage and the application id from `/application/<id>`, and hands both to
  the background worker. The popup calls `/api/fill` with a `Bearer` header.
- `blocked: true` renders the reason, the criterion, the verbatim `source_text`,
  and the gap — and fills **nothing**. The early return sits above every line
  that touches the page.
- **Never submits, structurally:** the built bundle contains zero `.submit(`,
  zero `requestSubmit`, zero `.click()` — verified against `dist/`, not the
  source — and the injected function skips `type="submit"` inputs even if a hint
  selector matches one.
- Build fixed: `popup.ts` was never an esbuild entry point, so `popup.html`
  loaded a `popup.js` that was never generated, and `manifest.json`/`popup.html`
  were never copied into `dist/`. `dist/` was not a loadable extension. It is now.
  The three missing icon PNGs are removed rather than referenced.

### Phase 5 — Verification · `b9dde4a`
I stood up a **local** Supabase stack (OrbStack was already installed) to test the
loader without touching your project. It failed immediately, on something that
would have failed on stage:

```
✗ Reliance Foundation Undergraduate Scholarships 2026-27: permission denied for table opportunity
```

Both migrations applied, RLS policies existed, the service-role key was correct —
and every statement was still refused. The six tables came out of migration with
`Dxtm` (truncate/references/trigger/maintain) for `anon`, `authenticated` and
`service_role`, and **no `arwd`** (select/insert/update/delete). PostgREST
connects as those roles, so nothing could read or write anything and **the RLS
policies were never reached.**

`20260829231000_grant_api_roles.sql` fixes it. RLS is unchanged and is still the
gate. I also committed `supabase/config.toml` so `supabase start` reproduces this.

---

## Verified by running vs. UNVERIFIED

### Verified against a real Postgres (local Supabase, torn down afterwards)
- Both migrations apply cleanly from scratch.
- **Loader: 3 opportunities, 8 criteria.** Run twice — still 3 and 8. No duplicates.
- RLS: profile and application rows insert under the user's own JWT.
- `/api/fill` on a near-miss application → `blocked: true`, `reason: "near_miss"`,
  a `3` `percentage` `short` gap, and the verbatim clause
  *"Applicants must have scored at least 75% or more marks or equivalent CGPA in
  Class 12 board examinations."* **Nothing filled.**
- `/api/fill` on an eligible application → `blocked: false`, 10 fields with hints.
- `/api/fill` with no bearer token → **401**.
- `/matches` rendered all three buckets from real rows, including
  *"you are 3% short of 75% (you have 72%)"* and
  *"₹40,000 over the ₹6,00,000 limit"*.
- All five pages render with a **deliberately broken backend** — error cards with
  working retry, never a blank screen. The onboarding button recovers after a
  failed save instead of sticking on "Saving…" forever.

### Verified by build/test only
- `pnpm install`, `pnpm -r build`, `pnpm -r test` (19 engine), `tsc --noEmit` in
  all five packages, 28 `scripts/` node:test cases. All pass — output below.

### UNVERIFIED — never executed
- **The loader has never run against YOUR Supabase project.** `apps/web/.env.local`
  still says `dummy.supabase.co`, and per your brief I built it but did not run it.
  **Zero rows have been written to your real database.** The counts above are from
  a local throwaway Postgres that no longer exists.
- **The Chrome extension has never been loaded into Chrome.** It builds into a
  complete `dist/`, and I verified the bundle's contents statically, but no part
  of the popup → `/api/fill` → fill flow has run in a browser.
- **Google OAuth has never completed.** There is no Google provider configured on
  your Supabase project that I could see or test. The code path is written; the
  round trip is unproven.
- `/api/report`, `/api/application` POST, and the requirement PATCH route have not
  been exercised against a database — only `/api/fill` and `/api/matches` were.

---

## What I could not do, and exactly why

1. **Only 3 scholarships exist.** Not 43. `sources.txt` had 4 URLs; two are real
   scholarship pages, one is a career-assessment test, one is an eLearn programme.
   Every past edition on those two pages is expired. **I will not invent
   scholarship data, and `urls.txt` says "hand-curated — do not auto-populate", so
   adding URLs is your call, not mine.** Add more and re-run; the pipeline handles
   them now.
2. **`discover.ts` finds nothing on these listing pages.** They are SPAs: 3 of the
   4 returned **0 anchors** because there are no `<a>` tags in the served HTML. The
   adapter fixed *harvest*; discovery on SPA listing pages is still blind. The 3
   URLs it did find were `/application/STEP{1,2,3}/instruction` — eLearn form
   steps, not scholarships — and I removed them from `urls.txt` with a note.
3. **I moved your two scholarship URLs from `sources.txt` to `urls.txt`.** They are
   detail pages; `harvest.ts` reads `urls.txt`, `discover.ts` crawls `sources.txt`.
   Same URLs, right file. Both files are commented explaining the move.
4. **`gpt-4o-mini` is not available to your OpenAI project** — it returns
   `403 model_not_found`. The only model the key can reach is **`gpt-5-nano`**, so
   that is the new default. It rejects `max_tokens` (now `max_completion_tokens`)
   and rejects `temperature: 0`, so **harvest output is non-deterministic** — two
   runs give slightly different criteria. The committed `seed.ts` is frozen and
   validated; just be aware that re-running harvest may change it.
5. **`Kotak Kanya Scholarship 2026-27` closes 2026-08-31 — that is tomorrow.**
   Re-run harvest after that date and it will correctly drop itself, taking you to
   2 opportunities.
6. **Kotak's `provider` reads "Kotak Kanya Scholarship 2026"**, not a company name.
   The page's `offeredBy` field is literally `<p>NA</p>`, so the fallback is the
   brand-page name. It is page data, not invented, but it looks slightly off.
7. **`next lint` is not configured** — it drops into an interactive setup prompt.
   Type checking runs in `next build`, so this is cosmetic, but there is no linter.

---

## Verification output

```
$ pnpm install
Already up to date
Done in 578ms

$ pnpm -r build
apps/extension build: dist/popup.js 5.3kb  dist/bridge.js 1.1kb  dist/background.js 904b ⚡ Done
apps/web build: ✓ Compiled successfully   ✓ Generating static pages (13/13)
  ƒ /                                    68.2 kB
  ƒ /application/[id]                    3.03 kB
  ○ /auth/error                            160 B
  ○ /matches                             5.56 kB
  ○ /onboarding                          4.36 kB
  (+ 7 API routes, /auth/callback, middleware 92.5 kB)
Done

$ pnpm -r test
packages/engine test: ✓ evaluate.test.ts (19 tests) 4ms
packages/engine test:  Test Files  1 passed (1)
packages/engine test:       Tests  19 passed (19)

$ tsx --test scripts/harvest.test.ts scripts/discover.test.ts scripts/page-records.test.ts
# tests 28
# pass 28
# fail 0

$ tsc --noEmit
apps/web           exit=0
packages/engine    exit=0
packages/db        exit=0
apps/extension     exit=0
scripts            exit=0

$ grep -cE "^import |require\(|fetch\(|openai|anthropic" packages/engine/evaluate.ts
0
```

---

## Your next 3 actions, in order

### 1. Rotate the leaked keys and fix `.env.example` (5 min, do this first)
Your service-role key and OpenAI key are in a tracked file. Rotate both in the
Supabase and OpenAI dashboards, put the new values in `apps/web/.env.local`
(gitignored), and restore `.env.example` to placeholders:

```bash
git diff .env.example
```

### 2. Push the schema and load the data (10 min)
Nothing is in your real database yet. With real credentials in the environment:

```bash
supabase link --project-ref <your-project-ref> && supabase db push && pnpm db:push
```

`supabase db push` applies all three migrations — **including the grants
migration, without which every query returns "permission denied"**. Then
`pnpm db:push` runs the loader. Expect `Loaded 3 opportunities, 8 criteria.`
Re-run it freely; it is idempotent.

### 3. Turn on Google OAuth, then walk the demo once (20 min)
In Supabase → Authentication → Providers, enable Google and add
`<your-app-url>/auth/callback` as an authorised redirect. Then, with
`apps/web/.env.local` pointing at the real project:

```bash
pnpm --filter web dev
```

Sign in, complete onboarding as **year 1, 72%, income 640000, CGPA 7.2** — that
profile puts Reliance UG in *eligible* and both others in *near miss* with real
gaps, which is the demo. Then load `apps/extension/dist/` via
`chrome://extensions` → Load unpacked, open a seeded scholarship, and click
**Check eligibility & fill**. Add your deployed Vercel domain to
`host_permissions` in `apps/extension/public/manifest.json` before demoing on
anything other than localhost.

---

## Notes
- `supabase/.gitignore` was created by `supabase init` and is untracked. Commit it
  or delete it; it does no harm either way.
- I started OrbStack to run the local Postgres and stopped the stack afterwards
  (`supabase stop`). No containers are left running. The images remain cached.
- A test user `near.miss@example.test` existed only in the local stack, which is gone.
