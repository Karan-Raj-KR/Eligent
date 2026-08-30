import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session cookie on every request so Route Handlers
// always see a valid (non-expired) session. Required for cookie-based auth.
//
// FAIL-OPEN DESIGN: any error in here must degrade to "not signed in", never
// to a 500. A broken session refresh is far less damaging than a dead site.
export async function proxy(request: NextRequest) {
  try {
    // Guard: if Supabase isn't configured, skip silently.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      // Env vars missing (e.g. preview deployment without secrets) — pass through.
      return NextResponse.next({ request });
    }

    const response = NextResponse.next({ request });

    // Client construction is inside the try block so any module-scope throw
    // (e.g. bad URL format) is caught rather than crashing the edge runtime.
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (
          cookiesToSet: Array<{
            name: string;
            value: string;
            options: CookieOptions;
          }>,
        ) => {
          for (const { name, value } of cookiesToSet)
            request.cookies.set(name, value);
          for (const { name, value, options } of cookiesToSet)
            response.cookies.set(name, value, options);
        },
      },
    });

    // Attempt to refresh the session. If this throws (network error, Supabase
    // outage, etc.) the catch block below returns next() so the site stays up.
    await supabase.auth.getUser();

    return response;
  } catch (err) {
    // Log but never propagate — a broken session refresh must not kill the site.
    console.error("[middleware] Session refresh failed, failing open:", err);
    return NextResponse.next({ request });
  }
}

export const config = {
  // Pages need the refresh as much as the API routes do: the landing page and
  // every Server Component read the session from cookies, and an expiring token
  // that is only refreshed on /api/* leaves them reading a stale one.
  // Skips Next.js static output, image optimisation, favicon, and common asset
  // extensions so the middleware never runs on files that can't carry a session.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)",
  ],
};
