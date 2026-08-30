import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";

export async function GET() {
  const { supabase, user } = await getSessionUser();
  if (!supabase || !user) return NextResponse.json({ saved: [] });

  const { data, error } = await supabase
    .from("saved_opportunity")
    .select("opportunity_id")
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const ids = (data ?? []).map((row: { opportunity_id: string }) => row.opportunity_id);
  return NextResponse.json({ saved: ids });
}

export async function POST(request: Request) {
  const { supabase, user } = await getSessionUser();
  if (!supabase || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const opportunityId = body?.opportunity_id;

  if (typeof opportunityId !== "string" || !opportunityId.trim()) {
    return NextResponse.json({ error: "opportunity_id is required" }, { status: 400 });
  }

  const { error } = await supabase.from("saved_opportunity").upsert(
    { user_id: user.id, opportunity_id: opportunityId },
    { onConflict: "user_id,opportunity_id" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, saved: true });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await getSessionUser();
  if (!supabase || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const opportunityId = searchParams.get("opportunity_id");

  if (!opportunityId) return NextResponse.json({ error: "opportunity_id query param required" }, { status: 400 });

  const { error } = await supabase
    .from("saved_opportunity")
    .delete()
    .eq("user_id", user.id)
    .eq("opportunity_id", opportunityId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, saved: false });
}
