// Devpost adapter — an API client, not a scraper.
//
// Devpost publishes its hackathon index as JSON at /api/hackathons, so there is
// nothing to render and nothing to parse out of markup. That also changes what
// "source_text" can honestly mean: for a scraped page it is a verbatim sentence,
// here it is the API field the claim came from. The payload is still run through
// harvest.ts's validateCriterion — with the raw JSON as the text to match
// against — so the same rule holds: a criterion ships only if its source_text
// appears verbatim in what the source actually returned.
//
// Run: pnpm tsx scripts/devpost.ts
//
// Appends to packages/db/seed.ts (dedupe on url, never rewrites existing rows),
// exactly like harvest.ts, so `pnpm db:push` and scripts/coverage.ts are unchanged.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeWhitespace } from "./lib/html";
import { ROOT } from "./lib/fetch-cache";
import { isPastDeadline, printCoverageReport, validateCriterion, writeSeedFile } from "./harvest";
// The seed file is the canonical declaration of the shape (harvest.ts imports
// it from here too), so both writers stay in step.
import type { SeedOpportunity } from "../packages/db/seed";

const API = "https://devpost.com/api/hackathons";
const MAX_PAGES = 3;
const PAGE_DELAY_MS = 1000;
const CAP = 12;

// A real browser UA. Devpost's robots.txt disallows nothing, but an honest
// identifier is the polite minimum for an unauthenticated public endpoint.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Only these are still applying. Anything else is history. */
const ACCEPTED_STATES = new Set(["open", "upcoming"]);

/**
 * The subset of Devpost's item we actually read. Names are the API's own
 * (snake_case) — deliberately not renamed, so a reader can diff this against a
 * live response without a translation step.
 */
interface DevpostHackathon {
  title?: unknown;
  organization_name?: unknown;
  url?: unknown;
  submission_period_dates?: unknown;
  prize_amount?: unknown;
  open_state?: unknown;
  invite_only?: unknown;
  eligibility_requirement_invite_only_description?: unknown;
  displayed_location?: { location?: unknown } | null;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Devpost embeds markup in prize_amount: "$<span ...>5,000</span>". */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(text: string): string {
  return normalizeWhitespace(decodeEntities(text.replace(/<[^>]*>/g, "")));
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * "Aug 28 - 29, 2026"     -> 2026-08-29
 * "Jun 18 - Aug 30, 2026" -> 2026-08-30
 * "Aug 29 - Sep 01, 2026" -> 2026-09-01
 *
 * The end of the range is the deadline. The month is only repeated when the
 * range crosses one, so a day-only end inherits the month from the start. A
 * year attached to the end wins over the trailing one (a range crossing New
 * Year states both). Returns null rather than guessing.
 */
export function parseEndDate(range: string): string | null {
  const text = stripHtml(range);
  if (!text) return null;

  const parts = text.split(/\s+[-–—]\s+/);
  const endPart = parts[parts.length - 1];
  const startPart = parts.length > 1 ? parts[0] : "";
  if (!endPart) return null;

  const year = Number(/(\d{4})\s*$/.exec(endPart)?.[1] ?? /(\d{4})\s*$/.exec(text)?.[1]);
  if (!Number.isFinite(year)) return null;

  const monthName = /([A-Za-z]{3,})/.exec(endPart)?.[1] ?? /([A-Za-z]{3,})/.exec(startPart)?.[1];
  const month = monthName ? MONTHS[monthName.slice(0, 3).toLowerCase()] : undefined;
  if (!month) return null;

  // The day is the standalone 1-2 digit number, not part of the year.
  const day = Number(/\b(\d{1,2})\b(?!\d)/.exec(endPart.replace(/\d{4}\s*$/, ""))?.[1]);
  if (!Number.isFinite(day) || day < 1 || day > 31) return null;

  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  // Reject a date the calendar does not have (e.g. Feb 31) instead of letting
  // Date roll it forward into a deadline nobody published.
  const check = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(check.getTime()) || check.getUTCDate() !== day || check.getUTCMonth() + 1 !== month) {
    return null;
  }
  return iso;
}

// Indian cities and metros that appear in Devpost's displayed_location, plus the
// country itself. Matched on word boundaries: "India" must not fire on
// "Indiana", and neighbouring-country venues (e.g. "Lahore Garrison University")
// must not be read as Indian.
const INDIA_PLACES = [
  "india", "bharat",
  "bangalore", "bengaluru", "mumbai", "bombay", "delhi", "new delhi", "noida",
  "gurgaon", "gurugram", "hyderabad", "chennai", "madras", "kolkata", "calcutta",
  "pune", "ahmedabad", "jaipur", "lucknow", "kanpur", "nagpur", "indore",
  "bhopal", "patna", "surat", "vadodara", "coimbatore", "kochi", "cochin",
  "thiruvananthapuram", "trivandrum", "visakhapatnam", "bhubaneswar",
  "chandigarh", "dehradun", "guwahati", "ranchi", "raipur", "mysore", "mysuru",
  "mangalore", "vellore", "manipal", "roorkee", "kharagpur", "varanasi",
  "tamil nadu", "kerala", "karnataka", "maharashtra", "gujarat", "rajasthan",
  "punjab", "haryana", "telangana", "odisha", "assam", "bihar",
  "uttar pradesh", "madhya pradesh", "west bengal", "andhra pradesh",
];

/**
 * `online` only when Devpost says exactly "Online" — a venue that merely also
 * streams ("Santa Clara Convention Center and Online") is a physical event.
 * Otherwise India if the venue names an Indian place, else abroad.
 */
export function classifyLocation(rawLocation: string): "online" | "india" | "abroad" {
  const location = stripHtml(rawLocation);
  if (location.toLowerCase() === "online") return "online";

  const haystack = ` ${location.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ")} `;
  for (const place of INDIA_PLACES) {
    if (haystack.includes(` ${place} `)) return "india";
  }
  return "abroad";
}

/** Maps one API item, or explains why it was skipped. */
export function toOpportunity(
  item: DevpostHackathon,
): { opportunity: SeedOpportunity } | { skip: string } {
  const name = stripHtml(str(item.title));
  const url = str(item.url);
  if (!name) return { skip: "no title" };
  if (!url) return { skip: "no url" };

  const openState = str(item.open_state).toLowerCase();
  if (!ACCEPTED_STATES.has(openState)) return { skip: `open_state "${openState || "missing"}"` };

  const deadline = parseEndDate(str(item.submission_period_dates));
  if (!deadline) return { skip: `could not read an end date from "${str(item.submission_period_dates)}"` };
  if (isPastDeadline(deadline)) return { skip: `deadline ${deadline} has passed` };

  const prize = stripHtml(str(item.prize_amount));

  // The whole item is the "page" the claim must be quotable from.
  const payloadText = normalizeWhitespace(JSON.stringify(item));
  const criteria: SeedOpportunity["criteria"] = [];

  // The ONLY eligibility rule this payload states. Nothing about age, region or
  // team size is published here, so nothing about them is emitted.
  if (item.invite_only === true) {
    const description = stripHtml(str(item.eligibility_requirement_invite_only_description));
    const validated = validateCriterion(
      {
        field: "student_status",
        operator: "eq",
        value: "invited",
        display_text: description || "Invite only — participation requires an invitation",
        source_text: "invite_only",
      },
      payloadText,
    );
    if ("reason" in validated) return { skip: `invite_only criterion rejected: ${validated.reason}` };
    criteria.push(validated);
  }

  return {
    opportunity: {
      name,
      provider: stripHtml(str(item.organization_name)) || null,
      url,
      deadline,
      amount: prize || null,
      category: "hackathon",
      location_type: classifyLocation(str(item.displayed_location?.location)),
      funded: false,
      // Devpost's index states no document list. An empty list is the honest
      // answer; it is not a placeholder to be filled in later by guessing.
      official_documents: [],
      criteria,
    },
  };
}

async function fetchPage(page: number): Promise<DevpostHackathon[]> {
  const params = new URLSearchParams({ page: String(page), order_by: "deadline" });
  params.append("status[]", "open");
  params.append("status[]", "upcoming");

  const res = await fetch(`${API}?${params}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Devpost API HTTP ${res.status}`);
  const body = (await res.json()) as { hackathons?: unknown };
  return Array.isArray(body.hackathons) ? (body.hackathons as DevpostHackathon[]) : [];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchDevpost(): Promise<{
  opportunities: SeedOpportunity[];
  skipped: Array<{ name: string; reason: string }>;
}> {
  const opportunities: SeedOpportunity[] = [];
  const skipped: Array<{ name: string; reason: string }> = [];
  const seen = new Set<string>();

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    if (opportunities.length >= CAP) break;
    if (page > 1) await sleep(PAGE_DELAY_MS); // sequential, never concurrent

    const items = await fetchPage(page);
    console.log(`page ${page}: ${items.length} item(s)`);
    if (items.length === 0) break;

    for (const item of items) {
      if (opportunities.length >= CAP) break;
      const mapped = toOpportunity(item);
      const label = stripHtml(str(item.title)) || str(item.url) || "(untitled)";
      if ("skip" in mapped) {
        skipped.push({ name: label, reason: mapped.skip });
        continue;
      }
      if (seen.has(mapped.opportunity.url)) {
        skipped.push({ name: label, reason: "duplicate url in this run" });
        continue;
      }
      seen.add(mapped.opportunity.url);
      opportunities.push(mapped.opportunity);
    }
  }

  return { opportunities, skipped };
}

async function main() {
  const { opportunities, skipped } = await fetchDevpost();

  console.log(`\nMapped ${opportunities.length} hackathon(s); skipped ${skipped.length}.`);
  for (const s of skipped) console.log(`  - skip "${s.name}": ${s.reason}`);

  const { seedOpportunities: existing } = (await import("../packages/db/seed")) as {
    seedOpportunities: SeedOpportunity[];
  };
  const known = new Set(existing.map((o) => o.url));

  // Append-only, same as harvest.ts: an existing row is never rewritten.
  const merged = [...existing];
  let added = 0;
  for (const o of opportunities) {
    if (known.has(o.url)) continue;
    known.add(o.url);
    merged.push(o);
    added += 1;
  }

  writeSeedFile(merged);
  console.log(
    `\nWrote ${path.relative(ROOT, path.join(ROOT, "packages/db/seed.ts"))} — ${merged.length} opportunities (${added} new from Devpost).`,
  );
  console.log("Run `pnpm db:push` to load them.\n");
  printCoverageReport(merged);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
