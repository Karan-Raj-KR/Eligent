# Broaden Report — scholarships → general opportunity finder

Branch `overnight-web`. Nothing pushed, nothing merged to `main`.

> ### Devpost is owned by a parallel agent — read this first
> A parallel agent (commit `499e0fa`, "scripts: Devpost adapter — an API client,
> not a scraper") built `scripts/devpost.ts` + `devpost.test.ts` against Devpost's
> JSON API and committed it. That commit **also swept in this task's then-uncommitted
> `scripts/harvest.ts`** (the append-only refactor + new fields) and layered its
> own change on top (exporting `writeSeedFile` / `printCoverageReport` so both
> writers emit an identical file). The two are consistent — `scripts` typechecks
> and all 46 script tests pass.
>
> **Reconciliation done here:** the Devpost entry was removed from this task's
> `scripts/sources.ts` (a scrape config) — Devpost's index is a JSON API with no
> markup to scrape, so `devpost.ts` is the right home for it. `sources.ts` now
> covers buddy4study + unstop only.
>
> **Result:** `packages/db/seed.ts` holds **47 rows** — the 20 seeded + 12 from
> `devpost.ts` + 15 from this task's harvest (3 of which are devpost hackathons
> harvested via the scrape path *before* the split; kept, no URL clash). One
> `devpost.ts` row is junk (`Practice Submission`) and a few are
> `location_type: abroad`. Coverage numbers below are for the full 47.

Precondition checked and met before starting:
- `pnpm --filter web build` — passes
- `/matches` renders real data: DB holds 20 opportunities / 52 criteria, engine
  coverage 9 eligible / 2 near_miss / 9 rejected for the test profile.

---

## STEP 1 — schema (migration only)

`supabase/migrations/20260830000000_broaden_opportunity.sql`:

| column | type | default |
|---|---|---|
| `opportunity.category` | text, CHECK in the 8 values | `'scholarship'` |
| `opportunity.location_type` | text, CHECK `india\|abroad\|online` | `'india'` |
| `opportunity.funded` | boolean | `true` |
| `profile.region` | text | null |
| `profile.nationality` | text | null |
| `profile.team_size` | int | null |
| `profile.student_status` | text | null |
| `profile.age` | int | null |
| `profile.experience_years` | numeric | null |

Existing rows land on `scholarship / india / true` via the column defaults — no
`UPDATE` needed.

**DB state (checked against the live project):**
- `opportunity.category` / `location_type` / `funded` — **applied** (added
  out-of-band during the overnight run so `devpost.ts` + `db:push` could load).
  `opportunity` holds **47 rows**. `/api/matches`'s full select works; its
  legacy-column fallback is now dead code (kept as a guard).
- `profile.region / nationality / team_size / student_status / age /
  experience_years` — **NOT applied**. `select profile.age` still errors.
  Criteria on these fields therefore evaluate as `unknown` → hard fail, which is
  the correct conservative behaviour but means STEP 2's new fields can't
  actually match until this half of the migration runs.

The migration file was rewritten **idempotent** (`ADD COLUMN IF NOT EXISTS`,
guarded constraint adds) so it is safe to apply now regardless: `supabase db
push`, or paste it into the SQL editor.

---

## STEP 2 — criterion fields

`ALLOWED_FIELDS` in `scripts/harvest.ts` and the extraction prompt's field list
now also carry: `region, nationality, team_size, student_status, age,
experience_years`. `team_size / age / experience_years` are numeric (added to
`NUMERIC_FIELDS` so the model's `"3"` is coerced to `3`).

`packages/engine` untouched — it was already field-agnostic. The matching
profile columns are in the STEP 1 migration; `apps/web/src/lib/adapt.ts` maps
the six new short labels for the criterion table.

Verified end to end on live pages:
- `age between [13,99]` extracted from RevenueCat Shipaton (devpost)
- `team_size between [3,4]` extracted from Multipli Hackathon (unstop)

---

## STEP 3 — source adapters

`scripts/sources.ts` — one config object per source, consumed by both
`discover.ts` and `harvest.ts`:

| id | listing(s) | detail pattern | category | location | funded | fetch |
|---|---|---|---|---|---|---|
| `buddy4study` | `/scholarships/engineering`, `/scholarships/karnataka` | `buddy4study.com/scholarship/<slug>` | scholarship | india | ✓ | FETCH |
| `unstop-hackathons` | `unstop.com/hackathons` | `unstop.com/hackathons/<slug>` | hackathon | india | ✗ | HEADLESS → cached FETCH |
| `unstop-internships` | `unstop.com/internships` | `unstop.com/internships/<slug>` | internship | india | ✗ | HEADLESS → cached FETCH |
| `unstop-competitions` | `unstop.com/competitions` | `unstop.com/competitions/<slug>` | competition | india | ✗ | HEADLESS → cached FETCH |

Devpost is **not** in `sources.ts` — its hackathon index is a JSON API
(`devpost.com/api/hackathons`), handled by `scripts/devpost.ts` (parallel agent).

Adding a scrape source is one entry in `SOURCES[]`. `classifyOpportunity(url)`
stamps category / location_type / funded onto each harvested row; a URL matching
no source defaults to `scholarship / india / true`.

`discover.ts` changes: `classify()` takes an optional `Source` and, when given
one, keeps only URLs matching `source.detail` (dropping the old hardcoded
buddy4study special-case); `crossHost` skips the same-host check for per-event
subdomains. `fetchPageAuto` already escalates a JS-shell listing to a headless
render, so no per-source headless flag is needed.

`indiascholarships.in/scholarships` was **removed** from `sources.txt`: its
index page has no detail-link shape to filter on and the generic heuristic
pulled in ~330 non-detail links. The 20 seeded indiascholarships rows stay; new
harvesting there is by explicit URL only.

### robots.txt (fetched 2026-08-30)

| host | verdict |
|---|---|
| `devpost.com` | `User-agent: *` → `Disallow:` (empty). Named AI bots (GPTBot, anthropic-ai, CCBot) are blocked; the harvester UA falls under `*` and is allowed. **Not blocked.** |
| `unstop.com` | `Allow: /hackathons/ /internship/ /competitions/`; only `/api/*` (except `/api/public/*`), `/u/*`, `/p/*`, `/competitions/*/register` disallowed. Listing + detail pages allowed. **Not blocked.** |
| `buddy4study.com` | only `/media-url/*` and `/UID/*` disallowed. **Not blocked.** |

No source was skipped for robots.

### discovery results

| listing | fetch | detail links kept |
|---|---|---|
| buddy4study/scholarships/engineering | FETCH | 11 |
| buddy4study/scholarships/karnataka | FETCH | 13 (8 new) |
| unstop.com/hackathons | HEADLESS | 21 |
| unstop.com/internships | HEADLESS | 21 |
| unstop.com/competitions | HEADLESS | 14 |

(devpost.com/hackathons was scraped during development — HEADLESS, 9 detail links
— before Devpost moved to `devpost.ts`'s JSON path.)

Politeness unchanged: shared 2s min interval across plain + headless, never
concurrent, real desktop UA for the headless path.

---

## STEP 4 — extraction

Same validator, same rules. `harvest.ts` is now **append-only**: URLs already in
`packages/db/seed.ts` are skipped, so a re-run can't re-extract (and drift) a row
that already passed. New guard: a page yielding >6 live opportunities is treated
as an aggregator/brand page and skipped (the buddy4study SBI-IIT page lists 25)
rather than blending their criteria.

Hackathons that state no eligibility criteria are stored with zero criteria and
come out eligible — nothing manufactured. (Where a hackathon *does* state an age
or team-size rule, the STEP 6 test profile has no `age`/`team_size`, so the
engine conservatively rejects it — correct, not forced.)

### what was harvested by this task (`scripts/harvest.ts`, append-only)

15 new rows on top of the seeded 20:

| source | fetch | new rows | notes |
|---|---|---|---|
| buddy4study.com/scholarship/&lt;slug&gt; | FETCH (cached from discover) | 4 | JSPN, OP Jindal, Azim Premji, DBT BITP. `bcwd-post-matric` skipped by the >6-live-opportunities aggregator guard. |
| &lt;slug&gt;.devpost.com | FETCH | 3 | All Things Agentic, Agentic Cinema, WebMCP — no stated eligibility → **zero criteria → eligible**. Harvested via the scrape path before Devpost moved to `devpost.ts`; kept (no URL clash). |
| unstop.com/hackathons/&lt;slug&gt; | HEADLESS | 1 | SemiCon Hackathon (`team_size between [1,3]`). |
| unstop.com/internships/&lt;slug&gt; | HEADLESS | 1 | VLSI Design Internship — no criteria → eligible. |
| indiascholarships.in/scholarships/&lt;slug&gt; | FETCH | 6 | OP Jindal, Infosys STEM Stars, Amazon Future Engineer, Aditya Birla Capital, LIC HFL Vidyadhan, Buddy4Study India Foundation — pass 2, targeting near-miss cutoffs. |

Plus **12 devpost hackathons from `scripts/devpost.ts`** (parallel agent, JSON
API) → **47 rows total**.

**Failed / blocked**
- `indiascholarships.in/scholarships/honeywell-scholarship` — HTTP 404.
- No source blocked by robots.txt.
- `unstop.com/competitions` adapter is wired and discovery found 14 detail links,
  but the harvest cap was hit before the queue reached them — no competition rows.

**New criterion fields proven end to end** (verbatim, validated):
`age between [13,99]` (RevenueCat, devpost), `team_size between [3,4]` (Multipli,
unstop), `team_size between [1,3]` (SemiCon), `nationality eq "Indian"` (JSPN /
DRDO, buddy4study).

**Rows this task dropped after harvesting** (real extraction problems, not bucket-tuning):
*RevenueCat Shipaton*, *TikTok TechJam*, *Multipli*, *Powernext-AI* — all
rejected for the test profile (no `age` / `team_size` in the profile), and
RevenueCat's `category eq "Next Gen Award"` was a mis-extraction (a prize track,
not an eligibility category). NB: `devpost.ts` later re-added RevenueCat-style
rows through the API path; if the mis-extraction concern applies there too, it's
worth a look at `devpost.ts`'s output.

---

## STEP 5 — matches page

- Category chips: All / Scholarships / Hackathons / Internships / Programmes /
  Events. Default **All**. Filters client-side over the same three buckets
  (`filterGroups` in `app/matches/page.tsx`).
- Location toggle: All / India / Abroad / Online.
- Section counts, hero and the "others were evaluated" line all recompute from
  the filtered view.
- Copy: "scholarships" → "opportunities" across the matches flow, onboarding,
  signin, layout title, extension, opportunity/apply pages, report modal.
  Domain term **cutoff** kept verbatim (CGPA cutoff, income cutoff, "rejected at
  the cutoff", onboarding hint).

---

## STEP 6 — coverage (the gate)

Profile: CGPA 8.4, percentage 82, year 2, CSE, Karnataka, income 300000,
private institution, male.

Run: `pnpm tsx scripts/coverage.ts` (engine against `packages/db/seed.ts` — no DB
needed, so this is valid whether or not the STEP 1 migration is applied yet).

```
Opportunities in catalog: 47   (target was 35 — the extra 12 are devpost.ts's)

Rows per category:
  scholarship: 30
  hackathon:   16   (3 scraped by this task + 13 from devpost.ts, one of them junk)
  internship:   1

Scholarships or funded programmes: 30   (gate: >= 8 ✓)

Bucket counts:
  eligible:   29   (gate: >= 3 ✓)
  near_miss:   2   (gate: >= 3 ✗ — one short)
  rejected:   16   (gate: >= 3 ✓)
```

This task's own 35-row catalog (before `devpost.ts`'s 12) scored **17 / 2 / 16**.
The extra devpost hackathons are almost all zero-criteria → eligible, so they
move the eligible count and nothing else. **near_miss is 2 either way.**

### The near_miss gate is not met: 2, not 3. This is the real number.

Both near-misses are real percentage-cutoff misses for an 82% applicant:
- **VIT GVSDP Merit Scholarship** — needs a higher aggregate; gap inside 10%.
- **L'Oréal FYWIS** — same, on two percentage clauses.

Two harvest passes did not produce a third. The second pass added six merit
scholarships chosen specifically for tight cutoffs (Infosys STEM Stars, Amazon
Future Engineer, Aditya Birla Capital, LIC HFL Vidyadhan, OP Jindal, Buddy4Study
India Foundation) — every one came out **eligible** (no binding percentage/CGPA
clause for this profile) or **rejected** on a categorical (branch / income /
year). None landed in the ≤10% band.

near_miss needs a scholarship whose *sole* failing criterion is a numeric
threshold missed by ≤10% (percentage ~83–91, or CGPA ~8.5–9.2, or year short by
one). Real Indian scholarships mostly either accept an 82% / 8.4-CGPA
second-year CSE student outright, or reject them on branch / gender / state /
income — not on a marginal cutoff. The overnight run and the original hand-curated
`urls.txt` "near miss" section both produced exactly 2.

Per the brief — *"Never adjust data or thresholds to force a bucket to fill.
Report the real numbers."* — nothing was tuned. Closing the gate honestly means
finding 1–2 more real scholarships with a percentage cutoff in the low-to-mid
80s as their only binding clause, and adding them by URL to `scripts/urls.txt`
(the harvest is append-only and will stop at 35, so drop one eligible row first
or raise the cap).

### Known data-quality notes (for a human)

- Two **"OP Jindal Engineering & Management"** rows — one from buddy4study, one
  from indiascholarships.in. Same real scholarship, two source pages, two
  independently-extracted criterion sets. Left as-is (both are real); dedupe if
  the catalog should be source-agnostic.
- Pre-existing (from the overnight run, unchanged here): *Kotak Kanya* (girls-only)
  and *Narotam Sekhsaria* (postgraduate) still pass for this profile — the
  gender / PG clause was never on the extracted page text. Not introduced by this
  work.

---

## Files (this task — uncommitted)

- `supabase/migrations/20260830000000_broaden_opportunity.sql` (new, idempotent)
- `scripts/sources.ts` (new), `scripts/sources.txt`
- `scripts/discover.ts`, `scripts/discover.test.ts`
- `scripts/coverage.ts`, `scripts/urls.txt`
- `apps/web/src/app/api/matches/route.ts`
- `apps/web/src/app/matches/page.tsx`
- `apps/web/src/lib/adapt.ts`, `apps/web/src/lib/types.ts`
- `apps/web/src/components/matches/match-summary.tsx`, `components/states.tsx`
- copy-only: `app/layout.tsx`, `app/signin/page.tsx`, `app/extension/page.tsx`,
  `app/onboarding/page.tsx`, `app/opportunity/[id]/page.tsx`, `app/apply/[id]/page.tsx`,
  `components/behavior/report-modal.tsx`, `components/behavior/extension-popup.tsx`

`scripts/harvest.ts` and `packages/db/seed.ts` were **committed by the parallel
agent** in `499e0fa` (they contain this task's changes plus that agent's).

## Coordination notes (parallel agent activity, not this task)

- `apps/web/.env.local` was being rewritten repeatedly during this run (a
  `SUPABASE_SERVICE_ROLE_KEY` appeared, then the file vanished). `.env` files are
  off-limits for this task; flagged, not touched. Re-create `apps/web/.env.local`
  with `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` before
  `pnpm --filter web dev`.
- `packages/db/load.ts` was not modified by this task; it already spreads unknown
  columns, so the new `category` / `location_type` / `funded` fields load without
  a change.
