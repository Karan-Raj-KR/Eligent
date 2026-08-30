// Regenerates packages/db/seed.ts FROM the live database.
//
//   npx tsx --env-file=../../apps/web/.env.local dump-seed.ts
//
// seed.ts is normally written by a full harvest run. Targeted work — a single
// re-harvest, a vocabulary backfill, a deletion — changes the database without
// touching it, and a seed file that disagrees with the database is a trap: the
// next `pnpm db:push` would quietly undo all of it. This puts them back in
// agreement, and gives the offline catalogue tests something real to read.

import { createClient } from "@supabase/supabase-js";
import { writeSeedFile } from "../../scripts/harvest.js";
import type { SeedOpportunity } from "./seed.js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const { data, error } = await sb
  .from("opportunity")
  .select("name,provider,url,deadline,amount,category,location_type,funded,official_documents,criterion(field,operator,value,display_text,source_text)")
  .order("name");
if (error) throw error;

const opportunities: SeedOpportunity[] = (data ?? []).map((o) => ({
  name: o.name,
  provider: o.provider,
  url: o.url,
  deadline: o.deadline,
  amount: o.amount,
  category: o.category,
  location_type: o.location_type,
  funded: o.funded,
  official_documents: o.official_documents ?? [],
  criteria: (o.criterion ?? []).map((c) => ({
    field: c.field,
    operator: c.operator,
    value: c.value,
    display_text: c.display_text ?? "",
    source_text: c.source_text ?? "",
  })),
})) as SeedOpportunity[];

writeSeedFile(opportunities);
console.log(`seed.ts regenerated from the database: ${opportunities.length} opportunities, ${opportunities.reduce((n, o) => n + o.criteria.length, 0)} criteria`);
