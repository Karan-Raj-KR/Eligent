# Data report — branch `fix-data`

Three tasks: fix a wrong eligibility verdict, give the extension the profile it
was making students retype, and get the catalogue to 40 without shipping a
wrong answer to do it.

---

## 1. The Kotak Kanya root cause

**A male profile was returned as `eligible` for a girls-only scholarship.**

Checked in the order given:

| | Question | Finding |
|---|---|---|
| a | Does the opportunity have a gender criterion row? | **No. This is the cause.** It had exactly two criteria: `percentage gte 75` and `annual_family_income lte 600000`. The test profile passes both, so `evaluate()` correctly returned `eligible` — there was nothing to fail on. |
| b | Is `gender` in the harvest prompt's allowed-field list? | Yes, and the prompt explicitly instructs the model to emit it *"Only emit if restricted (e.g. gender: 'female')"*. Not the cause. |
| c | Does the profile have `gender`, does onboarding collect it, does `/api/matches` pass it? | All yes. The column exists, onboarding renders a Male/Female/Other select, `loadProfile` does `select("*")` and hands the whole row to `evaluate()`. Not the cause. |
| d | Does `evaluate()` treat a missing profile value as a hard failure? | Yes — `unknown` sets `hasHardFailure`, so it can never soften to `near_miss`. Correct, and not the cause. |

**So: the extractor silently dropped the restriction.** The page states it in a
sentence that quotes cleanly:

> "Note: Exclusively for girl students pursuing professional graduation."

Nothing was broken except that one criterion never got written. That is the
worst failure mode this product has — not a slightly worse answer, but a
confident wrong one.

### The fix

`scripts/harvest.ts` gained `genderRestriction()`: **deterministic, no model
call.** It reads the page and emits `gender eq "Female"` when a programme is
unambiguously restricted, from an exclusivity sentence or from the programme's
own name, gated by the same verbatim-quote check as every other criterion.

Explicitly *not* restrictions, all three seen in the real data:

- `"— 50% reserved for girls —"` (Siemens) — a quota. Boys still apply and win the other half.
- `"Preference is given to female students…"` (Buddy4Study) — a preference.
- `"Age relaxation for SC/ST/OBC candidates"` (DRDO) — not about gender at all.

### The second bug, found while fixing the first

Encoding the restriction is not enough. Criteria held `"female"`; profiles hold
`"Female"`. `packages/engine` compares categorical values with `===` and is
deliberately field-agnostic — it must not learn that these are the same person,
and it was off limits. So **both sides are canonicalised instead**
(`packages/db/vocab.ts`), on the two write paths (`load.ts`, `POST /api/profile`)
plus a one-off backfill of existing rows: 2 profiles, 8 criteria.

Without this, the Kanya fix would have rejected **every woman on earth** from a
women's scholarship. The regression test asserts both directions.

A related mismatch: `branch in ["Engineering", …]` versus a profile that says
`"Computer Science"` — matches nobody. Streams expand to the branches
onboarding actually offers. Widening carries the *operator* with it
(`eq "Engineering"` → `in [...]`), because handing `eq` an array reads as a
categorical hard failure in `evaluate()` — rejecting everyone. The backfill dry
run caught that before it was written. `not_in` is never widened: that locks
people out rather than in.

---

> **Superseded on the second pass.** Deletion was replaced by exclusion — see
> "Opportunities excluded" below. All 6 deleted rows were restored.

## 2. Opportunities deleted, and why (superseded)

**55 → 49.** Every deletion is a row that could not quote a single criterion
from its own page after a clean re-harvest.

| Deleted | Why |
|---|---|
| All Things Agentic Hackathon | harvest ran clean, nothing quotable |
| The WebMCP Challenge | " |
| Smart City Hackathon Lahore | " |
| Midnight Hackathon: August 2026 | " |
| Veteran Innovation Hackathon | " |
| VLSI Design Internship at Kukbit SL | " |

13 of the 17 criterion-less rows were **saved**, not deleted, by recovering real
criteria: `team_size`, `student_status`, `age`, `nationality`, `region`.

### Two things worth knowing about how this went

**A transient error deleted a good row.** `reharvest.ts` first treated a failed
harvest identically to "found nothing", so an `Unexpected end of JSON input`
deleted the Siemens scholarship, which had two perfectly valid criteria. It was
**restored from `seed.ts`**, and the gate now only condemns a row when the
harvest ran cleanly. Failures are skipped and reported.

**The model is not deterministic.** The same URL produced different criteria in
the dry run and the apply run — two rows swapped between "recovered" and
"deleted" between the two. The dry run predicts; it does not promise.

**One deletion cost data:** *All Things Agentic Hackathon* had 2 `application`
rows, which cascaded. They were demo applications, but they are gone.

---

## 2b. Opportunities excluded (current policy)

Nothing is deleted any more. An opportunity with no verifiable criteria is
**kept and excluded from matching**: `/api/matches` gives it no verdict and
returns it under a separate `unverified` key.

All 6 previously deleted rows were restored from `main`'s `seed.ts`, and
re-harvested once more — 3 recovered real criteria, 3 could still quote
nothing:

| Excluded | Category |
|---|---|
| The WebMCP Challenge | hackathon |
| Smart City Hackathon Lahore | hackathon |
| Veteran Innovation Hackathon | hackathon |

**3 excluded, of 55.**

`supabase/migrations/20260830120000_criteria_status.sql` adds
`opportunity.criteria_status`. **It has not been applied** — this environment
has no DDL access. The guard does not need it: a row with zero criterion rows
is unverified by definition, and that is the check `/api/matches` uses. The
column records *why*, explicitly, once someone applies the migration.

---

## 3. Final counts

55 opportunities, 118 criteria, **3 excluded as unverified**, 52 evaluated.

| Category | Count |
|---|---:|
| scholarship | 38 |
| hackathon | 16 |
| internship | 1 |

### Remaining known gap

One opportunity still has a restriction that cannot be encoded: **Siemens**
states `Domicile State: Selected States` without ever naming them. There is no
verbatim value to quote, so no `state` criterion exists. It keeps its two real
criteria and is flagged in `scripts/ACCURACY-AUDIT.md`.

---

## 4. Coverage report

Profile: **CGPA 8.4, percentage 82, year 2, CSE, Karnataka, income ₹3,00,000,
private, male** — evaluated as it would actually be stored
(`institution_type: "Private"`, `gender: "Male"`; `POST /api/profile`
canonicalises on save, and the engine compares with `===`).

```
Opportunities in catalog: 55  (target: 40)
Excluded as unverified (no criteria): 3
Opportunities actually evaluated: 52

eligible:  13
near_miss: 1
rejected:  38
```

Confirmed identical against the running API with a real session:
`eligible 13, near_miss 1, rejected 38, unverified 3` — total 55, and **zero
criterion-less rows reached a verdict bucket**.

**These are the real numbers. Nothing was tuned to fill a bucket.** The repo's
own coverage gate wants ≥3 near-misses and there is 1 — reported as-is.

### The number that needs a decision

**18 of the rejections are caused *only* by profile fields onboarding never
asks for**, all introduced by the criteria recovered in Task 3:

`team_size` (8), `student_status` (7), `nationality` (7), `age` (6),
`region` (3), `experience_years` (1)

`evaluate()` treats a missing value as a hard failure — correct and
conservative — so **all 11 hackathons now reject every student**, because no
student can state they are a student. Before this work those same 11 rows
accepted every student for having no criteria at all. Both answers are wrong;
the new one at least fails safe.

The fix is to collect `student_status` and `age` in onboarding (2 fields would
clear 13 of the 18). I did **not** do it: it changes the profile shape and the
API contract I was asked to freeze in the same session, and it was not in
scope. Recommend it as the next change.

---

## 5. API contract summary

Full shape: **`apps/web/API-CONTRACT.md`**. Nothing in `apps/extension` was read
or modified.

- **`GET /api/profile`** → `{ user_id, profile, fields, completeness }`
- **`GET /api/profile/completeness`** → `{ filled, total, missing[] }`

`Authorization: Bearer <supabase_access_token>` first (the extension has no
cookie jar), session cookie as fallback. RLS scopes both to `auth.uid()`; no
service-role key in this path.

`fields` is a `profile_key -> { label, value, hints, optional }` map, so the
extension needs no schema knowledge and no hardcoded labels of its own. A null
profile is a `200` with every value `null`, not an error — onboarding-unfinished
is a normal state. Categorical values arrive canonical (`"Male"`, `"Private"`,
`"EWS"`), so they can be compared exactly against a form's options.

`category` and `gender` are `optional` and never count as missing: onboarding
offers "Prefer not to say", and nagging a student about a decision they already
made is a bug.

**`POST /api/profile` stays cookie-only.** The web app is the single source of
truth; the extension reads the profile, it does not write one.

---

## What to run

```bash
npx tsx scripts/catalogue.test.mts          # verdict regressions, offline
npx tsx scripts/gender-rule.test.mts        # the extractor rule, offline
cd packages/db && npx tsx vocab.test.mts    # canonicalisation, offline
npx tsx scripts/coverage.ts                 # the report above

# these need credentials
cd packages/db
npx tsx --env-file=../../apps/web/.env.local audit.ts          # rewrites ACCURACY-AUDIT.md
npx tsx --env-file=../../apps/web/.env.local reharvest.ts --zero [--apply]
npx tsx --env-file=../../apps/web/.env.local dump-seed.ts      # seed.ts <- database
```
