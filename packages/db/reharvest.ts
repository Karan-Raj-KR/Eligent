// Targeted re-harvest with the accuracy gate.
//
//   npx tsx --env-file=../../apps/web/.env.local reharvest.ts --zero [--apply]
//   npx tsx --env-file=../../apps/web/.env.local reharvest.ts <url>... [--apply]
//
// For each opportunity: run the real harvest pipeline, and
//   - criteria recovered -> replace its criteria in the database
//   - still none         -> mark criteria_status = 'unverified'
//
// An opportunity with no criteria returns `eligible` for every student alive.
// Such rows are NOT deleted — the opportunity is real, it is our eligibility
// data that is missing. They are marked instead, and /api/matches refuses to
// give them a verdict. (The guard there also treats "zero criterion rows" as
// unverified on its own, so exclusion holds even before this column exists.)
//
// Dry run by default.

import { createClient } from "@supabase/supabase-js";
import { harvestUrl } from "../../scripts/harvest.js";
import { canonicalCriterion } from "./vocab.js";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const wantZero = args.includes("--zero");
const explicitUrls = args.filter((a) => a.startsWith("http"));

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const { data: all, error } = await sb.from("opportunity").select("id,name,url,category,criterion(id)");
if (error) throw error;

const targets = (all ?? []).filter((o) =>
  explicitUrls.length ? explicitUrls.includes(o.url) : wantZero ? o.criterion.length === 0 : false,
);
if (targets.length === 0) {
  console.log("nothing selected — pass --zero or one or more URLs");
  process.exit(0);
}
console.log(`${targets.length} opportunities selected${apply ? "" : "  (DRY RUN)"}\n`);

const recovered: Array<{ name: string; criteria: number; fields: string }> = [];
/** Harvest ran clean and still found nothing quotable — excluded, never deleted. */
const unverifiable: Array<{ id: string; name: string; url: string; category: string; why: string }> = [];
/** Harvest errored — left exactly as it was, never deleted on a failure. */
const skipped: Array<{ name: string; why: string }> = [];

for (const opportunity of targets) {
  let entries;
  try {
    entries = await harvestUrl(opportunity.url);
  } catch (err) {
    skipped.push({ name: opportunity.name, why: `harvest threw: ${err instanceof Error ? err.message : String(err)}` });
    continue;
  }

  // One URL can yield several records; take the one with the most criteria.
  // Do NOT require a name: Devpost records carry none, and the opportunity is
  // already named in the database — filtering on it would delete good rows.
  const best = [...entries].sort((a, b) => b.accepted.length - a.accepted.length)[0];

  // A FAILED harvest is not evidence of anything. Only a harvest that ran
  // cleanly and still found nothing may condemn a row — otherwise a transient
  // model hiccup ("Unexpected end of JSON input") deletes an opportunity that
  // had perfectly good criteria, which is exactly what happened to the Siemens
  // scholarship on the first run of this script.
  const ranCleanly = best?.fetchStatus === "ok";
  if (!ranCleanly) {
    skipped.push({ name: opportunity.name, why: best?.fetchStatus ?? entries[0]?.fetchStatus ?? "no entries" });
    continue;
  }

  if (best.accepted.length === 0) {
    unverifiable.push({ ...opportunity, why: "harvest succeeded but no criterion could be quoted verbatim" });
    continue;
  }

  const rows = best.accepted.map((c) => ({
    opportunity_id: opportunity.id,
    field: c.field,
    ...canonicalCriterion(c),
    display_text: c.display_text,
    source_text: c.source_text,
  }));
  recovered.push({ name: opportunity.name, criteria: rows.length, fields: [...new Set(rows.map((r) => r.field))].join(", ") });

  if (apply) {
    await sb.from("criterion").delete().eq("opportunity_id", opportunity.id);
    const { error: insErr } = await sb.from("criterion").insert(rows);
    if (insErr) console.error(`  ✗ ${opportunity.name}: ${insErr.message}`);
  }
}



console.log("\n================ RECOVERED ================");
for (const r of recovered) console.log(`  ✓ ${r.name.slice(0, 70)} — ${r.criteria} criteria (${r.fields})`);
console.log("\n================ SKIPPED (harvest failed — row untouched) ================");
for (const s of skipped) console.log(`  · ${s.name.slice(0, 70)} — ${s.why}`);
console.log("\n================ UNVERIFIED (kept, excluded from matching) ================");
for (const d of unverifiable) console.log(`  ⃠ ${d.name.slice(0, 70)}\n      ${d.url}\n      ${d.why}`);

if (apply && unverifiable.length) {
  const { error: markErr } = await sb
    .from("opportunity")
    .update({ criteria_status: "unverified" })
    .in("id", unverifiable.map((d) => d.id));
  if (markErr) {
    // Not fatal: /api/matches excludes a zero-criteria row on its own, so these
    // opportunities are already invisible to matching. The column is the
    // explicit record of WHY, and it needs the migration applied first.
    console.error(`\ncould not set criteria_status (${markErr.message})`);
    console.error(`these rows stay excluded anyway — the guard keys off "zero criteria", not the column.`);
    console.error(`apply supabase/migrations/20260830120000_criteria_status.sql, then re-run to record it.`);
  }
}

console.log(`\n${apply ? "APPLIED" : "DRY RUN"}: recovered ${recovered.length}, unverified ${unverifiable.length}, skipped ${skipped.length}`);
