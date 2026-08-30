// Runs only on the Eligent web app's own pages (see manifest content_scripts).
// Its whole job is to hand the extension the signed-in session and whichever
// application the user is looking at. It never touches a scholarship portal.

/**
 * Reads the Supabase access token the web app is signed in with.
 *
 * @supabase/ssr's createBrowserClient keeps the session in a COOKIE, not
 * localStorage, so the server can read it too — the cookie is not httpOnly
 * (the browser client has to write it). Format is `sb-<project-ref>-auth-token`
 * holding either raw JSON or, more commonly, `base64-<base64 JSON>`; a large
 * session is split across `.0`, `.1`, … chunks that must be concatenated in
 * order before decoding. localStorage is still checked last, for a plain
 * supabase-js client.
 */
/** A session cookie's token plus when it dies, so we can pick the live one. */
interface Candidate {
  token: string;
  exp: number;
}

/** Seconds-since-epoch expiry from a JWT payload, or 0 if unreadable. */
function jwtExpiry(token: string): number {
  const payload = token.split(".")[1];
  if (!payload) return 0;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = JSON.parse(json)?.exp;
    return typeof exp === "number" ? exp : 0;
  } catch {
    return 0;
  }
}

function decodeSessionValue(raw: string): Candidate | null {
  let text = raw;
  if (text.startsWith("base64-")) {
    try {
      text = atob(text.slice("base64-".length));
    } catch {
      return null;
    }
  }
  try {
    const parsed = JSON.parse(text);
    const token = parsed?.access_token ?? parsed?.currentSession?.access_token;
    if (typeof token !== "string" || token.length === 0) return null;
    return { token, exp: jwtExpiry(token) };
  } catch {
    return null;
  }
}

function readAccessToken(): string | null {
  const jar = new Map<string, string>();
  for (const part of document.cookie.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    jar.set(part.slice(0, eq).trim(), decodeURIComponent(part.slice(eq + 1)));
  }

  // Group chunked cookies back together: sb-<ref>-auth-token[.<n>]
  const bases = new Set<string>();
  for (const name of jar.keys()) {
    const m = /^(sb-.*-auth-token)(?:\.\d+)?$/.exec(name);
    if (m) bases.add(m[1]);
  }

  const candidates: Candidate[] = [];
  const collect = (value: string | undefined) => {
    if (!value) return;
    const candidate = decodeSessionValue(value);
    if (candidate) candidates.push(candidate);
  };

  for (const base of bases) {
    collect(jar.get(base));
    const chunks: string[] = [];
    for (let i = 0; ; i += 1) {
      const chunk = jar.get(`${base}.${i}`);
      if (chunk === undefined) break;
      chunks.push(chunk);
    }
    if (chunks.length) collect(chunks.join(""));
  }

  // Fallback: a plain supabase-js client stores the session in localStorage.
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && /^sb-.*-auth-token$/.test(key)) collect(localStorage.getItem(key) ?? undefined);
  }

  // A browser can hold several sb-*-auth-token cookies at once — a different
  // Supabase project, or a stale one from an earlier local origin. Taking the
  // first match hands the API an expired token and every call 401s. Keep only
  // tokens that are still valid, and prefer the longest-lived.
  const now = Math.floor(Date.now() / 1000);
  const live = candidates.filter((c) => c.exp > now + 5);
  if (live.length === 0) return null;
  live.sort((a, b) => b.exp - a.exp);
  return live[0].token;
}

/**
 * The application id is published by the app's /apply page as a data attribute.
 * It deliberately is NOT read from the URL: /apply/<id> carries the *opportunity*
 * id, while /api/fill/:application_id needs the application row's id, which only
 * exists once that page has created it.
 */
function readApplicationId(): string | null {
  const el = document.querySelector("[data-eligent-application-id]");
  const id = el?.getAttribute("data-eligent-application-id")?.trim();
  return id ? id : null;
}

function readApplicationName(): string | null {
  const el = document.querySelector("[data-eligent-application-name]");
  const published = el?.getAttribute("data-eligent-application-name")?.trim();
  if (published) return published;
  const text = document.querySelector("h1")?.textContent?.trim();
  return text && text !== "Your application" ? text : null;
}

function publish() {
  const token = readAccessToken();
  if (!token) return;
  chrome.runtime.sendMessage({
    type: "SESSION_FROM_APP",
    token,
    origin: window.location.origin,
    applicationId: readApplicationId(),
    applicationName: readApplicationName(),
  });
}

publish();
// The app is a SPA and the heading arrives after the first paint.
setTimeout(publish, 1500);
setTimeout(publish, 4000);
