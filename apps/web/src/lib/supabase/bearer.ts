import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Token-backed client for the Chrome extension, which has no cookie jar and
 * authenticates with `Authorization: Bearer <access_token>` instead. RLS
 * still scopes every query to that token's auth.uid() — no service role key.
 */
export async function getBearerUser(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { supabase: null, user: null };

  const { url, anonKey } = getSupabaseEnv();
  const supabase = createClient(
    url,
    anonKey,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  return { supabase, user };
}
