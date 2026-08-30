import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase } = await getSessionUser();
  if (!supabase) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const { data, error } = await supabase.from("opportunity").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!supabase || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Ownership check
  const { data: existing } = await supabase.from("opportunity").select("creator_user_id").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });

  if (existing.creator_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden: You can only edit opportunities you created" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("opportunity")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("creator_user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!supabase || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { error } = await supabase
    .from("opportunity")
    .delete()
    .eq("id", id)
    .eq("creator_user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
