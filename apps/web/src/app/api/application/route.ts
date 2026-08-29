import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const opportunityId = body?.opportunity_id;
  if (typeof opportunityId !== "string") {
    return NextResponse.json({ error: "opportunity_id is required" }, { status: 400 });
  }

  const { data: opportunity, error: oppError } = await supabase
    .from("opportunity")
    .select("id, official_documents")
    .eq("id", opportunityId)
    .maybeSingle();
  if (oppError) return NextResponse.json({ error: oppError.message }, { status: 400 });
  if (!opportunity) return NextResponse.json({ error: "opportunity not found" }, { status: 404 });

  // Idempotent: re-posting for an opportunity the user already applied to just returns it.
  const { data: existing } = await supabase
    .from("application")
    .select("*")
    .eq("user_id", user.id)
    .eq("opportunity_id", opportunityId)
    .maybeSingle();
  if (existing) {
    const { data: requirements } = await supabase
      .from("application_requirement")
      .select("*")
      .eq("application_id", existing.id);
    return NextResponse.json({ application: existing, requirements: requirements ?? [] });
  }

  const { data: application, error: appError } = await supabase
    .from("application")
    .insert({ user_id: user.id, opportunity_id: opportunityId })
    .select()
    .single();
  if (appError) return NextResponse.json({ error: appError.message }, { status: 400 });

  const officialDocs: string[] = opportunity.official_documents ?? [];
  const officialRows = officialDocs.map((document_type) => ({
    application_id: application.id,
    document_type,
    source: "official" as const,
    user_has: null,
  }));

  // Community requirements: documents students reported that weren't on the official list,
  // grouped by note text so the applicant sees "N people reported needing this".
  const { data: extraDocReports } = await supabase
    .from("report")
    .select("note")
    .eq("opportunity_id", opportunityId)
    .eq("report_type", "extra_document");

  const counts = new Map<string, { label: string; count: number }>();
  for (const { note } of extraDocReports ?? []) {
    const trimmed = note?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    const existingCount = counts.get(key);
    if (existingCount) existingCount.count += 1;
    else counts.set(key, { label: trimmed, count: 1 });
  }

  const communityRows = [...counts.values()].map(({ label, count }) => ({
    application_id: application.id,
    document_type: `${label} (reported by ${count})`,
    source: "community" as const,
    user_has: null,
  }));

  const requirementRows = [...officialRows, ...communityRows];
  const { data: requirements, error: reqError } = requirementRows.length
    ? await supabase.from("application_requirement").insert(requirementRows).select()
    : { data: [], error: null };
  if (reqError) return NextResponse.json({ error: reqError.message }, { status: 400 });

  return NextResponse.json({ application, requirements: requirements ?? [] }, { status: 201 });
}
