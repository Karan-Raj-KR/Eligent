import { getSessionUser } from "@/lib/supabase/server";

/**
 * getSessionUser() that never throws. With an unreachable or misconfigured
 * Supabase project the auth call rejects, and an unhandled rejection in a
 * Server Component is a 500 — a blank screen on stage instead of a page with a
 * sign-in button on it.
 */
export async function currentUser() {
  try {
    return await getSessionUser();
  } catch {
    return { supabase: null, user: null };
  }
}
