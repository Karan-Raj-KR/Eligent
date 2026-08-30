import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/supabase/server";
import { getBearerUser } from "@/lib/supabase/bearer";
import { completeness, toFieldMap } from "./fields";
// Same deep-relative import style as /api/discover reaching into scripts/.
// vocab.ts is pure — no Supabase client, nothing that must not run in the app.
import { canonicalValue } from "../../../../../../packages/db/vocab";

// Columns a client may set. id/created_at are server-controlled.
const EDITABLE_FIELDS = [
  "full_name",
  "cgpa",
  "percentage",
  "year_of_study",
  "branch",
  "state",
  "annual_family_income",
  "institution_type",
  "category",
  "gender",
] as const;

export async function POST(request: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (typeof body.full_name !== "string" || !body.full_name.trim()) {
    return NextResponse.json({ error: "full_name is required" }, { status: 400 });
  }

  // Canonicalise categorical values on the way in. packages/engine compares
  // them with === and is field-agnostic by design, so "female" from one client
  // and "Female" from another must not become two different students.
  const row: Record<string, unknown> = { id: user.id };
  for (const field of EDITABLE_FIELDS) {
    if (field in body) row[field] = canonicalValue(field, body[field]);
  }

  const { data, error } = await supabase.from("profile").upsert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data);
}

/**
 * Resolves the caller from an `Authorization: Bearer <token>` header, falling
 * back to the session cookie. The extension has no cookie jar and must use the
 * bearer form; the web app already has cookies. RLS scopes both to auth.uid().
 */
async function getCaller(request: Request): Promise<{ supabase: SupabaseClient | null; user: User | null }> {
  const bearer = await getBearerUser(request);
  if (bearer.user) return bearer;
  return getSessionUser();
}

/**
 * GET /api/profile — the single source of truth for a student's details.
 *
 * The extension used to ask the student to type their profile a second time.
 * It now reads it from here, labels included, so it needs no knowledge of the
 * profile schema. Response shape is frozen in apps/web/API-CONTRACT.md.
 */
export async function GET(request: Request) {
  const { supabase, user } = await getCaller(request);
  if (!supabase || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data, error } = await supabase.from("profile").select("*").eq("id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const profile = (data as Record<string, unknown> | null) ?? null;
  return NextResponse.json({
    user_id: user.id,
    // null profile is a normal state — the student has not finished onboarding.
    profile,
    fields: toFieldMap(profile),
    completeness: completeness(profile),
  });
}
