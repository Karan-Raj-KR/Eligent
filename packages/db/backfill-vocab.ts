// One-off: canonicalise categorical values already stored in profile and
// criterion rows. New writes go through load.ts / POST /api/profile, which
// canonicalise on the way in — this fixes what was written before they did.
//
//   npx tsx --env-file=../../apps/web/.env.local backfill-vocab.ts [--apply]
//
// Dry run by default: prints every change and writes nothing.

import { createClient } from "@supabase/supabase-js";
import { CATEGORICAL_FIELDS, canonicalValue, canonicalCriterion } from "./vocab.js";

const apply = process.argv.includes("--apply");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

let profileChanges = 0;
const { data: profiles, error: pErr } = await sb.from("profile").select("*");
if (pErr) throw pErr;
for (const profile of profiles ?? []) {
  const patch: Record<string, unknown> = {};
  for (const field of CATEGORICAL_FIELDS) {
    const current = (profile as Record<string, unknown>)[field];
    if (typeof current !== "string") continue;
    const canonical = canonicalValue(field, current);
    if (canonical !== current) patch[field] = canonical;
  }
  if (Object.keys(patch).length === 0) continue;
  profileChanges++;
  console.log(`profile ${String(profile.id).slice(0, 8)}: ${JSON.stringify(patch)}`);
  if (apply) {
    const { error } = await sb.from("profile").update(patch).eq("id", profile.id);
    if (error) console.error(`  ✗ ${error.message}`);
  }
}

let criterionChanges = 0;
const { data: criteria, error: cErr } = await sb.from("criterion").select("id,field,operator,value");
if (cErr) throw cErr;
for (const c of criteria ?? []) {
  const canonical = canonicalCriterion(c);
  if (JSON.stringify(canonical.value) === JSON.stringify(c.value) && canonical.operator === c.operator) continue;
  criterionChanges++;
  console.log(
    `criterion ${c.id.slice(0, 8)} ${c.field}: ${c.operator} ${JSON.stringify(c.value)} -> ${canonical.operator} ${JSON.stringify(canonical.value)}`,
  );
  if (apply) {
    const { error } = await sb.from("criterion").update(canonical).eq("id", c.id);
    if (error) console.error(`  ✗ ${error.message}`);
  }
}

console.log(`\n${apply ? "APPLIED" : "DRY RUN"}: ${profileChanges} profile rows, ${criterionChanges} criterion rows`);
if (!apply) console.log("re-run with --apply to write.");
