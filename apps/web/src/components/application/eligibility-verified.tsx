"use client";

import { Check, ShieldCheck } from "lucide-react";
import { ClayCard } from "@/components/clay";
import type { MatchResult } from "@/lib/types";

/**
 * The deterministic eligibility verdict. Readiness products must never
 * blur into this — eligible, official, final.
 */
export function EligibilityVerified({ match }: { match: MatchResult }) {
  const passes = match.results.filter((r) => r.status === "pass");

  return (
    <ClayCard className="clay-tint-cobalt p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <span
          aria-hidden
          className="grid size-9 place-items-center rounded-xl bg-lime text-lime-ink shadow-[0_2px_0_rgba(38,54,8,0.2)]"
        >
          <Check size={20} strokeWidth={3} />
        </span>
        <p className="kicker text-cobalt-deep">
          <span className="flex items-center gap-2">
            <ShieldCheck size={16} aria-hidden />
            Eligibility verified
          </span>
        </p>
      </div>

      <p className="mt-5 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        CGPA, income and domicile — all pass.
      </p>
      <p className="mt-2 max-w-lg text-[0.95rem] leading-relaxed text-muted">
        This is deterministic, based on the official criteria ELIGENT
        evaluated against your profile. Not an estimate.
      </p>

      <ul className="mt-6 grid gap-2.5 sm:grid-cols-2" aria-label="Why you qualify">
        {passes.map((result) => (
          <li
            key={result.criterion.id}
            className="flex items-center gap-2.5 rounded-xl border border-cobalt-tint-2 bg-surface/70 px-3.5 py-2.5"
          >
            <span
              aria-hidden
              className="grid size-5 shrink-0 place-items-center rounded-md bg-lime text-lime-ink"
            >
              <Check size={12} strokeWidth={3.5} />
            </span>
            <span className="text-[0.88rem] font-semibold text-ink">
              {result.comparison}
            </span>
          </li>
        ))}
      </ul>
    </ClayCard>
  );
}