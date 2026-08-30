// Loads the harvested seed into Postgres. Run: pnpm db:push
//
// Idempotent by design: opportunities upsert on their unique url, and an
// opportunity's criteria are replaced wholesale (delete-then-insert) so a
// re-harvest that drops a criterion actually drops it from the database too.
//
// Uses the service-role key because RLS deliberately makes `opportunity` and
// `criterion` read-only to clients. This is a one-off script and must never be
// imported by apps/web — that was the exact footgun packages/db/src/client.ts
// presented before it was deleted.

import { createClient } from "@supabase/supabase-js";
import { seedOpportunities } from "./seed";
import { canonicalCriterion } from "./vocab";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  console.error("Put them in the environment (not in a committed file) and re-run.");
  process.exit(1);
}

if (/dummy\.supabase\.co/i.test(url)) {
  console.error(`SUPABASE_URL is still the placeholder (${url}). Point it at a real project first.`);
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  if (seedOpportunities.length === 0) {
    console.log("seed.ts is empty — run `pnpm tsx scripts/harvest.ts` first. Nothing loaded.");
    return;
  }

  let opportunitiesWritten = 0;
  let criteriaWritten = 0;

  for (const opportunity of seedOpportunities) {
    const { criteria, ...row } = opportunity;

    const { data: saved, error: upsertError } = await supabase
      .from("opportunity")
      .upsert(row, { onConflict: "url" })
      .select("id")
      .single();

    if (upsertError || !saved) {
      console.error(`✗ ${opportunity.name}: ${upsertError?.message ?? "no row returned"}`);
      process.exitCode = 1;
      continue;
    }
    opportunitiesWritten += 1;

    // Replace, don't append: re-running must not stack duplicate criteria.
    const { error: deleteError } = await supabase.from("criterion").delete().eq("opportunity_id", saved.id);
    if (deleteError) {
      console.error(`✗ ${opportunity.name}: clearing old criteria failed — ${deleteError.message}`);
      process.exitCode = 1;
      continue;
    }

    if (criteria.length > 0) {
      const { error: insertError } = await supabase
        .from("criterion")
        // Canonicalise on the way in: the engine compares categorical values
        // with === , so "female" here and "Female" on a profile is a silent
        // wrong verdict. See vocab.ts.
        .insert(
          criteria.map((c) => ({ ...c, ...canonicalCriterion(c), opportunity_id: saved.id })),
        );
      if (insertError) {
        console.error(`✗ ${opportunity.name}: inserting criteria failed — ${insertError.message}`);
        process.exitCode = 1;
        continue;
      }
      criteriaWritten += criteria.length;
    }

    console.log(`✓ ${opportunity.name} (${criteria.length} criteria)`);
  }

  console.log(`\nLoaded ${opportunitiesWritten} opportunities, ${criteriaWritten} criteria.`);

  const { count } = await supabase.from("opportunity").select("*", { count: "exact", head: true });
  if (typeof count === "number") console.log(`opportunity table now holds ${count} row(s).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
