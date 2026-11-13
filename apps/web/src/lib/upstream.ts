/** Network failures talking to Supabase. PostgREST often keeps only `TypeError: fetch failed`. */
export function isUpstreamFailure(message: string): boolean {
  return /fetch failed|enotfound|econnrefused|eai_again|getaddrinfo|und_err|network/i.test(message);
}

/** Walk `error.cause` so a bare "fetch failed" keeps the DNS or connection code. */
export function describeError(err: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = err;

  while (current && !seen.has(current) && parts.length < 6) {
    seen.add(current);
    if (current instanceof Error) {
      if (current.message) parts.push(current.message);
      const code = (current as { code?: unknown }).code;
      if (typeof code === "string" && code && !current.message.includes(code)) parts.push(code);
      current = (current as { cause?: unknown }).cause;
      continue;
    }
    if (typeof current === "object" && current && "code" in current) {
      parts.push(String((current as { code: unknown }).code));
    } else {
      parts.push(String(current));
    }
    break;
  }

  return parts.filter(Boolean).join(" — ") || "Unknown error";
}
