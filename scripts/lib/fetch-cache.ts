// Shared by harvest.ts and discover.ts: repo paths, page caching, and the
// "one entry per line, # comments and blank lines ignored" list format used
// by both scripts/urls.txt and scripts/sources.txt.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { htmlToText } from "./html";

const here = path.dirname(fileURLToPath(import.meta.url)); // scripts/lib
export const ROOT = path.dirname(path.dirname(here));
export const CACHE_DIR = path.join(ROOT, "scripts", ".cache");

function cacheFileFor(url: string): string {
  return path.join(CACHE_DIR, `${createHash("sha256").update(url).digest("hex")}.html`);
}

// ---------- politeness: 2s between any actual outbound request ----------
// Shared module state, so it throttles across both the plain-fetch and the
// headless path, and across every URL a single script run makes — a cache
// hit never waits, since it makes no request at all.

const MIN_INTERVAL_MS = 2000;
let lastRequestAt = 0;

async function politeWait(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestAt = Date.now();
}

export async function fetchPage(url: string): Promise<{ html: string } | { error: string }> {
  const cacheFile = cacheFileFor(url);
  if (existsSync(cacheFile)) return { html: readFileSync(cacheFile, "utf8") };

  try {
    await politeWait();
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; opportunity-harvest/1.0)" },
      redirect: "follow",
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const html = await res.text();
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(cacheFile, html, "utf8");
    return { html };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------- JS-shell detection + headless fallback ----------

/**
 * A page whose real content only exists after client-side JS runs looks like
 * this in its server-delivered HTML: almost no readable text, and none of the
 * tags a hand-written article/listing would use for its content.
 */
export function looksLikeJsShell(html: string): boolean {
  const text = htmlToText(html);
  const hasContentTags = /<p[\s>]|<li[\s>]/i.test(html);
  return text.length < 800 || !hasContentTags;
}

// A real desktop Chrome UA — distinct from the plain-fetch one, which some
// sites treat differently once they know a request came from a browser engine.
const HEADLESS_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Lazily launched, reused for every headless fetch in the run, closed once at
// the end (closeHeadlessBrowser). One context, one page — requests are
// replayed through it one at a time; nothing here ever runs concurrently.
let browserPromise: ReturnType<typeof launchHeadless> | null = null;
let pagePromise: Promise<import("playwright").Page> | null = null;

async function launchHeadless() {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: HEADLESS_USER_AGENT });
  return { browser, context };
}

async function getSharedPage(): Promise<import("playwright").Page> {
  if (!browserPromise) browserPromise = launchHeadless();
  if (!pagePromise) pagePromise = browserPromise.then(({ context }) => context.newPage());
  return pagePromise;
}

/** Renders a URL with headless Chromium and caches the result under the same
 * key fetchPage() would use, so the next run's fetchPage() call returns the
 * rendered HTML directly and never re-renders. */
export async function fetchRendered(url: string): Promise<{ html: string } | { error: string }> {
  try {
    await politeWait();
    const page = await getSharedPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const html = await page.content();
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(cacheFileFor(url), html, "utf8");
    return { html };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function closeHeadlessBrowser(): Promise<void> {
  if (!browserPromise) return;
  const { browser } = await browserPromise;
  await browser.close();
  browserPromise = null;
  pagePromise = null;
}

export type FetchVia = "fetch" | "headless";

/**
 * The one entry point harvest.ts and discover.ts should call: a plain fetch
 * (cache-aware, as always), escalated to a headless Chromium render only when
 * the plain result looks like a JS shell. A cache hit skips shell-detection
 * entirely — it was already good enough on some earlier run.
 */
export async function fetchPageAuto(url: string): Promise<{ html: string; via: FetchVia } | { error: string }> {
  const plain = await fetchPage(url);
  if ("error" in plain) return plain;
  if (!looksLikeJsShell(plain.html)) return { html: plain.html, via: "fetch" };

  const rendered = await fetchRendered(url);
  if ("error" in rendered) {
    // Headless failed — the plain fetch is still a real (if thin) result;
    // don't throw away a page over a rendering error.
    return { html: plain.html, via: "fetch" };
  }
  return { html: rendered.html, via: "headless" };
}

/** Reads a newline-delimited list file, skipping blank lines and `#` comments. */
export function readLineList(file: string): string[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}
