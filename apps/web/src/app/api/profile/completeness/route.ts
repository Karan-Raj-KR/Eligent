import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { getBearerUser } from "@/lib/supabase/bearer";
import { completeness } from "../fields";

/**
 * GET /api/profile/completeness -> { filled, total, missing[] }
 *
 * Split out from GET /api/profile so a caller that only wants to render
 * "8 of 8 fields" does not have to pull the student's details to count them.
 * Optional fields (category, gender) never count as missing — declining to
 * answer is an answer.
 */
export async function GET(request: Request) {
  const bearer = await getBearerUser(request);
  const { supabase, user } = bearer.user ? bearer : await getSessionUser();
  if (!supabase || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data, error } = await supabase.from("profile").select("*").eq("id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(completeness((data as Record<string, unknown> | null) ?? null));
}
