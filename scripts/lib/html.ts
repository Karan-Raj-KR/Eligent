// Shared HTML text utilities for harvest.ts and discover.ts.

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z0-9]+);/gi, (m, code: string) => {
    if (code.startsWith("#x")) return String.fromCharCode(parseInt(code.slice(2), 16));
    if (code.startsWith("#")) return String.fromCharCode(parseInt(code.slice(1), 10));
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

export function htmlToText(html: string): string {
  const withoutNoise = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    // Block-level tags become line breaks so sentences don't run together.
    .replace(/<\/(p|div|li|tr|h[1-6]|br|section|article)\s*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(withoutNoise)
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Strips tags from a small inline HTML fragment (e.g. anchor inner content) to plain text. */
export function stripTags(html: string): string {
  return normalizeWhitespace(decodeEntities(html.replace(/<[^>]+>/g, " ")));
}
