"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, Check, IndianRupee } from "lucide-react";
import { ClayBadge, ClayButton, ClayCard } from "@/components/clay";
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
    <ClayCard className="h-full p-6 sm:p-7 flex flex-col justify-between">
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <h3 className="font-display text-lg font-bold tracking-tight text-ink sm:text-xl">
            <Link
              href={`/opportunity/${scholarship.id}`}
              className="rounded-md transition-colors hover:text-cobalt"
            >
              {scholarship.title}
            </Link>
          </h3>
          <p className="mt-1 text-[0.85rem] font-medium text-soft">
            {scholarship.provider}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.85rem] font-semibold">
          {scholarship.amount && (
            <span className="flex items-center gap-1.5 text-cobalt-deep">
              <IndianRupee size={14} aria-hidden />
              {scholarship.amount}
            </span>
          )}
          <span className="flex items-center gap-1.5 font-medium text-muted">
            <CalendarClock size={14} aria-hidden />
            {scholarship.deadline ? `Deadline ${scholarship.deadline}` : "Deadline not stated"}
          </span>
          {scholarship.cadence && (
            <span className="font-medium text-muted">{scholarship.cadence}</span>
          )}
        </div>

        <div>
          <ClayBadge tone="cobalt" className="!px-3 !py-1.5 !text-[0.82rem]">
            <span aria-hidden className="size-1.5 rounded-full bg-cobalt" />
            ELIGIBLE
          </ClayBadge>
        </div>

        <ul className="space-y-2" aria-label="Why you qualify">
          {passes.map((result) => (
            <PassRow key={result.criterion.id} result={result} />
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-col gap-2.5 pt-2">
        <Link href={`/apply/${scholarship.id}`}>
          <ClayButton variant="primary" block icon={<ArrowRight size={16} />}>
            Apply with Eligent
          </ClayButton>
        </Link>
        <p className="text-center text-[0.78rem] text-soft">
          Official criteria — you qualify
        </p>
      </div>
    </ClayCard>
  );
}