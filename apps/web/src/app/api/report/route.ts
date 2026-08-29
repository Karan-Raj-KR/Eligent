import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";

const REPORT_TYPES = ["wrong_deadline", "extra_document", "file_limit", "criteria_mismatch", "closed", "other"];

export async function POST(request: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { opportunity_id, report_type, note } = body ?? {};
  if (typeof opportunity_id !== "string" || !REPORT_TYPES.includes(report_type)) {
    return NextResponse.json(
      { error: `opportunity_id is required; report_type must be one of ${REPORT_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("report")
    .insert({ opportunity_id, user_id: user.id, report_type, note: note ?? null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data, { status: 201 });
}
