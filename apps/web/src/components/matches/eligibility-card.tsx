"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, Check, IndianRupee } from "lucide-react";
import { ClayBadge, ClayButton, ClayCard } from "@/components/clay";
import { inr } from "@/lib/format";
import type { CriterionResult, MatchResult } from "@/lib/types";

function PassRow({ result }: { result: CriterionResult }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid size-6 shrink-0 place-items-center rounded-lg bg-lime text-lime-ink"
      >
        <Check size={14} strokeWidth={3} />
      </span>
      <span className="text-[0.92rem] font-semibold text-ink">
        {result.comparison}
      </span>
    </li>
  );
}

export function EligibilityCard({ match }: { match: MatchResult }) {
  const { scholarship } = match;
  const passes = match.results.filter((r) => r.status === "pass");

  return (
    <ClayCard className="p-6 sm:p-8">
      <div className="grid gap-7 lg:grid-cols-[1fr_230px] lg:gap-10">
        <div className="space-y-5">
          <div>
            <h3 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
              <Link
                href={`/opportunity/${scholarship.id}`}
                className="rounded-md transition-colors hover:text-cobalt"
              >
                {scholarship.title}
              </Link>
            </h3>
            <p className="mt-1 text-[0.9rem] font-medium text-soft">
              {scholarship.provider}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.9rem] font-semibold">
            <span className="flex items-center gap-1.5 text-cobalt-deep">
              <IndianRupee size={15} aria-hidden />
              {inr(scholarship.amount)}
            </span>
            <span className="flex items-center gap-1.5 font-medium text-muted">
              <CalendarClock size={15} aria-hidden />
              Deadline {scholarship.deadline}
            </span>
            {scholarship.cadence && (
              <span className="font-medium text-muted">{scholarship.cadence}</span>
            )}
          </div>

          <ul className="space-y-2" aria-label="Why you qualify">
            {passes.map((result) => (
              <PassRow key={result.criterion.id} result={result} />
            ))}
          </ul>
        </div>

        <div className="flex flex-col justify-between gap-5 lg:items-stretch">
          <ClayBadge tone="cobalt" className="self-start !px-3 !py-1.5 !text-[0.82rem]">
            <span aria-hidden className="size-1.5 rounded-full bg-cobalt" />
            ELIGIBLE
          </ClayBadge>
          <div className="flex flex-col gap-2.5">
            <Link href={`/apply/${scholarship.id}`}>
              <ClayButton variant="primary" block icon={<ArrowRight size={16} />}>
                Apply with Cutoff
              </ClayButton>
            </Link>
            <p className="text-center text-[0.78rem] text-soft">
              Official criteria — you qualify
            </p>
          </div>
        </div>
      </div>
    </ClayCard>
  );
}