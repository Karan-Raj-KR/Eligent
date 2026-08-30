// Browser Supabase client — NEVER throws at module scope or from createClient().
//
// Design: if the NEXT_PUBLIC_* env vars are absent (e.g. a preview deployment
// without secrets wired up) we return null and every caller shows an honest
// error state instead of crashing the entire React tree.
//
// The hard throw lives ONLY in server-side code (app/api routes) where a missing
// env var really should be fatal. Here we degrade gracefully.

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const PLACEHOLDER_HOSTS = ["dummy.supabase.co"];

function isPlaceholder(value: string) {
  return PLACEHOLDER_HOSTS.some((host) => value.includes(host));
}

/**
 * Returns a configured Supabase browser client, or null if env vars are
 * missing/placeholder. Callers must handle the null case.
 */
export function createClient(): SupabaseClient | null {
  // IMPORTANT: Next.js inlines NEXT_PUBLIC_* vars into the client bundle only
  // for a *static* `process.env.NEXT_PUBLIC_X` reference. Keep these explicit.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || isPlaceholder(url) || isPlaceholder(anonKey)) {
    console.error(
      "[supabase/browser] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or still a placeholder. " +
        "Auth and data features are disabled. Wire up the env vars in your deployment.",
    );
    return null;
  }

  try {
    return createBrowserClient(url, anonKey);
  } catch (err) {
    console.error("[supabase/browser] createBrowserClient threw:", err);
    return null;
  }
}