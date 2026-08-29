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
import { fetchPage, readLineList, ROOT } from "./lib/fetch-cache";
import { htmlToText, normalizeWhitespace } from "./lib/html";

const URLS_FILE = path.join(ROOT, "scripts", "urls.txt");
const SEED_FILE = path.join(ROOT, "packages", "db", "seed.ts");
const REPORT_FILE = path.join(ROOT, "scripts", "harvest-report.md");

try {
  process.loadEnvFile(path.join(ROOT, ".env.local"));
} catch {
  // No .env.local — OPENAI_API_KEY may already be in the environment.
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

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
] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

const ALLOWED_OPERATORS = ["gte", "lte", "eq", "in", "not_in", "between"] as const;
type AllowedOperator = (typeof ALLOWED_OPERATORS)[number];

const SYSTEM_PROMPT = `Extract scholarship eligibility criteria as JSON. You may ONLY output a
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
annual_family_income, institution_type, category, gender.
Allowed operators ONLY: gte, lte, eq, in, not_in, between.
source_text must be a verbatim sentence from the page. If you cannot quote
it, do not output that criterion — put a note in unextractable instead.`;

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
        temperature: 0,
        response_format: { type: "json_object" },
        max_tokens: 2000,
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
  if (!valueMatchesOperator(operator, value)) {
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
    value: value as Criterion["value"],
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

async function harvestOne(url: string): Promise<HarvestEntry> {
  const base: HarvestEntry = {
    url,
    fetchStatus: "ok",
    name: null,
    provider: null,
    deadline: null,
    amount: null,
    officialDocuments: [],
    accepted: [],
    rejectedCriteria: [],
    rejectedDeadline: null,
    unextractable: [],
  };

  const fetched = await fetchPage(url);
  if ("error" in fetched) {
    console.log(`[${url}] fetch failed: ${fetched.error}`);
    return { ...base, fetchStatus: `error: ${fetched.error}` };
  }

  const pageText = htmlToText(fetched.html);
  const normalizedPageText = normalizeWhitespace(pageText);

  const extraction = await extract(pageText, url);
  if ("error" in extraction) {
    console.log(`[${url}] extraction failed: ${extraction.error}`);
    return { ...base, fetchStatus: `error: ${extraction.error}` };
  }

  const name = typeof extraction.name === "string" && extraction.name.trim() ? extraction.name.trim() : null;
  const provider = typeof extraction.provider === "string" ? extraction.provider.trim() : null;
  const amount = typeof extraction.amount === "string" ? extraction.amount.trim() : null;

  let deadline: string | null = null;
  let rejectedDeadline: string | null = null;
  if (typeof extraction.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(extraction.deadline)) {
    if (isPastDeadline(extraction.deadline)) {
      rejectedDeadline = `deadline ${extraction.deadline} is in the past`;
      console.log(`[${url}] rejected deadline "${extraction.deadline}": in the past`);
    } else {
      deadline = extraction.deadline;
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
      console.log(`[${url}] rejected criterion: ${JSON.stringify(rawCriterion)} — ${result.reason}`);
    } else {
      accepted.push(result);
    }
  }

  if (!name) console.log(`[${url}] no scholarship name extracted — nothing will be seeded`);

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

function writeSeedFile(entries: HarvestEntry[]) {
  const seedable = entries.filter((e) => e.name);

  const body = seedable
    .map((e) => {
      const criteria = e.accepted
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
    name: ${JSON.stringify(e.name)},
    provider: ${JSON.stringify(e.provider)},
    url: ${JSON.stringify(e.url)},
    deadline: ${JSON.stringify(e.deadline)},
    amount: ${JSON.stringify(e.amount)},
    official_documents: ${JSON.stringify(e.officialDocuments)},
    criteria: [
${criteria}
    ],
  }`;
    })
    .join(",\n");

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

export interface SeedOpportunity {
  name: string;
  provider: string | null;
  url: string;
  deadline: string | null;
  amount: string | null;
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
  year_of_study: 2,
  branch: "CSE",
  state: "Karnataka",
  annual_family_income: 300000,
  institution_type: "private",
};

function printCoverageReport(entries: HarvestEntry[]) {
  const seeded = entries.filter((e) => e.name);

  console.log("\n=== COVERAGE REPORT ===");
  console.log(`Opportunities seeded: ${seeded.length} (of ${entries.length} URLs)\n`);

  console.log("Field usage (opportunities with at least one criterion on this field):");
  for (const field of ALLOWED_FIELDS) {
    const count = seeded.filter((e) => e.accepted.some((c) => c.field === field)).length;
    console.log(`  ${field}: ${count}`);
  }

  // An opportunity with zero extractable criteria evaluates as vacuously eligible
  // (no failures) — that's the engine working correctly, not this script guessing.
  const buckets = { eligible: 0, near_miss: 0, rejected: 0 };
  for (const entry of seeded) {
    const result = evaluate(TEST_PROFILE, entry.accepted as Criterion[]);
    buckets[result.status] += 1;
  }

  console.log("\nTest profile (CGPA 8.4, year 2, CSE, Karnataka, income 3L, private institution):");
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

  if (urls.length === 0) {
    console.log(`${path.relative(ROOT, URLS_FILE)} has no URLs yet. Nothing to harvest.`);
    writeSeedFile([]);
    writeReport([]);
    printCoverageReport([]);
    return;
  }

  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set (checked .env.local and the environment).");
    process.exit(1);
  }

  const entries: HarvestEntry[] = [];
  for (const url of urls) {
    console.log(`\nHarvesting ${url} ...`);
    entries.push(await harvestOne(url));
  }

  writeSeedFile(entries);
  writeReport(entries);
  console.log(`\nWrote ${path.relative(ROOT, SEED_FILE)} and ${path.relative(ROOT, REPORT_FILE)}`);
  printCoverageReport(entries);
}

// Run only when executed directly (`pnpm tsx scripts/harvest.ts`), not when
// harvest.test.ts imports this module for its pure functions.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
