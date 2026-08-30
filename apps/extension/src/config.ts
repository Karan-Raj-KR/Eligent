/// <reference types="chrome" />
// Extension settings. One place that knows every chrome.storage key the popup
// touches, so "Forget everything" can be exhaustive.

export interface Settings {
  /** Eligent web app origin — eligibility check + profile live here. */
  apiBase: string;
  /** BYOK key for the label-mapping model. Empty = mapping falls back to the
   *  static dictionary only. Never sent anywhere but `llmBase`. */
  apiKey: string;
  /** OpenAI-compatible chat-completions endpoint (NVIDIA NIM by default). */
  llmBase: string;
  llmModel: string;
  demo: boolean;
  demoCase: DemoCase;
}

export type DemoCase = "docdiff" | "filled" | "blocked" | "error";

export const DEFAULTS: Settings = {
  apiBase: "https://eligent.karanrajkr.com",
  apiKey: "",
  llmBase: "https://integrate.api.nvidia.com/v1",
  llmModel: "meta/llama-3.3-70b-instruct",
  demo: false,
  demoCase: "docdiff",
};

const SETTINGS_KEY = "settings";

/** Every chrome.storage.local key the extension writes. "Forget everything"
 *  removes exactly these — plus every per-host label cache (prefix match). */
export const OWNED_KEYS = [SETTINGS_KEY, "session"];
export const LABEL_CACHE_PREFIX = "labelmap:";

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULTS, ...(stored[SETTINGS_KEY] as Partial<Settings> | undefined) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings()), ...patch };
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

export async function forgetEverything(): Promise<void> {
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter(
    (k) => OWNED_KEYS.includes(k) || k.startsWith(LABEL_CACHE_PREFIX),
  );
  await chrome.storage.local.remove(keys);
}

// --------------------------------------------------------- per-host label map --

export function labelCacheKey(hostname: string): string {
  return `${LABEL_CACHE_PREFIX}${hostname}`;
}

export async function loadLabelMap(hostname: string): Promise<Record<string, string>> {
  const key = labelCacheKey(hostname);
  const stored = await chrome.storage.local.get(key);
  return (stored[key] as Record<string, string> | undefined) ?? {};
}

/** Merge new label→profileKey pairs into a host's cache. `null` values are
 *  cached too (as ""), so a confirmed non-match isn't re-sent to the model. */
export async function mergeLabelMap(
  hostname: string,
  additions: Record<string, string | null>,
): Promise<Record<string, string>> {
  const key = labelCacheKey(hostname);
  const current = await loadLabelMap(hostname);
  for (const [label, value] of Object.entries(additions)) current[label] = value ?? "";
  await chrome.storage.local.set({ [key]: current });
  return current;
}
