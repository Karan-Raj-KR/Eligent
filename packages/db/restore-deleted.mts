// Restores opportunities deleted by an earlier run of the accuracy gate.
// They are real opportunities; what we lack is verified eligibility data, and
// the current policy is to EXCLUDE such rows, never to delete them.
//
//   npx tsx --env-file=../../apps/web/.env.local restore-deleted.mts [--apply]
//
// Source of truth is packages/db/seed.ts as it stood on `main` before the
// deletions, read from git rather than reconstructed by hand.
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { canonicalCriterion } from "./vocab.js";

const apply = process.argv.includes("--apply");
const URLS = [
  "https://allthingsagentichackathon.devpost.com",
  "https://webmcp.devpost.com",
  "https://unstop.com/internships/vlsi-design-internship-kukbit-sl-1737771",
  "https://smart-city-hackathon-lahore.devpost.com/",
  "https://midnight-hackathon-august-2026.devpost.com/",
  "https://veteran-innovation-hackathon.devpost.com/",
];

const dir = mkdtempSync(path.join(tmpdir(), "seed-main-"));
const file = path.join(dir, "seed-main.ts");
writeFileSync(file, execFileSync("git", ["show", "main:packages/db/seed.ts"], { encoding: "utf8", maxBuffer: 64e6 }));
const { seedOpportunities } = (await import(file)) as typeof import("./seed.js");

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

for (const url of URLS) {
  const entry = seedOpportunities.find((o) => o.url === url);
  if (!entry) { console.error(`  ✗ no seed entry for ${url}`); continue; }

  const { data: existing } = await sb.from("opportunity").select("id").eq("url", url).maybeSingle();
  if (existing) { console.log(`  · already present: ${entry.name}`); continue; }

  console.log(`  ${apply ? "+" : "would restore"} ${entry.name} (${entry.criteria.length} criteria)`);
  if (!apply) continue;

  const { criteria, ...row } = entry;
  const { data, error } = await sb.from("opportunity").insert(row).select("id").single();
  if (error) { console.error(`  ✗ ${error.message}`); continue; }
  if (criteria.length) {
    await sb.from("criterion").insert(criteria.map((c) => ({ ...c, ...canonicalCriterion(c), opportunity_id: data.id })));
  }
}

const { count } = await sb.from("opportunity").select("id", { count: "exact", head: true });
console.log(`\n${apply ? "APPLIED" : "DRY RUN"} — opportunities now: ${count}`);
