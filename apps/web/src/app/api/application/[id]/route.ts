import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { evaluateOpportunity, loadCriteria, loadProfile } from "@/lib/eligibility";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: application, error } = await supabase
    .from("application")
    .select("*, opportunity(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!application) return NextResponse.json({ error: "application not found" }, { status: 404 });

  const { data: requirements, error: reqError } = await supabase
    .from("application_requirement")
    .select("*")
    .eq("application_id", id);
  if (reqError) return NextResponse.json({ error: reqError.message }, { status: 400 });

  const profile = await loadProfile(supabase, user.id);
  const criteria = await loadCriteria(supabase, application.opportunity.id);
  const eligibility = profile ? evaluateOpportunity(profile, criteria) : null;

  return NextResponse.json({ application, requirements: requirements ?? [], eligibility });
}
