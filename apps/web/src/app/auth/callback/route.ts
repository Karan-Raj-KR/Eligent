import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// Google OAuth redirects here with ?code=... after the user consents;
// exchange it for a session, which stores it in cookies for later Route Handlers.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
