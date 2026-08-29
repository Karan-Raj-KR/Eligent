import { createClient } from "@supabase/supabase-js";

/**
 * Token-backed client for the Chrome extension, which has no cookie jar and
 * authenticates with `Authorization: Bearer <access_token>` instead. RLS
 * still scopes every query to that token's auth.uid() — no service role key.
 */
export async function getBearerUser(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { supabase: null, user: null };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  return { supabase, user };
}
