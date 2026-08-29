# Cutoff
Students apply to scholarships they were never eligible for.
43 in -> 6 eligible, 4 near-miss with exact gaps, 33 rejected with the clause.
Then a Chrome extension fills the form. The human always submits.

## Hard rules
- packages/engine has ZERO LLM calls. Eligibility is arithmetic.
- Never auto-submit a form.
- Every LLM output is cached to the DB. No demo path depends on a live model call.
- Never invent scholarship data. Seed data is hand-entered by a human.
- Exactly 3 eligibility states: eligible | near_miss | rejected.

## Stack
Next.js 15 App Router + TS, Supabase (Postgres + Google OAuth),
Tailwind + shadcn/ui, Chrome MV3 vanilla JS, Vercel.
