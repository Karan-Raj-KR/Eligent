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

  const grouped: Record<Evaluation["status"], Array<{ opportunity: Record<string, unknown>; evaluation: Evaluation }>> = {
    eligible: [],
    near_miss: [],
    rejected: [],
  };

  for (const row of opportunities ?? []) {
    const { criterion, ...opportunity } = row as { criterion: Criterion[] } & Record<string, unknown>;
    const evaluation = evaluateOpportunity(profile, criterion ?? []);
    grouped[evaluation.status].push({ opportunity, evaluation });
  }

  return NextResponse.json(grouped);
}
