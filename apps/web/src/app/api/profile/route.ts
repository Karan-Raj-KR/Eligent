import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
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
