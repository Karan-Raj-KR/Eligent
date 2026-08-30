# Eligent

**Eligent tells students what they shouldn't apply to — and quotes the exact clause that disqualifies them.**

Built in 24 hours at The Hive Sprint, Startup Park Bengaluru, 29–30 August 2026.

🔗 **Live:** https://eligent.karanrajkr.com  ·  🎥 **Demo (3 min):** [video link]

---

## The problem

Students spend hours on applications they were never eligible for, and skip ones they'd have won.

Eligibility is written as prose, buried across a hundred portals, and nobody verifies it before starting. Then the portal demands documents the website never listed.

**The reframe:** every tool in this space helps you apply to *more* things. The problem is applying to *fewer, better* things — and nothing checks whether you should start at all.

---

## What it does

Enter your profile once. Eligent checks it against every opportunity in the catalog and returns three answers:

| | |
|---|---|
| **Eligible** | You qualify — with every clause you pass |
| **Near miss** | The exact gap. "0.2 CGPA short", not "you don't qualify" |
| **Not eligible** | The verbatim sentence from their site that rules you out, with the source URL |

Then the Chrome extension, on the real portal:

1. **Fills** the form from your profile
2. **Refuses to fill** a form you aren't eligible for, and shows you the clause instead
3. **Diffs documents** — compares the portal's actual file inputs against the official requirement list: *"This form demands 6 documents. Their page listed 4. Here are the two nobody told you about."*

**The human always clicks submit.** Eligent never submits, never accepts terms, never ticks a declaration.

---

## Why it's defensible

### 1. Eligibility is arithmetic, not AI

`packages/engine` contains **zero LLM calls**. It is a pure function: structured profile in, structured verdict out. An LLM that guesses whether you qualify is worse than no product at all.

```ts
evaluate(profile, criteria[]) -> {
  status: 'eligible' | 'near_miss' | 'rejected',
  passed: [{ field, displayText, profileValue, requirement }],
  failed: [{ field, displayText, profileValue, requirement,
             gap?: { amount, unit, direction } }]
}
```

- Operators: `gte`, `lte`, `eq`, `in`, `not_in`, `between`
- Near miss **only** when every failure is numeric and within 10% of the threshold, or year of study is short by exactly one
- Any categorical failure (state, branch, gender, institution type) → rejected, never near miss
- A missing profile field → rejected, never near miss. Conservative by design.

### 2. Every verdict is quoted

The model never decides anything. It reads scraped prose *offline* and proposes structured criteria — and each one is rejected in code unless its `source_text` appears **verbatim** in the page. Unknown fields, unknown operators, malformed values and past deadlines are all rejected too, with every rejection logged.

**Agents read. Arithmetic decides.**

### 3. Official truth vs portal reality

The document diff is computed by string comparison against the official requirement list — no model call, works from day one, and gets sharper as applicants report what they actually hit.

---

## Architecture

```
apps/
  web/                Next.js 15 App Router — UI + API routes
    app/api/          profile · matches · application · fill · report
  extension/          Chrome MV3, vanilla JS — fill, block, document diff
packages/
  engine/             Deterministic eligibility. ZERO LLM calls.
  db/                 Schema + seed
scripts/
  discover.ts         Collects opportunity URLs from source pages
  harvest.ts          Fetch → headless fallback → extract → VALIDATE → seed
```

**Stack:** Next.js 15 · TypeScript · Supabase (Postgres, anonymous auth, RLS) · Tailwind + shadcn/ui · Chrome MV3 · Playwright (harvest only) · Vercel

**Data pipeline:** plain fetch first; JS-rendered pages fall back to headless Chromium; every page cached so re-runs cost nothing. Sources include Buddy4Study, IndiaScholarships and the Devpost hackathons endpoint.

---

## Design rules we didn't break

- No LLM in the eligibility path. Ever.
- Never auto-submit. Never accept terms or declarations on the user's behalf.
- Never invent an opportunity. `source_text` must match the page verbatim.
- Never fabricate a community report.
- Missing information → rejected, never near miss.
- Every model output cached to the database. No demo path depends on a live model call.
- Never set a file input programmatically — detect and guide only.

---

## Run it locally

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # add your Supabase URL + anon key
pnpm --filter @eligent/db db:push
pnpm dev
```

Extension: `chrome://extensions` → Developer mode → Load unpacked → `apps/extension/dist`

Harvest more opportunities:
```bash
pnpm tsx scripts/discover.ts   # collect URLs from scripts/sources.txt
pnpm tsx scripts/harvest.ts    # extract, validate, seed
```

---

## Business model

- **Free forever:** see what you qualify for. This is the proof and the funnel.
- **₹99 lifetime:** Apply Mode — extension form filling, requirement checklist, document diff.
- **At scale:** institutions license it per seat (colleges are measured on aid outcomes), and scholarship providers pay for pre-qualified applicants instead of inboxes full of ineligible ones.

A student shouldn't have to pay to find money they already qualify for.

---

## Team

**Karan Raj K R** — engine, API, extension, data pipeline
**Mohammed Mustafa** — frontend, design

Built at The Hive Sprint · ApplyBee AI · Startup Park Bengaluru
