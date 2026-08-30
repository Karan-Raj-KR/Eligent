import { NextResponse } from "next/server";
import type { Criterion, Evaluation } from "@opportunity/engine";
import { createServerSupabase } from "@/lib/supabase/server";
import { evaluateOpportunity } from "@/lib/eligibility";
import { parseAmount, parseCsv } from "@/lib/institution-csv";

// Institution demo: run the (unchanged) engine over an uploaded roster and return
// ONLY aggregates. No row is persisted and no per-student field is ever returned.

export const maxDuration = 60;

function blockerLabel(c: { displayText?: string; field: string }): string {
  return c.displayText ?? c.field;
}

export async function POST(request: Request) {
  const csv = await request.text();
  const profiles = parseCsv(csv);
  if (profiles.length === 0) {
    return NextResponse.json({ error: "No data rows found. Check the header row and try again." }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data: opportunities, error } = await supabase
    .from("opportunity")
    .select("id, name, provider, amount, criterion(*)");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const opps = (opportunities ?? []) as Array<{
    id: string; name: string; provider: string; amount: string | null; criterion: Criterion[] | null;
  }>;

  const qualifyingStudents = new Map<string, number>(); // opportunity id -> eligible student count
  const blockers = new Map<string, number>();
  const byBranch = new Map<string, { students: number; qualified: number }>();
  const byYear = new Map<string, { students: number; qualified: number }>();

  let qualified = 0;
  let totalAid = 0;
  let unpricedMatches = 0;

  for (const profile of profiles) {
    let matched = false;
    // Nearest miss = fewest failed criteria. Only used for zero-match students:
    // tallying every failure across the whole catalogue would drown out the
    // criterion that actually blocked them.
    let nearest: Evaluation | null = null;
    for (const opp of opps) {
      const evaluation = evaluateOpportunity(profile, opp.criterion ?? []);
      if (evaluation.status === "eligible") {
        matched = true;
        qualifyingStudents.set(opp.id, (qualifyingStudents.get(opp.id) ?? 0) + 1);
        const value = parseAmount(opp.amount);
        if (value === null) unpricedMatches++;
        else totalAid += value;
      } else if (!nearest || evaluation.failed.length < nearest.failed.length) {
        nearest = evaluation;
      }
    }
    if (matched) qualified++;
    else {
      for (const f of nearest?.failed ?? []) {
        blockers.set(blockerLabel(f), (blockers.get(blockerLabel(f)) ?? 0) + 1);
      }
    }

    const branch = String(profile.branch ?? "Unspecified");
    const year = profile.year_of_study == null ? "Unspecified" : `Year ${profile.year_of_study}`;
    for (const [map, key] of [[byBranch, branch], [byYear, year]] as const) {
      const row = map.get(key) ?? { students: 0, qualified: 0 };
      row.students++;
      if (matched) row.qualified++;
      map.set(key, row);
    }
  }

  const topOpportunities = [...qualifyingStudents.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, students]) => {
      const opp = opps.find((o) => o.id === id)!;
      return { id, name: opp.name, provider: opp.provider, amount: opp.amount, students };
    });

  const topBlocker = [...blockers.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  const rows = (m: Map<string, { students: number; qualified: number }>) =>
    [...m.entries()].sort((a, b) => b[1].students - a[1].students).map(([key, v]) => ({ key, ...v }));

  return NextResponse.json({
    students: profiles.length,
    qualified,
    opportunities: opps.length,
    totalAid,
    unpricedMatches,
    topOpportunities,
    zeroMatch: profiles.length - qualified,
    topBlocker: topBlocker ? { criterion: topBlocker[0], students: topBlocker[1] } : null,
    byBranch: rows(byBranch),
    byYear: rows(byYear),
  });
}
