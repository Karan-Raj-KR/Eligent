import { NextResponse } from "next/server";
import type { Criterion, Evaluation } from "@opportunity/engine";
import { getSessionUser } from "@/lib/supabase/server";
import { evaluateOpportunity, loadProfile } from "@/lib/eligibility";

// Engine runs server-side only, inside this Route Handler — never shipped to the browser.
export async function GET() {
  const { supabase, user } = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const profile = await loadProfile(supabase, user.id);
  if (!profile) return NextResponse.json({ error: "complete onboarding first" }, { status: 400 });

  const { data: opportunities, error } = await supabase
    .from("opportunity")
    .select("id, name, provider, url, deadline, amount, criterion(*)");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // The criteria ride along so the UI can show the verbatim source_text clause
  // that disqualified an applicant. The engine's Failed entries carry the gap
  // arithmetic and display_text but not the quote, and evaluate.ts is verified
  // correct and not to be changed to add one.
  const grouped: Record<
    Evaluation["status"],
    Array<{ opportunity: Record<string, unknown>; evaluation: Evaluation; criteria: Criterion[] }>
  > = {
    eligible: [],
    near_miss: [],
    rejected: [],
  };

  for (const row of opportunities ?? []) {
    const { criterion, ...opportunity } = row as { criterion: Criterion[] } & Record<string, unknown>;
    const criteria = criterion ?? [];
    const evaluation = evaluateOpportunity(profile, criteria);
    grouped[evaluation.status].push({ opportunity, evaluation, criteria });
  }

  return NextResponse.json(grouped);
}
