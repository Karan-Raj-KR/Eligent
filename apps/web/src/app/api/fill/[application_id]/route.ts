import { NextResponse } from "next/server";
import type { Failed } from "@opportunity/engine";
import { getBearerUser } from "@/lib/supabase/bearer";
import { evaluateOpportunity, loadCriteria, loadProfile } from "@/lib/eligibility";
import { FIELD_HINTS } from "@/lib/field-hints";

// Called by the Chrome extension, authenticated via `Authorization: Bearer <token>`
// (no cookie jar in a content script). The blocked case is a product feature, not
// an error: the extension reads it and refuses to fill the form. The human always submits.
export async function GET(request: Request, { params }: { params: Promise<{ application_id: string }> }) {
  const { application_id } = await params;
  const { supabase, user } = await getBearerUser(request);
  if (!supabase || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: application, error } = await supabase
    .from("application")
    .select("*, opportunity(*)")
    .eq("id", application_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!application) return NextResponse.json({ error: "application not found" }, { status: 404 });

  const profile = await loadProfile(supabase, user.id);
  if (!profile) return NextResponse.json({ blocked: true, reason: "no_profile", clause: null }, { status: 200 });

  const criteria = await loadCriteria(supabase, application.opportunity.id);
  const evaluation = evaluateOpportunity(profile, criteria);

  if (evaluation.status !== "eligible") {
    // Prefer the categorical/unknown failure as the headline clause — it's the one
    // that can't be argued with a gap number.
    const clause: Failed | undefined =
      evaluation.failed.find((f) => f.gap === undefined) ?? evaluation.failed[0];
    return NextResponse.json({ blocked: true, reason: evaluation.status, clause });
  }

  const { data: requirements } = await supabase
    .from("application_requirement")
    .select("*")
    .eq("application_id", application_id);

  const fields = Object.fromEntries(
    Object.keys(FIELD_HINTS).map((field) => [
      field,
      { value: (profile as Record<string, unknown>)[field] ?? null, hints: FIELD_HINTS[field] },
    ]),
  );

  return NextResponse.json({
    blocked: false,
    profile,
    fields,
    requirements: requirements ?? [],
    opportunity: application.opportunity,
  });
}
