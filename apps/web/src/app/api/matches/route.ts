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

  const FULL = "id, name, provider, url, deadline, amount, category, location_type, funded, criteria_status, criterion(*)";
  const NO_STATUS = "id, name, provider, url, deadline, amount, category, location_type, funded, criterion(*)";
  const LEGACY = "id, name, provider, url, deadline, amount, criterion(*)";
  let { data: opportunities, error } = await supabase.from("opportunity").select(FULL);
  // Either migration may not have been applied yet — fall back so /matches keeps
  // rendering. Losing criteria_status does NOT weaken the guard below: an
  // opportunity with no criterion rows is unverified whether or not a column
  // says so, and that is the check the guard actually relies on.
  if (error && /column .*criteria_status/i.test(error.message)) {
    ({ data: opportunities, error } = await supabase.from("opportunity").select(NO_STATUS));
  }
  if (error && /column .*(category|location_type|funded)/i.test(error.message)) {
    ({ data: opportunities, error } = await supabase.from("opportunity").select(LEGACY));
  }
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

  // Opportunities we hold no verified criteria for. They get NO verdict — not
  // eligible, not near miss, not rejected — and are returned separately so the
  // UI can show them under their own honest label.
  const unverified: Array<{ opportunity: Record<string, unknown> }> = [];

  for (const row of opportunities ?? []) {
    const { criterion, ...opportunity } = row as { criterion: Criterion[] } & Record<string, unknown>;
    const criteria = criterion ?? [];

    // THE GUARD. evaluate() with an empty criteria list has nothing to fail on,
    // so it returns `eligible` — a confident yes for every student alive. That
    // must never reach a student as a verdict. Zero criteria is the derived
    // truth and is authoritative on its own; criteria_status is belt-and-braces
    // for a row explicitly marked unverified by the harvester.
    if (criteria.length === 0 || opportunity.criteria_status === "unverified") {
      unverified.push({ opportunity });
      continue;
    }

    const evaluation = evaluateOpportunity(profile, criteria);
    grouped[evaluation.status].push({ opportunity, evaluation, criteria });
  }

  return NextResponse.json({ ...grouped, unverified });
}
