import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";

export async function GET() {
  const { supabase, user } = await getSessionUser();
  if (!supabase || !user) return NextResponse.json({ notifications: [] });

  const { data, error } = await supabase
    .from("notification")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ notifications: data ?? [] });
}

export async function PATCH(request: Request) {
  const { supabase, user } = await getSessionUser();
  if (!supabase || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const markAll = body?.all === true;
  const notificationId = body?.id;

  if (markAll) {
    const { error } = await supabase
      .from("notification")
      .update({ is_read: true })
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (typeof notificationId === "string") {
    const { error } = await supabase
      .from("notification")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "invalid params" }, { status: 400 });
}
