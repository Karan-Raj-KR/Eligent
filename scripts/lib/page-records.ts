// Turns one fetched page into the list of individual opportunities it describes.
//
// Why this exists: buddy4study (and most modern scholarship portals) is a
// Next.js app. The served HTML is an empty shell — htmlToText() on it returns
// ~65 characters — and every word of the eligibility text lives inside the
// __NEXT_DATA__ JSON blob, which htmlToText() correctly strips along with all
// other <script> content. Without this adapter harvest.ts sees a blank page and
// seeds nothing.
//
// It also fixes a second mismatch: one such page carries MANY opportunities —
// the current edition plus every expired past edition (the Reliance page has
// 11). harvest.ts assumed one page = one opportunity, so it would have blended
// six years of criteria into a single row.
//
// This only reshapes page-supplied content. It never invents a value: every
// field is either read verbatim from the page's own JSON or left null.

import { decodeEntities, htmlToText, normalizeWhitespace } from "./html";

export interface PageRecord {
  /** Where a human applies for this specific opportunity. */
  url: string;
  name: string | null;
  provider: string | null;
  /** YYYY-MM-DD, as published by the site. Authoritative — not model-inferred. */
  deadline: string | null;
  amount: string | null;
  /** The text the model reads AND that validateCriterion() checks quotes against. */
  text: string;
}

/** "<p>NA</p>", "", "-" and friends are the site's way of saying "no value". */
function cleanField(html: unknown): string | null {
  if (typeof html !== "string") return null;
  const text = normalizeWhitespace(htmlToText(html));
  if (!text || /^(na|n\/a|-|nil|none)$/i.test(text)) return null;
  return text;
}

function asDate(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function parseNextData(html: string): unknown {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function parseIndiaScholarshipsData(html: string, pageUrl: string): PageRecord | null {
  // Check if this is an indiascholarships.in scholarship detail page
  if (!html.includes("indiascholarships.in")) return null;

  // Extract title from <title> tag
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1].trim()) : null;

  // Use htmlToText for extracting structured fields from rendered content
  const text = htmlToText(html);
  if (!text.trim()) return null;

  // Extract provider from "Provided By" text
  let provider: string | null = null;
  const providerMatch = text.match(/Provided By\s+([^\n]+)/);
  if (providerMatch) {
    provider = providerMatch[1].trim();
  }

  // Extract deadline
  let deadline: string | null = null;
  const deadlineMatch = text.match(/Deadline\s+(\d{1,2}\s+\w{3,}\s+\d{4}|\d{4}-\d{2}-\d{2})/i);
  if (deadlineMatch) {
    const dateStr = deadlineMatch[1].trim();
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      deadline = parsed.toISOString().split('T')[0];
    }
  }

  // Extract amount from "Annual Award"
  let amount: string | null = null;
  const amountMatch = text.match(/Annual Award\s+([^\n]+)/i);
  if (amountMatch) {
    amount = amountMatch[1].trim();
  }

  // Extract a clean name from the title (remove "Apply Online, Portal Login & Status Check" suffix)
  let name = title;
  if (name) {
    name = name.replace(/\s*:\s*Apply Online.*$/, '').replace(/\s*\|\s*IndiaScholarships.*$/, '').trim();
  }

  return {
    url: pageUrl,
    name,
    provider,
    deadline,
    amount,
    text,
  };
}

// The fields that actually state eligibility, in the order a reader would meet
// them. Kept separate from the title: a row carrying nothing but a title has no
// eligibility text to quote, and seeding it would create an opportunity that
// every profile passes vacuously.
/** buddy4study oppurtunityType values that are not funding. Observed, not guessed. */
const NON_FUNDING_TYPES = ["performance reward"];

const SUBSTANTIVE_FIELDS = ["applicableFor", "eligibility", "purposeAward", "benefits", "requiredDocument"] as const;

function recordFrom(raw: Record<string, unknown>, brandName: string | null, pageUrl: string): PageRecord | null {
  const name = cleanField(raw.title);
  if (!name) return null;

  const body = SUBSTANTIVE_FIELDS.map((f) => cleanField(raw[f])).filter((v): v is string => Boolean(v));
  if (body.length === 0) return null;
  const text = [name, ...body].join("\n");

  const applyLink = typeof raw.applyLink === "string" && /^https?:\/\//.test(raw.applyLink) ? raw.applyLink : null;

  return {
    url: applyLink ?? pageUrl,
    name,
    provider: cleanField(raw.offeredBy) ?? brandName,
    deadline: asDate(raw.deadline),
    amount: cleanField(raw.purposeAward),
    text,
  };
}

/**
 * One page in, every opportunity it publishes out. Falls back to treating the
 * whole page as a single record when there's no recognised structure, which is
 * exactly harvest.ts's original behaviour for plain server-rendered pages.
 */
export function pageRecords(html: string, pageUrl: string): PageRecord[] {
  const data = parseNextData(html) as
    | { props?: { pageProps?: { scholarship?: { brandPage?: Record<string, unknown> } } } }
    | null;

  const brandPage = data?.props?.pageProps?.scholarship?.brandPage;
  if (brandPage) {
    const brandName = cleanField(brandPage.name);
    const lists = [brandPage.scholarships, brandPage.attachedScholarships];
    const records: PageRecord[] = [];
    const seen = new Set<string>();

    for (const list of lists) {
      if (!Array.isArray(list)) continue;
      for (const raw of list) {
        if (!raw || typeof raw !== "object") continue;
        const entry = raw as Record<string, unknown>;
        // The site tags each row, but the tag is not a reliable allowlist: the
        // live Reliance editions are filed as "Outreach Project", not
        // "Scholarship", so allowlisting on "Scholarship" silently dropped the
        // two most important opportunities on the page. Deny only the types
        // observed to be non-funding (a career test is "Performance Reward").
        const type = typeof entry.oppurtunityType === "string" ? entry.oppurtunityType.toLowerCase() : "";
        if (NON_FUNDING_TYPES.includes(type)) continue;
        const record = recordFrom(entry, brandName, pageUrl);
        if (!record) continue;
        const key = `${record.name}|${record.url}`;
        if (seen.has(key)) continue;
        seen.add(key);
        records.push(record);
      }
    }
    if (records.length) return records;
  }

  // Try indiascholarships.in parser
  const indiaRecord = parseIndiaScholarshipsData(html, pageUrl);
  if (indiaRecord) {
    return [indiaRecord];
  }

  const text = htmlToText(html);
  return text.trim() ? [{ url: pageUrl, name: null, provider: null, deadline: null, amount: null, text }] : [];
}
