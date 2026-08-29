import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: applicationId } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { requirement_id, user_has } = body ?? {};
  if (typeof requirement_id !== "string" || typeof user_has !== "boolean") {
    return NextResponse.json({ error: "requirement_id and user_has (boolean) are required" }, { status: 400 });
  }

  // RLS also enforces this, but scoping the query catches a requirement_id from a
  // different application and turns it into a clean 404 instead of a silent no-op.
  const { data: requirement, error } = await supabase
    .from("application_requirement")
    .update({ user_has })
    .eq("id", requirement_id)
    .eq("application_id", applicationId)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!requirement) return NextResponse.json({ error: "requirement not found" }, { status: 404 });

  await supabase.from("application").update({ updated_at: new Date().toISOString() }).eq("id", applicationId);

  return NextResponse.json(requirement);
}
