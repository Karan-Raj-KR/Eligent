// Pure CSV/amount parsing for the /institution demo. No Next or Supabase imports
// so it stays runnable standalone: `npx tsx src/lib/institution-csv.test.ts`.

import type { Profile } from "@opportunity/engine";

const MAX_ROWS = 1000;

/** CSV column -> profile field. Anything else in the file is ignored. */
const COLUMNS: Record<string, string> = {
  cgpa: "cgpa",
  percentage: "percentage",
  year: "year_of_study",
  branch: "branch",
  state: "state",
  family_income: "annual_family_income",
  institution_type: "institution_type",
  gender: "gender",
};
const NUMERIC = new Set(["cgpa", "percentage", "year_of_study", "annual_family_income"]);

/** Quote-aware split of one CSV line (RFC4180 doubled quotes). */
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseCsv(text: string): Profile[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];
  const header = splitLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1, MAX_ROWS + 1).map((line) => {
    const cells = splitLine(line);
    const profile: Profile = {};
    header.forEach((h, i) => {
      const field = COLUMNS[h];
      if (!field) return;
      const raw = cells[i] ?? "";
      if (raw === "") return;
      if (NUMERIC.has(field)) {
        const n = Number(raw.replace(/[,₹\s]/g, ""));
        if (Number.isFinite(n)) profile[field] = n;
      } else {
        profile[field] = raw;
      }
    });
    return profile;
  });
}

/** "₹1.5 Lakh+" / "₹50k+" / "Rs. 2,00,000" -> rupees. null when unparseable. */
export function parseAmount(amount: string | null): number | null {
  if (!amount) return null;
  const m = amount.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lac|l|k)?/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const unit = (m[2] ?? "").toLowerCase();
  const mult = unit === "crore" || unit === "cr" ? 1e7
    : unit === "lakh" || unit === "lac" || unit === "l" ? 1e5
    : unit === "k" ? 1e3
    : 1;
  return n * mult;
}
