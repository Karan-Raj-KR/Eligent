import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// Health check endpoint — verifiable from the browser in one request.
// Returns env var presence and a live DB row count without exposing secrets.
export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  let opportunityCount: number | null = null;
  let dbError: string | null = null;

  try {
    const supabase = await createServerSupabase();
    const { count, error } = await supabase
      .from("opportunity")
      .select("*", { count: "exact", head: true });

    if (error) {
      dbError = error.message;
    } else {
      opportunityCount = count;
    }
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
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
