// Finds candidate scholarship detail-page URLs on listing/index pages and
// appends them to scripts/urls.txt for harvest.ts to process later.
// Run: pnpm tsx scripts/discover.ts
//
// Discovery only collects URLs — it never fetches a detail page, never calls
// an LLM, never extracts a criterion. That's harvest.ts's job.

import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeHeadlessBrowser, fetchPageAuto, readLineList, ROOT } from "./lib/fetch-cache";
import { decodeEntities, stripTags } from "./lib/html";

const SOURCES_FILE = path.join(ROOT, "scripts", "sources.txt");
const URLS_FILE = path.join(ROOT, "scripts", "urls.txt");

// Keyword denylist for obvious non-scholarship-detail links, checked against
// both the URL path and the anchor text. Deliberately broad and hand-picked —
// a heuristic, not a classifier. False negatives just fall through to
// harvest.ts, which will find nothing to extract and log it; that's cheap.
const DENYLIST_KEYWORDS = [
  "login",
  "log-in",
  "signin",
  "sign-in",
  "signup",
  "sign-up",
  "register",
  "logout",
  "about",
  "blog",
  "news",
  "contact",
  "privacy",
  "terms",
  "faq",
  "careers",
  "jobs",
  "press",
  "media",
  "sitemap",
  "search",
  "help",
  "support",
  "account",
  "dashboard",
  "cart",
  "checkout",
  "subscribe",
  "newsletter",
  "category",
  "categories",
  "tag",
  "tags",
  "archive",
];

const NON_PAGE_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".zip", ".doc", ".docx", ".xls", ".xlsx", ".css", ".js"];

interface Candidate {
  url: string;
  text: string;
}

interface Skip {
  url: string;
  reason: string;
}

interface DiscoverResult {
  source: string;
  fetchStatus: "ok" | string;
  via: "fetch" | "headless" | null;
  anchorsFound: number;
  kept: Candidate[];
  skipped: Skip[];
}

function extractAnchors(html: string, sourceUrl: string): Array<{ href: string; text: string }> {
  const anchors: Array<{ href: string; text: string }> = [];
  const re = /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const [, , href, innerHtml] = match;
    // href attributes are HTML-escaped too (e.g. "?a=1&amp;b=2") — decode before URL parsing.
    anchors.push({ href: decodeEntities(href), text: stripTags(innerHtml) });
  }
  return anchors;
}

function classify(rawHref: string, text: string, sourceUrl: URL): { url: string } | { skip: string } {
  let resolved: URL;
  try {
    resolved = new URL(rawHref, sourceUrl);
  } catch {
    return { skip: "unresolvable href" };
  }

  if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
    return { skip: `non-http scheme (${resolved.protocol})` };
  }
  if (resolved.hostname !== sourceUrl.hostname) {
    return { skip: "different domain" };
  }

  const withoutFragment = `${resolved.origin}${resolved.pathname}${resolved.search}`;
  const sourceWithoutFragment = `${sourceUrl.origin}${sourceUrl.pathname}${sourceUrl.search}`;
  if (withoutFragment === sourceWithoutFragment) {
    return { skip: "same page as source (fragment-only link)" };
  }

  const lowerPath = resolved.pathname.toLowerCase();
  if (NON_PAGE_EXTENSIONS.some((ext) => lowerPath.endsWith(ext))) {
    return { skip: "non-page asset (file extension)" };
  }
  if (/[?&]page=/i.test(resolved.search) || /\/page\/\d+/i.test(resolved.pathname)) {
    return { skip: "pagination link" };
  }

  // Buddy4Study category pages (the ones in sources.txt) mix scholarship
  // detail links in with brand pages, category chrome and site nav. Detail
  // pages have one recognizable shape: /scholarship/<slug> (singular) — scope
  // to it instead of trusting the generic denylist alone to catch everything
  // else on the page.
  if (sourceUrl.hostname.includes("buddy4study.com") && !/^\/scholarship\/[^/]+\/?$/i.test(resolved.pathname)) {
    return { skip: "not a buddy4study scholarship detail link (/scholarship/<slug>)" };
  }

  const haystack = `${lowerPath} ${text.toLowerCase()}`;
  const hit = DENYLIST_KEYWORDS.find((kw) => haystack.includes(kw));
  if (hit) return { skip: `denylisted keyword "${hit}"` };

  if (!text.trim()) return { skip: "empty anchor text" };

  return { url: withoutFragment };
}

async function discoverOne(source: string): Promise<DiscoverResult> {
  const fetched = await fetchPageAuto(source);
  if ("error" in fetched) {
    console.log(`[${source}] fetch failed: ${fetched.error}`);
    return { source, fetchStatus: `error: ${fetched.error}`, via: null, anchorsFound: 0, kept: [], skipped: [] };
  }
  console.log(`[${source}] ${fetched.via === "headless" ? "HEADLESS" : "FETCH"}`);

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source);
  } catch {
    return { source, fetchStatus: "error: invalid source URL", via: fetched.via, anchorsFound: 0, kept: [], skipped: [] };
  }

  const anchors = extractAnchors(fetched.html, source);
  const seen = new Set<string>();
  const kept: Candidate[] = [];
  const skipped: Skip[] = [];

  for (const { href, text } of anchors) {
    const result = classify(href, text, sourceUrl);
    if ("skip" in result) {
      skipped.push({ url: href, reason: result.skip });
      continue;
    }
    if (seen.has(result.url)) {
      skipped.push({ url: result.url, reason: "duplicate on this page" });
      continue;
    }
    seen.add(result.url);
    kept.push({ url: result.url, text });
  }

  return { source, fetchStatus: "ok", via: fetched.via, anchorsFound: anchors.length, kept, skipped };
}

function printSkipSummary(skipped: Skip[]) {
  const byReason = new Map<string, number>();
  for (const { reason } of skipped) byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
  for (const [reason, count] of byReason) console.log(`    - ${reason}: ${count}`);
}

function appendNewUrls(newUrls: string[]) {
  if (newUrls.length === 0) return;
  if (!existsSync(URLS_FILE)) writeFileSync(URLS_FILE, "", "utf8");

  const existingRaw = readFileSync(URLS_FILE, "utf8");
  const needsLeadingNewline = existingRaw.length > 0 && !existingRaw.endsWith("\n");
  const block = `${needsLeadingNewline ? "\n" : ""}# Added by discover.ts on ${new Date().toISOString().slice(0, 10)}\n${newUrls.join("\n")}\n`;
  appendFileSync(URLS_FILE, block, "utf8");
}

async function main() {
  if (!existsSync(SOURCES_FILE)) {
    console.error(`Missing ${path.relative(ROOT, SOURCES_FILE)} — add one listing/index page URL per line.`);
    process.exit(1);
  }
  const sources = readLineList(SOURCES_FILE);
  if (sources.length === 0) {
    console.log(`${path.relative(ROOT, SOURCES_FILE)} has no URLs yet. Nothing to discover.`);
    return;
  }

  const existingUrls = new Set(readLineList(URLS_FILE));
  const seenThisRun = new Set<string>();
  const allNewUrls: string[] = [];

  for (const source of sources) {
    console.log(`\n${source}`);
    const result = await discoverOne(source);

    if (result.fetchStatus !== "ok") {
      console.log(`  fetch: ${result.fetchStatus}`);
      continue;
    }

    const newHere: string[] = [];
    let alreadyKnown = 0;
    for (const { url } of result.kept) {
      if (existingUrls.has(url) || seenThisRun.has(url)) {
        alreadyKnown += 1;
        continue;
      }
      seenThisRun.add(url);
      newHere.push(url);
      allNewUrls.push(url);
    }

    console.log(`  anchors on page: ${result.anchorsFound}`);
    console.log(`  kept as candidates: ${result.kept.length} (${newHere.length} new, ${alreadyKnown} already known)`);
    console.log(`  skipped: ${result.skipped.length}`);
    printSkipSummary(result.skipped);
    if (newHere.length) {
      console.log("  new URLs:");
      for (const url of newHere) console.log(`    + ${url}`);
    }
  }

  await closeHeadlessBrowser();
  appendNewUrls(allNewUrls);
  console.log(`\nAppended ${allNewUrls.length} new URL(s) to ${path.relative(ROOT, URLS_FILE)}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

export { classify, extractAnchors };
