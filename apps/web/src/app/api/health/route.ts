import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { describeError } from "@/lib/upstream";

async function probeSupabase(url: string): Promise<string> {
  try {
    const res = await fetch(new URL("/auth/v1/health", url), {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? "reachable" : `HTTP ${res.status}`;
  } catch (err) {
    return describeError(err);
  }
}

// Health check endpoint — verifiable from the browser in one request.
// Returns env var presence and a live DB row count without exposing secrets.
export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  let opportunityCount: number | null = null;
  let dbError: string | null = null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  try {
    const supabase = await createServerSupabase();
    const { count, error } = await supabase
      .from("opportunity")
      .select("*", { count: "exact", head: true });

    if (error) {
      const probed = supabaseUrl ? await probeSupabase(supabaseUrl) : "no url";
      dbError = probed === "reachable" ? error.message : `${error.message} (${probed})`;
    } else {
      opportunityCount = count;
    }
  } catch (err) {
    const detail = describeError(err);
    const probed = supabaseUrl ? await probeSupabase(supabaseUrl) : null;
    dbError = probed && !detail.includes(probed) ? `${detail} (${probed})` : detail;
  }

  const ok = hasSupabaseUrl && hasAnonKey && dbError === null;

  return NextResponse.json(
    {
      ok,
      hasSupabaseUrl,
      hasAnonKey,
      opportunityCount,
      ...(dbError ? { dbError } : {}),
    },
    { status: ok ? 200 : 503 },
  );
}
