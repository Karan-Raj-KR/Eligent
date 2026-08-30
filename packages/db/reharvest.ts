// Targeted re-harvest with the accuracy gate.
//
//   npx tsx --env-file=../../apps/web/.env.local reharvest.ts --zero [--apply]
//   npx tsx --env-file=../../apps/web/.env.local reharvest.ts <url>... [--apply]
//
// For each opportunity: run the real harvest pipeline, and
//   - criteria recovered -> replace its criteria in the database
//   - still none         -> DELETE the opportunity
//
// An opportunity with no criteria returns `eligible` for every student alive.
// A smaller accurate catalogue beats a larger wrong one, so the gate is
// absolute: at least one criterion carrying a verbatim source_text, or it goes.
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
const doomed: Array<{ id: string; name: string; url: string; category: string; why: string }> = [];

for (const opportunity of targets) {
  let entries;
  try {
    entries = await harvestUrl(opportunity.url);
  } catch (err) {
    doomed.push({ ...opportunity, why: `harvest threw: ${err instanceof Error ? err.message : String(err)}` });
    continue;
  }

  // One URL can yield several records; take the one with the most criteria.
  // Do NOT require a name: Devpost records carry none, and the opportunity is
  // already named in the database — filtering on it would delete good rows.
  const best = [...entries].sort((a, b) => b.accepted.length - a.accepted.length)[0];

  if (!best || best.accepted.length === 0) {
    doomed.push({
      ...opportunity,
      why: best
        ? `no criterion could be extracted with a verbatim source_text (fetch: ${best.fetchStatus})`
        : `fetch/extract failed (${entries[0]?.fetchStatus ?? "no entries"})`,
    });
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

// What a delete would take with it — application rows cascade.
for (const d of doomed) {
  const { count } = await sb.from("application").select("id", { count: "exact", head: true }).eq("opportunity_id", d.id);
  d.why += `  [${count ?? 0} application(s) would cascade]`;
}

console.log("\n================ RECOVERED ================");
for (const r of recovered) console.log(`  ✓ ${r.name.slice(0, 70)} — ${r.criteria} criteria (${r.fields})`);
console.log("\n================ TO DELETE ================");
for (const d of doomed) console.log(`  ✗ ${d.name.slice(0, 70)}\n      ${d.url}\n      ${d.why}`);

if (apply && doomed.length) {
  const { error: delErr } = await sb.from("opportunity").delete().in("id", doomed.map((d) => d.id));
  if (delErr) console.error(`delete failed: ${delErr.message}`);
}

console.log(`\n${apply ? "APPLIED" : "DRY RUN"}: recovered ${recovered.length}, deleted ${doomed.length}`);
