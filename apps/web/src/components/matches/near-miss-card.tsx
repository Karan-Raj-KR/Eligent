"use client";

import Link from "next/link";
import { CalendarClock, IndianRupee } from "lucide-react";
import { ClayBadge, ClayButton, ClayCard } from "@/components/clay";
import type { MatchResult } from "@/lib/types";

export function NearMissCard({ match }: { match: MatchResult }) {
  const { scholarship } = match;
  const near = match.nearMisses[0];
  const isOpenNextYear = near?.criterion.kind === "year_of_study";

  return (
    <ClayCard topAccent="coral" className="h-full p-6 sm:p-7 flex flex-col justify-between">
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <ClayBadge tone="coral" className="!px-3 !py-1.5 !text-[0.82rem]">
            NEAR MISS
          </ClayBadge>
          <span className="font-display text-[0.95rem] font-bold text-coral-deep">
            {near?.reason}
          </span>
        </div>

        <div>
          <h3 className="font-display text-lg font-bold tracking-tight text-ink sm:text-xl">
            <Link
              href={`/opportunity/${scholarship.id}`}
              className="rounded-md transition-colors hover:text-coral-dark"
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
            <span className="flex items-center gap-1.5 text-ink">
              <IndianRupee size={14} aria-hidden />
              {scholarship.amount}
            </span>
          )}
          <span className="flex items-center gap-1.5 font-medium text-muted">
            <CalendarClock size={14} aria-hidden />
            {scholarship.deadline ? `Deadline ${scholarship.deadline}` : "Deadline not stated"}
          </span>
        </div>

        {isOpenNextYear ? (
          <div className="clay-inset clay-tint-coral grid gap-3 rounded-2xl p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[0.72rem] font-bold uppercase tracking-wide text-muted">
                  You're in
                </p>
                <p className="font-display text-xl font-bold text-ink">
                  Year {near?.actual}
                </p>
              </div>
              <div>
                <p className="text-[0.72rem] font-bold uppercase tracking-wide text-muted">
                  Requires
                </p>
                <p className="font-display text-xl font-bold text-coral-deep">
                  Year {near?.required}
                </p>
              </div>
            </div>
            <p className="text-[0.8rem] text-muted">
              Wait for it — don't fill this form for the wrong year. It{" "}
              <em>may</em> open next year.
            </p>
          </div>
        ) : near ? (
          <div className="rounded-2xl border border-[#ffd0da] bg-coral-tint/70">
            <div className="grid grid-cols-2 divide-x divide-[#ffd0da] p-4">
              <div className="pr-4">
                <p className="text-[0.72rem] font-bold uppercase tracking-wide text-muted">
                  Your {near.criterion.short}
                </p>
                <p className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
                  {near.actual}
                </p>
              </div>
              <div className="pl-4">
                <p className="text-[0.72rem] font-bold uppercase tracking-wide text-muted">
                  Required
                </p>
                <p className="mt-1 font-display text-2xl font-bold tracking-tight text-coral-deep">
                  {near.required}
                </p>
              </div>
            </div>
            <div className="border-t border-[#ffd0da] px-4 py-3">
              <p className="text-[0.82rem] font-medium text-ink">
                {near.reason} — {near.detail}
              </p>
            </div>
          </div>
        ) : null}

        <p className="text-[0.85rem] text-muted">
          Don't start this application — you'll be rejected at the cutoff stage.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-2.5 pt-1">
        <Link href="/matches#eligible">
          <ClayButton variant="soft" block>See what I qualify for now</ClayButton>
        </Link>
        <Link
          href={`/opportunity/${scholarship.id}`}
          className="text-center text-[0.84rem] font-semibold text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink"
        >
          Why ELIGENT says so
        </Link>
      </div>
    </ClayCard>
  );
}
