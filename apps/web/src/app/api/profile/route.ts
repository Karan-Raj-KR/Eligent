import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";

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

  const row: Record<string, unknown> = { id: user.id };
  for (const field of EDITABLE_FIELDS) {
    if (field in body) row[field] = body[field];
  }

  const { data, error } = await supabase.from("profile").upsert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data);
}
