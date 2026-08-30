// Accuracy audit of the live catalogue. Read-only: prints a table and writes
// ACCURACY-AUDIT.md at the repo root. Run from packages/db:
//   npx tsx --env-file=../../apps/web/.env.local audit.ts
//
// It answers one question per opportunity: could this row give a student a
// verdict that is simply wrong? Three ways it can:
//   1. ZERO criteria      -> would pass for literally everyone (now EXCLUDED
//                            from /api/matches rather than deleted)
//   2. UNENCODED RESTRICTION -> the page states a limit no criterion encodes
//   3. VOCAB MISMATCH     -> criterion value can never === any profile value

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { fetchPageAuto } from "../../scripts/lib/fetch-cache.js";
import { htmlToText } from "../../scripts/lib/html.js";
import { canonicalCriterion } from "./vocab.js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

interface Row { id: string; name: string; category: string; url: string; criterion: Array<{ field: string; operator: string; value: unknown; source_text: string | null }> }

/**
 * Restriction detection. The prose on these pages is full of near-misses —
 * "Age relaxation for SC/ST/OBC", "Preference is given to female students",
 * "Domicile State All India" — none of which restrict anyone. A regex that
 * flags those produces an audit nobody can act on, so detection is built on
 * the structured eligibility block the listing pages render, and prose is only
 * consulted with an explicit exclusivity phrase.
 */

/** Pulls "Domicile State <value>" / "Category / Caste <value>" out of the summary block. */
function summaryField(text: string, label: string): string | null {
  const re = new RegExp(`${label}\\s+(.{1,60}?)\\s+(?:Mandatory Documents|Domicile State|Category / Caste|Share this|Benefits)`, "i");
  return text.match(re)?.[1]?.trim() ?? null;
}

const OPEN_TO_ALL = /^(all|all india|any|no bar|not applicable|n\/a|relevant courses)$/i;
/** A category list naming every bucket is "open to all" however it is punctuated. */
function categoryIsOpen(value: string): boolean {
  if (OPEN_TO_ALL.test(value)) return true;
  if (/\ball\b/i.test(value)) return true;
  const named = value.toLowerCase();
  return named.includes("general") && named.includes("obc") && named.includes("sc") && named.includes("st");
}

/** Exclusivity, not preference. "Preference is given to female students" restricts nobody. */
const GENDER_EXCLUSIVE =
  /\b(?:exclusively|only|solely|restricted to|reserved for|meant (?:only )?for|open (?:only )?to)\b[^.]{0,40}?\b(girls?|women|female)\b|\b(girls?|women|female)\s+(?:students?|candidates?|applicants?)\s+only\b/i;
// A 50% quota is not an eligibility rule — boys can still apply and win the
// other half. Neither is a preference, a priority, or an age relaxation.
const GENDER_SOFT = /\b(preference|priority|relaxation|encourage[sd]?)\b|\d+\s*%\s*(?:of\s+\w+\s+)?reserv|reservation for/i;

interface Detected { field: string; label: string; evidence: string }

function detectRestrictions(name: string, text: string): Detected[] {
  const found: Detected[] = [];
  const haystack = `${name}. ${text}`;

  // --- gender: name is the strongest signal, then an exclusivity phrase ------
  const namedForGirls = /\b(girls?|women|kanya|mahila|balika)\b/i.test(name);
  const sentences = haystack.split(/(?<=\.)\s+/);
  const exclusive = sentences.find((s) => GENDER_EXCLUSIVE.test(s) && !GENDER_SOFT.test(s));
  if (namedForGirls || exclusive) {
    found.push({
      field: "gender",
      label: "girls/women only",
      evidence: (exclusive ?? `title says "${name}"`).trim().slice(0, 220),
    });
  }

  // --- state: the summary block states the domicile outright -----------------
  const domicile = summaryField(text, "Domicile State");
  if (domicile && !OPEN_TO_ALL.test(domicile)) {
    found.push({ field: "state", label: `domicile: ${domicile}`, evidence: `Domicile State ${domicile}` });
  }

  // --- category: only a genuine subset counts --------------------------------
  const caste = summaryField(text, "Category / Caste");
  if (caste && !categoryIsOpen(caste)) {
    found.push({ field: "category", label: `category: ${caste}`, evidence: `Category / Caste ${caste}` });
  }

  return found;
}

const CATEGORICAL = ["gender", "category", "state", "branch", "institution_type", "nationality", "region", "student_status"];

const { data, error } = await sb
  .from("opportunity")
  .select("id,name,category,url,criterion(field,operator,value,source_text)")
  .order("name");
if (error) throw error;
const rows = (data ?? []) as Row[];

// Every categorical value any real profile actually holds — a criterion whose
// value is not in this set can never match anyone (subject to canonicalisation).
const { data: profiles } = await sb.from("profile").select("*");
const profileVocab = new Map<string, Set<string>>();
for (const f of CATEGORICAL) profileVocab.set(f, new Set());
for (const p of profiles ?? []) {
  for (const f of CATEGORICAL) {
    const v = (p as Record<string, unknown>)[f];
    if (typeof v === "string" && v.trim()) profileVocab.get(f)!.add(v.trim());
  }
}

interface Flag { kind: "ZERO" | "UNENCODED" | "VOCAB"; detail: string }
const flagged = new Map<string, Flag[]>();
const add = (id: string, flag: Flag) => flagged.set(id, [...(flagged.get(id) ?? []), flag]);

for (const o of rows) {
  if (o.criterion.length === 0) add(o.id, { kind: "ZERO", detail: "no criteria — passes for every profile" });

  // Vocabulary: does the stored value differ from its own canonical form?
  for (const c of o.criterion) {
    if (!CATEGORICAL.includes(c.field)) continue;
    const canonical = canonicalCriterion(c);
    if (JSON.stringify(canonical.value) !== JSON.stringify(c.value) || canonical.operator !== c.operator) {
      add(o.id, {
        kind: "VOCAB",
        detail: `${c.field} ${c.operator} ${JSON.stringify(c.value)} → ${canonical.operator} ${JSON.stringify(canonical.value)}`,
      });
    }
  }

  // Unencoded restrictions: what the page says vs what the criteria encode.
  const page = await fetchPageAuto(o.url);
  const text = "error" in page ? "" : htmlToText(page.html).replace(/\s+/g, " ");
  const covered = new Set(o.criterion.map((c) => c.field));
  for (const restriction of detectRestrictions(o.name, text)) {
    if (covered.has(restriction.field)) continue;
    add(o.id, {
      kind: "UNENCODED",
      detail: `${restriction.label} — no \`${restriction.field}\` criterion. Page says: "${restriction.evidence}"`,
    });
  }
}

// ---------- output ----------
const fieldsOf = (o: Row) => [...new Set(o.criterion.map((c) => c.field))].sort().join(", ") || "—";
const lines: string[] = [];
lines.push("# Accuracy audit", "");
lines.push(`Generated from the live database by \`packages/db/audit.ts\`. ${rows.length} opportunities.`, "");
lines.push("A verdict is only as good as the criteria behind it. This lists every row that can", "produce a wrong answer, and why.", "");

const zero = rows.filter((o) => o.criterion.length === 0);
const unencoded = rows.filter((o) => (flagged.get(o.id) ?? []).some((f) => f.kind === "UNENCODED"));
const vocab = rows.filter((o) => (flagged.get(o.id) ?? []).some((f) => f.kind === "VOCAB"));

lines.push("## Summary", "");
lines.push("| | count |", "|---|---|");
lines.push(`| Opportunities | ${rows.length} |`);
lines.push(`| Criteria rows | ${rows.reduce((n, o) => n + o.criterion.length, 0)} |`);
lines.push(`| **Zero criteria** (excluded from matching) | **${zero.length}** |`);
lines.push(`| **Unencoded restriction** (page restricts, criteria don't) | **${unencoded.length}** |`);
lines.push(`| **Vocabulary mismatch** (can never match a profile) | **${vocab.length}** |`);
lines.push("");

lines.push("## Every opportunity", "");
lines.push("| Opportunity | Category | Criteria | Fields covered | Status | Flags |");
lines.push("|---|---|---:|---|---|---|");
for (const o of rows) {
  const flags = (flagged.get(o.id) ?? []).map((f) => f.kind);
  const mark = flags.length ? [...new Set(flags)].join(" + ") : "ok";
  const status = o.criterion.length === 0 ? "**unverified — excluded**" : "verified";
  lines.push(`| ${o.name.replace(/\|/g, "-").slice(0, 78)} | ${o.category} | ${o.criterion.length} | ${fieldsOf(o)} | ${status} | ${mark} |`);
}
lines.push("");

for (const [kind, title, note] of [
  ["ZERO", "Zero criteria — excluded from matching", "`evaluate()` with an empty criteria list has nothing to fail on, so these would return `eligible` for every profile alive. They are NOT deleted — the opportunity is real, our eligibility data is what is missing. `/api/matches` returns them under a separate `unverified` key and never gives them a verdict."],
  ["UNENCODED", "Unencoded restrictions", "The page states a limit that no criterion encodes, so ineligible students are told they qualify. This is the Kotak Kanya class of bug."],
  ["VOCAB", "Vocabulary mismatches", "The stored value cannot `===` any value a profile holds, so the criterion silently rejects (or passes) everyone. Fixed by canonicalising both sides — see `packages/db/vocab.ts`."],
] as const) {
  const subset = rows.filter((o) => (flagged.get(o.id) ?? []).some((f) => f.kind === kind));
  lines.push(`## ${title}`, "", note, "");
  if (subset.length === 0) { lines.push("_None._", ""); continue; }
  for (const o of subset) {
    lines.push(`### ${o.name}`, `- ${o.url}`, `- category: ${o.category}, criteria: ${o.criterion.length} (${fieldsOf(o)})`);
    for (const f of (flagged.get(o.id) ?? []).filter((f) => f.kind === kind)) lines.push(`- **${f.kind}**: ${f.detail}`);
    lines.push("");
  }
}

writeFileSync("../../ACCURACY-AUDIT.md", lines.join("\n"));

console.log(`opportunities: ${rows.length}   criteria: ${rows.reduce((n, o) => n + o.criterion.length, 0)}`);
console.log(`ZERO criteria: ${zero.length}`);
console.log(`UNENCODED restriction: ${unencoded.length}`);
console.log(`VOCAB mismatch: ${vocab.length}`);
console.log("\nwrote ACCURACY-AUDIT.md");
