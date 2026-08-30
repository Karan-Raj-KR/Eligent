// One-off harvester: turns real scholarship pages into packages/db/seed.ts.
// Run: pnpm tsx scripts/harvest.ts
//
// CLAUDE.md: never invent scholarship data. Every criterion here is either a
// verbatim quote validated against the fetched page, or it doesn't ship.
// The LLM proposes; this script's validate() is the only thing that decides.

import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluate, type Criterion, type Profile } from "@opportunity/engine";
import { closeHeadlessBrowser, fetchPageAuto, readLineList, ROOT } from "./lib/fetch-cache";
import { normalizeWhitespace } from "./lib/html";
import { pageRecords, type PageRecord } from "./lib/page-records";
import { classifyOpportunity } from "./sources";
import type { SeedCriterion, SeedOpportunity } from "../packages/db/seed";

const URLS_FILE = path.join(ROOT, "scripts", "urls.txt");
const SEED_FILE = path.join(ROOT, "packages", "db", "seed.ts");
const REPORT_FILE = path.join(ROOT, "scripts", "harvest-report.md");

try {
  process.loadEnvFile(path.join(ROOT, ".env.local"));
} catch {
  // No .env.local — OPENAI_API_KEY may already be in the environment.
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL ?? "gpt-5-nano";

const ALLOWED_FIELDS = [
  "cgpa",
  "percentage",
  "year_of_study",
  "branch",
  "state",
  "annual_family_income",
  "institution_type",
  "category",
  "gender",
  // Added for the broaden migration — the engine is field-agnostic, so these
  // just need matching profile columns (see supabase/migrations/*broaden*).
  "region",
  "nationality",
  "team_size",
  "student_status",
  "age",
  "experience_years",
] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

const ALLOWED_OPERATORS = ["gte", "lte", "eq", "in", "not_in", "between"] as const;
type AllowedOperator = (typeof ALLOWED_OPERATORS)[number];

const SYSTEM_PROMPT = `Extract opportunity eligibility criteria as JSON. The opportunity may be a
scholarship, fellowship, grant, hackathon, internship, programme, event or
competition. You may ONLY output a
criterion if you can quote the exact sentence from the page that states it.
Never infer, never fill gaps, never use outside knowledge.
If the page does not state something, omit it.

Output:
{
  name, provider, deadline (YYYY-MM-DD or null), amount (string or null),
  criteria: [
    { field, operator, value, display_text, source_text }
  ],
  official_documents: [string],
  unextractable: [string]   // criteria stated in prose you could not structure
}

Allowed fields ONLY: cgpa, percentage, year_of_study, branch, state,
annual_family_income, institution_type, category, gender, region, nationality,
team_size, student_status, age, experience_years.
  region        : broad geography a participant must be in ("India", "Asia", "EU")
  nationality   : citizenship restriction ("Indian")
  team_size     : hackathon/competition team-size limit (integer)
  student_status: "student" / "graduate" / "professional" if restricted
  age           : age limit in years (integer)
  experience_years: years of work experience required (number)
Allowed operators ONLY: gte, lte, eq, in, not_in, between.
Many hackathons and events state NO eligibility criteria. That is fine — return
an empty criteria array. NEVER manufacture a criterion to make an opportunity
look filtered.
source_text must be a verbatim sentence from the page. If you cannot quote
it, do not output that criterion — put a note in unextractable instead.

CRITICAL RULES FOR RESTRICTIONS:
- Only extract criteria that actually RESTRICT eligibility.
- If a scholarship is open to "All India" / "All States" / nationwide, do NOT emit a state criterion (emitting state: "All India" breaks matching for applicants in Karnataka). Only emit a state criterion if restricted to specific states (e.g. Karnataka, Maharashtra).
- If open to all genders ("Male and Female" or unrestricted), do NOT emit a gender criterion. Only emit if restricted (e.g. gender: "female").
- If open to all categories ("General, SC, ST, OBC" or unrestricted), do NOT emit a category criterion. Only emit if restricted to specific categories (e.g. "SC", "ST", "OBC", "Minority").
- If open to all institution types (Government, Private, Aided), do NOT emit an institution_type criterion.

TYPES. cgpa, percentage, year_of_study, annual_family_income, team_size, age and
experience_years are numeric. Their value MUST be a JSON number, never a string:
  75            not "75" and not "75%"
  1500000       not "Rs. 15 Lakhs"   (1 lakh = 100000, 1 crore = 10000000)
  1             not "first year"     (year_of_study is an integer: 1, 2, 3...)
Converting the page's own stated units into these numbers is expected. Inventing
a number the page never states is not — omit the criterion instead.
gender, category, branch, state, institution_type, region, nationality and
student_status stay strings.`;

// ---------- types ----------

interface RawCriterion {
  field?: unknown;
  operator?: unknown;
  value?: unknown;
  display_text?: unknown;
  source_text?: unknown;
}

interface RawExtraction {
  name?: unknown;
  provider?: unknown;
  deadline?: unknown;
  amount?: unknown;
  criteria?: unknown;
  official_documents?: unknown;
  unextractable?: unknown;
}

interface ValidatedCriterion {
  field: AllowedField;
  operator: AllowedOperator;
  value: Criterion["value"];
  display_text: string;
  source_text: string;
}

interface Rejection {
  raw: unknown;
  reason: string;
}

interface HarvestEntry {
  url: string;
  fetchStatus: "ok" | string; // "ok" or "error: <message>"
  name: string | null;
  provider: string | null;
  deadline: string | null;
  amount: string | null;
  officialDocuments: string[];
  accepted: ValidatedCriterion[];
  rejectedCriteria: Rejection[];
  rejectedDeadline: string | null; // reason, if the extracted deadline was rejected
  unextractable: string[];
}

// ---------- LLM extraction ----------

async function extract(pageText: string, url: string): Promise<RawExtraction | { error: string }> {
  if (!OPENAI_API_KEY) return { error: "OPENAI_API_KEY not set" };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        // max_completion_tokens (not max_tokens) — the reasoning-family models
        // reject the old parameter, and they also reject a custom temperature.
        max_completion_tokens: 8000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Page URL: ${url}\n\nPage text:\n${pageText}` },
        ],
      }),
    });
    if (!res.ok) return { error: `OpenAI HTTP ${res.status}: ${await res.text()}` };
    const body = await res.json();
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== "string") return { error: "no content in OpenAI response" };
    return JSON.parse(content) as RawExtraction;
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------- validation (never trust the model) ----------

function isAllowedField(f: unknown): f is AllowedField {
  return typeof f === "string" && (ALLOWED_FIELDS as readonly string[]).includes(f);
}

function isAllowedOperator(o: unknown): o is AllowedOperator {
  return typeof o === "string" && (ALLOWED_OPERATORS as readonly string[]).includes(o);
}

/** Confirms `value` has the shape its operator requires — malformed values would
 * otherwise reach evaluate() at runtime and misbehave silently. */
export function valueMatchesOperator(operator: AllowedOperator, value: unknown): boolean {
  switch (operator) {
    case "gte":
    case "lte":
      return typeof value === "number" && Number.isFinite(value);
    case "eq":
      return typeof value === "number" || typeof value === "string";
    case "in":
    case "not_in":
      return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === "number" || typeof v === "string");
    case "between":
      return (
        Array.isArray(value) &&
        value.length === 2 &&
        value.every((v) => typeof v === "number" && Number.isFinite(v)) &&
        (value as number[])[0] <= (value as number[])[1]
      );
  }
}

/** Fields the profile stores as numbers. A string here never compares equal. */
const NUMERIC_FIELDS: readonly string[] = [
  "cgpa",
  "percentage",
  "year_of_study",
  "annual_family_income",
  "team_size",
  "age",
  "experience_years",
];

/**
 * The model reliably returns "60" where the schema needs 60 — same value off the
 * same page, wrong JSON type. eq accepts strings, so these slip past
 * valueMatchesOperator and land in the seed as criteria no profile can ever
 * satisfy (year_of_study eq "1" vs. an int 1).
 *
 * This only re-types a value that is already a clean number. Prose the model
 * failed to quantify ("first year") does NOT get interpreted into a number —
 * it returns null and the criterion is rejected and logged. Turning words into
 * numbers is exactly the guessing this pipeline refuses to do.
 */
export function coerceNumericValue(value: unknown): unknown {
  const one = (v: unknown): unknown => {
    if (typeof v !== "string") return v;
    const trimmed = v.trim();
    if (!trimmed || !/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  };
  if (Array.isArray(value)) {
    const mapped = value.map(one);
    return mapped.some((v) => v === null) ? null : mapped;
  }
  return one(value);
}

export function validateCriterion(raw: RawCriterion, normalizedPageText: string): ValidatedCriterion | Rejection {
  const { field, operator, value, display_text, source_text } = raw;

  if (typeof source_text !== "string" || !source_text.trim()) {
    return { raw, reason: "missing source_text" };
  }
  if (!isAllowedField(field)) {
    return { raw, reason: `unknown field "${String(field)}"` };
  }
  if (!isAllowedOperator(operator)) {
    return { raw, reason: `unknown operator "${String(operator)}"` };
  }
  const typedValue = NUMERIC_FIELDS.includes(field) ? coerceNumericValue(value) : value;
  if (typedValue === null && value !== null) {
    return { raw, reason: `field "${field}" is numeric but value ${JSON.stringify(value)} is not a number` };
  }
  if (!valueMatchesOperator(operator, typedValue)) {
    return { raw, reason: `value does not match operator "${operator}"` };
  }
  if (!normalizedPageText.includes(normalizeWhitespace(source_text))) {
    return { raw, reason: "source_text not found verbatim on the page" };
  }
  if (typeof display_text !== "string" || !display_text.trim()) {
    return { raw, reason: "missing display_text" };
  }

  return {
    field,
    operator,
    value: typedValue as Criterion["value"],
    display_text,
    source_text,
  };
}

export function isPastDeadline(deadline: string): boolean {
  const parsed = new Date(`${deadline}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false; // malformed date — let it through as-is, not our call to fabricate a fix
  const todayUtc = new Date();
  const todayDateOnly = Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate());
  return parsed.getTime() < todayDateOnly;
}

export async function harvestUrl(url: string): Promise<HarvestEntry[]> {
  const failed = (status: string): HarvestEntry[] => [
    {
      url,
      fetchStatus: status,
      name: null,
      provider: null,
      deadline: null,
      amount: null,
      officialDocuments: [],
      accepted: [],
      rejectedCriteria: [],
      rejectedDeadline: null,
      unextractable: [],
    },
  ];

  const fetched = await fetchPageAuto(url);
  if ("error" in fetched) {
    console.log(`[${url}] fetch failed: ${fetched.error}`);
    return failed(`error: ${fetched.error}`);
  }
  console.log(`[${url}] ${fetched.via === "headless" ? "HEADLESS" : "FETCH"}`);

  // One page can publish many opportunities (the current edition plus every
  // expired past one). Split first, then harvest each on its own.
  const records = pageRecords(fetched.html, url);
  if (records.length === 0) {
    console.log(`[${url}] no readable content on the page — nothing to harvest`);
    return failed("error: no readable content");
  }
  console.log(`[${url}] ${records.length} opportunit${records.length === 1 ? "y" : "ies"} on this page`);

  // A page with a long list of live opportunities is a brand/aggregator page,
  // not a detail page — harvesting all of them blends unrelated criteria and
  // burns a model call each. Detail pages carry one, occasionally a handful of
  // editions. ponytail: fixed cap, revisit if a real detail page exceeds it.
  const live = records.filter((r) => !(r.deadline && isPastDeadline(r.deadline)));
  if (live.length > 6) {
    console.log(`[${url}] ${live.length} live opportunities — looks like an aggregator page, skipping`);
    return failed(`error: aggregator page (${live.length} live opportunities)`);
  }

  const entries: HarvestEntry[] = [];
  for (const record of records) {
    // Drop expired editions BEFORE spending a model call on them.
    if (record.deadline && isPastDeadline(record.deadline)) {
      console.log(`  - skip "${record.name}": deadline ${record.deadline} has passed`);
      continue;
    }
    entries.push(await harvestRecord(record));
  }

  if (entries.length === 0) console.log(`  (every opportunity on this page has passed its deadline)`);
  return entries;
}

async function harvestRecord(record: PageRecord): Promise<HarvestEntry> {
  const url = record.url;
  const base: HarvestEntry = {
    url,
    fetchStatus: "ok",
    name: record.name,
    provider: record.provider,
    deadline: null,
    amount: record.amount,
    officialDocuments: [],
    accepted: [],
    rejectedCriteria: [],
    rejectedDeadline: null,
    unextractable: [],
  };

  const normalizedPageText = normalizeWhitespace(record.text);
  console.log(`  - harvesting "${record.name}" ...`);

  const extraction = await extract(record.text, url);
  if ("error" in extraction) {
    console.log(`    extraction failed: ${extraction.error}`);
    return { ...base, fetchStatus: `error: ${extraction.error}` };
  }

  // The site's own structured fields beat anything the model reports: they are
  // published data, not a reading of prose. The model only fills the gaps.
  const name = record.name ?? (typeof extraction.name === "string" && extraction.name.trim() ? extraction.name.trim() : null);
  const provider = record.provider ?? (typeof extraction.provider === "string" ? extraction.provider.trim() || null : null);
  const amount = record.amount ?? (typeof extraction.amount === "string" ? extraction.amount.trim() || null : null);

  const claimedDeadline = record.deadline ?? (typeof extraction.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(extraction.deadline) ? extraction.deadline : null);
  let deadline: string | null = null;
  let rejectedDeadline: string | null = null;
  if (claimedDeadline) {
    if (isPastDeadline(claimedDeadline)) {
      rejectedDeadline = `deadline ${claimedDeadline} is in the past`;
      console.log(`    rejected deadline "${claimedDeadline}": in the past`);
    } else {
      deadline = claimedDeadline;
    }
  }

  const officialDocuments = Array.isArray(extraction.official_documents)
    ? extraction.official_documents.filter((d): d is string => typeof d === "string" && d.trim().length > 0)
    : [];

  const unextractable = Array.isArray(extraction.unextractable)
    ? extraction.unextractable.filter((d): d is string => typeof d === "string" && d.trim().length > 0)
    : [];

  const accepted: ValidatedCriterion[] = [];
  const rejectedCriteria: Rejection[] = [];
  for (const rawCriterion of Array.isArray(extraction.criteria) ? extraction.criteria : []) {
    const result = validateCriterion(rawCriterion as RawCriterion, normalizedPageText);
    if ("reason" in result) {
      rejectedCriteria.push(result);
      console.log(`    rejected criterion: ${JSON.stringify(rawCriterion)} — ${result.reason}`);
    } else {
      accepted.push(result);
    }
  }
  console.log(`    accepted ${accepted.length}, rejected ${rejectedCriteria.length}`);

  if (!name) console.log(`    no scholarship name — nothing will be seeded`);

  return {
    url,
    fetchStatus: "ok",
    name,
    provider,
    deadline,
    amount,
    officialDocuments,
    accepted,
    rejectedCriteria,
    rejectedDeadline,
    unextractable,
  };
}


// ---------- output: seed.ts ----------

/** A validated harvest entry → the seed shape. category / location_type /
 * funded are the source's classification, not read off the page; a URL matching
 * no configured source defaults to scholarship / india / true (the broaden
 * migration's column defaults). */
function entryToSeed(e: HarvestEntry): SeedOpportunity {
  const { category, location_type, funded } = classifyOpportunity(e.url);
  return {
    name: e.name as string,
    provider: e.provider,
    url: e.url,
    deadline: e.deadline,
    amount: e.amount,
    category,
    location_type,
    funded,
    official_documents: e.officialDocuments,
    criteria: e.accepted.map((c) => ({
      field: c.field,
      operator: c.operator,
      value: c.value,
      display_text: c.display_text,
      source_text: c.source_text,
    })) as SeedCriterion[],
  };
}

function serializeOpportunity(o: SeedOpportunity): string {
  const criteria = o.criteria
    .map(
      (c) => `      {
        field: ${JSON.stringify(c.field)},
        operator: ${JSON.stringify(c.operator)},
        value: ${JSON.stringify(c.value)},
        display_text: ${JSON.stringify(c.display_text)},
        source_text: ${JSON.stringify(c.source_text)},
      }`,
    )
    .join(",\n");
  return `  {
    name: ${JSON.stringify(o.name)},
    provider: ${JSON.stringify(o.provider)},
    url: ${JSON.stringify(o.url)},
    deadline: ${JSON.stringify(o.deadline)},
    amount: ${JSON.stringify(o.amount)},
    category: ${JSON.stringify(o.category)},
    location_type: ${JSON.stringify(o.location_type)},
    funded: ${JSON.stringify(o.funded)},
    official_documents: ${JSON.stringify(o.official_documents)},
    criteria: [
${criteria}
    ],
  }`;
}

export function writeSeedFile(opportunities: SeedOpportunity[]) {
  const body = opportunities.map(serializeOpportunity).join(",\n");

  const content = `// Generated by scripts/harvest.ts — do not hand-edit. Regenerate with:
//   pnpm tsx scripts/harvest.ts
// Every criterion below passed validate(): its source_text is a verbatim quote
// from the fetched page. See scripts/harvest-report.md for what was rejected.

export interface SeedCriterion {
  field: string;
  operator: string;
  value: number | string | Array<number | string>;
  display_text: string;
  source_text: string;
}

export type OpportunityCategory =
  | "scholarship" | "fellowship" | "grant" | "hackathon"
  | "internship" | "programme" | "event" | "competition";

export interface SeedOpportunity {
  name: string;
  provider: string | null;
  url: string;
  deadline: string | null;
  amount: string | null;
  category: OpportunityCategory;
  location_type: "india" | "abroad" | "online";
  funded: boolean;
  official_documents: string[];
  criteria: SeedCriterion[];
}

export const seedOpportunities: SeedOpportunity[] = [
${body}
];
`;
  writeFileSync(SEED_FILE, content, "utf8");
}

// ---------- output: harvest-report.md ----------

function writeReport(entries: HarvestEntry[]) {
  const sections = entries.map((e) => {
    const lines: string[] = [`## ${e.name ?? e.url}`, "", `- URL: ${e.url}`, `- Fetch status: ${e.fetchStatus}`];

    if (e.fetchStatus !== "ok") {
      return lines.join("\n");
    }

    lines.push(`- Deadline: ${e.deadline ?? (e.rejectedDeadline ? `rejected — ${e.rejectedDeadline}` : "not stated")}`);
    lines.push("");
    lines.push(`### Criteria extracted (${e.accepted.length})`);
    lines.push(
      ...(e.accepted.length
        ? e.accepted.map((c) => `- \`${c.field} ${c.operator} ${JSON.stringify(c.value)}\` — "${c.source_text}"`)
        : ["- none"]),
    );
    lines.push("");
    lines.push(`### Criteria rejected (${e.rejectedCriteria.length})`);
    lines.push(
      ...(e.rejectedCriteria.length
        ? e.rejectedCriteria.map((r) => `- ${JSON.stringify(r.raw)} — ${r.reason}`)
        : ["- none"]),
    );
    lines.push("");
    lines.push(`### Unextractable prose (${e.unextractable.length})`);
    lines.push(...(e.unextractable.length ? e.unextractable.map((u) => `- ${u}`) : ["- none"]));
    lines.push("");
    lines.push(`### Official documents (${e.officialDocuments.length})`);
    lines.push(...(e.officialDocuments.length ? e.officialDocuments.map((d) => `- ${d}`) : ["- none"]));

    return lines.join("\n");
  });

  const content = `# Harvest Report

Generated: ${new Date().toISOString()}
URLs processed: ${entries.length}

${sections.join("\n\n---\n\n")}
`;
  writeFileSync(REPORT_FILE, content, "utf8");
}

// ---------- coverage report ----------

const TEST_PROFILE: Profile = {
  cgpa: 8.4,
  percentage: 82,
  year_of_study: 2,
  branch: "CSE",
  state: "Karnataka",
  annual_family_income: 300000,
  institution_type: "private",
  category: "General",
  gender: "male",
};

const TARGET_OPPORTUNITIES = 35;

export function printCoverageReport(seeded: SeedOpportunity[]) {
  console.log("\n=== COVERAGE REPORT ===");
  console.log(`Opportunities in catalog: ${seeded.length}\n`);

  console.log("Rows per category:");
  const byCategory = new Map<string, number>();
  for (const o of seeded) byCategory.set(o.category, (byCategory.get(o.category) ?? 0) + 1);
  for (const [cat, n] of [...byCategory].sort()) console.log(`  ${cat}: ${n}`);

  const scholarshipsOrFundedProgrammes = seeded.filter(
    (o) => o.category === "scholarship" || (o.category === "programme" && o.funded),
  ).length;
  console.log(`\nScholarships or funded programmes: ${scholarshipsOrFundedProgrammes} (gate: >= 8)`);

  console.log("\nField usage (opportunities with at least one criterion on this field):");
  for (const field of ALLOWED_FIELDS) {
    const count = seeded.filter((o) => o.criteria.some((c) => c.field === field)).length;
    if (count) console.log(`  ${field}: ${count}`);
  }

  // An opportunity with zero extractable criteria evaluates as vacuously eligible
  // (no failures) — that's the engine working correctly, not this script guessing.
  const buckets = { eligible: 0, near_miss: 0, rejected: 0 };
  for (const o of seeded) {
    const result = evaluate(TEST_PROFILE, o.criteria as Criterion[]);
    buckets[result.status] += 1;
  }

  console.log("\nTest profile (CGPA 8.4, percentage 82, year 2, CSE, Karnataka, income 3L, private institution, General, male):");
  console.log(`  eligible:  ${buckets.eligible}`);
  console.log(`  near_miss: ${buckets.near_miss}`);
  console.log(`  rejected:  ${buckets.rejected}`);

  console.log("");
  for (const [bucket, count] of Object.entries(buckets)) {
    if (count < 3) console.log(`⚠️  WARNING: bucket "${bucket}" has only ${count} opportunit${count === 1 ? "y" : "ies"} (< 3)`);
  }
}

// ---------- main ----------

async function main() {
  if (!existsSync(URLS_FILE)) {
    console.error(`Missing ${path.relative(ROOT, URLS_FILE)} — add one official scholarship URL per line.`);
    process.exit(1);
  }
  const urls = readLineList(URLS_FILE);

  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set (checked .env.local and the environment).");
    process.exit(1);
  }

  // Append-only: keep every already-validated row and only harvest URLs not yet
  // in the catalog. Re-harvesting a good row risks the non-deterministic model
  // dropping a criterion that passed last time — see MORNING-REPORT.
  const { seedOpportunities: existing } = (await import("../packages/db/seed")) as {
    seedOpportunities: SeedOpportunity[];
  };
  const known = new Set(existing.map((o) => o.url));
  console.log(`Catalog holds ${existing.length} opportunities. Harvesting new URLs only.`);

  const entries: HarvestEntry[] = [];
  for (const url of urls) {
    if (known.has(url)) continue;
    console.log(`\nHarvesting ${url} ...`);
    const newEntries = await harvestUrl(url);
    entries.push(...newEntries);

    const validNew = entries.filter((e) => e.name && e.fetchStatus === "ok").length;
    if (existing.length + validNew >= TARGET_OPPORTUNITIES) {
      console.log(`\nReached target of ${TARGET_OPPORTUNITIES} opportunities. Stopping harvest.`);
      break;
    }
  }
  await closeHeadlessBrowser();

  const harvested = entries.filter((e) => e.name && e.fetchStatus === "ok").map(entryToSeed);
  // Dedupe on url: a page that lists many opportunities can surface one already known.
  const merged: SeedOpportunity[] = [...existing];
  const mergedUrls = new Set(known);
  for (const o of harvested) {
    if (mergedUrls.has(o.url)) continue;
    mergedUrls.add(o.url);
    merged.push(o);
  }

  writeSeedFile(merged);
  writeReport(entries);
  console.log(`\nWrote ${path.relative(ROOT, SEED_FILE)} and ${path.relative(ROOT, REPORT_FILE)} — ${merged.length} opportunities (${harvested.length} new).`);
  printCoverageReport(merged);
}

// Run only when executed directly (`pnpm tsx scripts/harvest.ts`), not when
// harvest.test.ts imports this module for its pure functions.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
