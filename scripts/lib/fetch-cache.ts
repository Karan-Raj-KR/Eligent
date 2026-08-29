// Shared by harvest.ts and discover.ts: repo paths, page caching, and the
// "one entry per line, # comments and blank lines ignored" list format used
// by both scripts/urls.txt and scripts/sources.txt.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)); // scripts/lib
export const ROOT = path.dirname(path.dirname(here));
export const CACHE_DIR = path.join(ROOT, "scripts", ".cache");

export async function fetchPage(url: string): Promise<{ html: string } | { error: string }> {
  const cacheFile = path.join(CACHE_DIR, `${createHash("sha256").update(url).digest("hex")}.html`);
  if (existsSync(cacheFile)) return { html: readFileSync(cacheFile, "utf8") };

  try {
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

/** Reads a newline-delimited list file, skipping blank lines and `#` comments. */
export function readLineList(file: string): string[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}
