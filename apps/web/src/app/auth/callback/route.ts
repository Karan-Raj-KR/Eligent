import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// OAuth (Google) lands here with ?code=. Exchanging it sets the session cookies
// the rest of the app — and the extension's bridge — already read.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  // Behind Vercel's proxy request.url carries the internal host; the forwarded
  // header is the origin the user actually typed.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const origin = forwardedHost ? `https://${forwardedHost}` : url.origin;

  if (!code) return NextResponse.redirect(`${origin}/signin?error=missing_code`);

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/signin?error=${encodeURIComponent(error.message)}`);
  }
  return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/"}`);
}
