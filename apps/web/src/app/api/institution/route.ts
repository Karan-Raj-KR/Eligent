import { NextResponse } from "next/server";
import type { Criterion, Evaluation, Profile } from "@opportunity/engine";
import { createServerSupabase } from "@/lib/supabase/server";
import { evaluateOpportunity } from "@/lib/eligibility";
import { parseAmount, parseCsv } from "@/lib/institution-csv";

// Institution demo: run the (unchanged) engine over an uploaded roster and return
// ONLY aggregates. No row is persisted and no per-student field is ever returned.

export const maxDuration = 60;

/** Money is on the table. These are the only categories the aid figure may touch. */
const FUNDED_CATEGORIES = ["scholarship", "fellowship", "grant"];

/** A student is "within reach" of a CGPA-only gap this size. */
const CGPA_REACH = 0.3;

function blockerLabel(c: { displayText?: string; field: string }): string {
  return c.displayText ?? c.field;
}

interface Opp {
  id: string;
  name: string;
  provider: string;
  amount: string | null;
  category: string;
  criterion: Criterion[] | null;
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
    .select("id, name, provider, amount, category, criterion(*)");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const all = (opportunities ?? []) as Opp[];

  // (1) An opportunity with no criterion rows returns `eligible` for every
  // profile alive — it is not a match, it is missing data. It cannot appear in
  // any count on this page; it is disclosed as a footnote instead.
  const unverified = all.filter((o) => (o.criterion ?? []).length === 0);
  const scored = all.filter((o) => (o.criterion ?? []).length > 0);

  // (2) Two populations that do not belong in the same sentence. A hackathon
  // has no award to add to an aid figure, and a scholarship is not "open".
  const funded = scored.filter((o) => FUNDED_CATEGORIES.includes(o.category));
  const open = scored.filter((o) => !FUNDED_CATEGORIES.includes(o.category));

  // Per-opportunity tallies, kept separately per population.
  const fundedEligible = new Map<string, number>();
  const fundedNearMiss = new Map<string, number>();
  const openEligible = new Map<string, number>();

  const blockers = new Map<string, number>();
  const byBranch = new Map<string, { students: number; qualified: number }>();
  const byYear = new Map<string, { students: number; qualified: number }>();

  let qualifiedFunded = 0;
  let qualifiedOpen = 0;
  let qualifiedNothing = 0;
  let totalAid = 0;
  let studentsWithUnpricedBest = 0;
  let withinCgpaReach = 0;

  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

  for (const profile of profiles) {
    // (3) One student contributes ONE award: the largest they actually qualify
    // for. Summing every award a student could theoretically hold at once is
    // how you get an indefensible number.
    let bestAward = 0;
    let eligibleForFunded = false;
    let bestAwardIsUnpriced = false;

    /** Nearest miss across the catalogue, for the zero-match blocker tally. */
    let nearest: Evaluation | null = null;
    let nearlyThere = false;

    for (const opp of funded) {
      const evaluation = evaluateOpportunity(profile as Profile, opp.criterion ?? []);

      if (evaluation.status === "eligible") {
        eligibleForFunded = true;
        bump(fundedEligible, opp.id);
        const award = parseAmount(opp.amount);
        if (award === null) {
          // Keep the student in the "qualifies" count, but never guess a value.
          if (bestAward === 0) bestAwardIsUnpriced = true;
        } else if (award > bestAward) {
          bestAward = award;
          bestAwardIsUnpriced = false;
        }
      } else {
        if (evaluation.status === "near_miss") bump(fundedNearMiss, opp.id);
        if (!nearest || evaluation.failed.length < nearest.failed.length) nearest = evaluation;

        // (4) Actionable for a college: the only thing between this student and
        // this scholarship is a CGPA they could plausibly reach.
        if (
          !nearlyThere &&
          evaluation.failed.length === 1 &&
          evaluation.failed[0].field === "cgpa" &&
          evaluation.failed[0].gap &&
          evaluation.failed[0].gap.direction === "short" &&
          evaluation.failed[0].gap.amount <= CGPA_REACH
        ) {
          nearlyThere = true;
        }
      }
    }

    let eligibleForOpen = false;
    for (const opp of open) {
      const evaluation = evaluateOpportunity(profile as Profile, opp.criterion ?? []);
      if (evaluation.status !== "eligible") continue;
      eligibleForOpen = true;
      bump(openEligible, opp.id);
    }

    if (eligibleForFunded) {
      qualifiedFunded++;
      if (bestAward > 0) totalAid += bestAward;
      else if (bestAwardIsUnpriced) studentsWithUnpricedBest++;
    }
    if (eligibleForOpen) qualifiedOpen++;
    if (nearlyThere) withinCgpaReach++;

    if (!eligibleForFunded && !eligibleForOpen) {
      qualifiedNothing++;
      // Only zero-match students, and only their nearest miss — otherwise every
      // unrelated criterion in the catalogue drowns out the real blocker.
      for (const f of nearest?.failed ?? []) bump(blockers, blockerLabel(f));
    }

    const branch = String(profile.branch ?? "Unspecified");
    const year = profile.year_of_study == null ? "Unspecified" : `Year ${profile.year_of_study}`;
    for (const [map, key] of [[byBranch, branch], [byYear, year]] as const) {
      const row = map.get(key) ?? { students: 0, qualified: 0 };
      row.students++;
      // Branch/year variation is about the money story, so it tracks funded.
      if (eligibleForFunded) row.qualified++;
      map.set(key, row);
    }
  }

  const nameOf = new Map(scored.map((o) => [o.id, o]));
  const top = (m: Map<string, number>, n = 5) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([id, students]) => {
        const o = nameOf.get(id)!;
        return { id, name: o.name, provider: o.provider, amount: o.amount, students };
      });

  // (4) The biggest pool of students who ALMOST qualify — where a small policy
  // change unlocks the most people.
  const mostMissed = [...fundedNearMiss.entries()]
    .map(([id, nearMiss]) => ({ id, nearMiss, eligible: fundedEligible.get(id) ?? 0 }))
    .map((r) => ({ ...r, gap: r.nearMiss - r.eligible }))
    .sort((a, b) => b.gap - a.gap)[0];

  const topBlocker = [...blockers.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  const rows = (m: Map<string, { students: number; qualified: number }>) =>
    [...m.entries()].sort((a, b) => b[1].students - a[1].students).map(([key, v]) => ({ key, ...v }));

  const branchRows = rows(byBranch);
  const yearRows = rows(byYear);
  /** (5) If every bucket is identical the criteria are not discriminating. */
  const rate = (r: { students: number; qualified: number }) => r.qualified / r.students;
  const flat =
    branchRows.length > 1 &&
    branchRows.every((r) => Math.abs(rate(r) - rate(branchRows[0])) < 0.0001) &&
    yearRows.length > 1 &&
    yearRows.every((r) => Math.abs(rate(r) - rate(yearRows[0])) < 0.0001);

  const awardsPriced = funded.filter((o) => parseAmount(o.amount) !== null).length;

  return NextResponse.json({
    students: profiles.length,

    catalogue: {
      total: all.length,
      funded: funded.length,
      open: open.length,
      unverified: unverified.length,
      fundedWithoutAmount: funded.length - awardsPriced,
    },

    funded: {
      qualified: qualifiedFunded,
      totalAid,
      studentsWithUnpricedBest,
      topOpportunities: top(fundedEligible),
      mostMissed: mostMissed && mostMissed.gap > 0
        ? { name: nameOf.get(mostMissed.id)!.name, nearMiss: mostMissed.nearMiss, eligible: mostMissed.eligible }
        : null,
      withinCgpaReach,
      cgpaReach: CGPA_REACH,
    },

    open: {
      qualified: qualifiedOpen,
      topOpportunities: top(openEligible),
    },

    qualifiedNothing,
    topBlocker: topBlocker ? { criterion: topBlocker[0], students: topBlocker[1] } : null,

    byBranch: branchRows,
    byYear: yearRows,
    breakdownIsFlat: flat,
  });
}
