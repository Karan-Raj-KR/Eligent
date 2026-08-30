"use client";

import Link from "next/link";
import { ArrowDownRight, CalendarClock, IndianRupee } from "lucide-react";
import { ClayBadge, ClayButton, ClayCard } from "@/components/clay";
import type { MatchResult } from "@/lib/types";

export function NearMissCard({ match }: { match: MatchResult }) {
  const { scholarship } = match;
  const near = match.nearMisses[0];
  const isOpenNextYear = near?.criterion.kind === "year";

  return (
    <ClayCard topAccent="coral" className="p-6 sm:p-8">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <ClayBadge tone="coral" className="!px-3 !py-1.5 !text-[0.82rem]">
            NEAR MISS
          </ClayBadge>
          <span className="font-display text-[1.05rem] font-bold text-coral-deep">
            {near?.reason}
          </span>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
              <Link
                href={`/opportunity/${scholarship.id}`}
                className="rounded-md transition-colors hover:text-coral-dark"
              >
                {scholarship.title}
              </Link>
            </h3>
            <p className="mt-1 text-[0.9rem] font-medium text-soft">
              {scholarship.provider}
            </p>
          </div>
          <div className="flex items-center gap-4 text-[0.9rem] font-semibold">
            {scholarship.amount && (
              <span className="flex items-center gap-1.5 text-ink">
                <IndianRupee size={15} aria-hidden />
                {scholarship.amount}
              </span>
            )}
            <span className="flex items-center gap-1.5 font-medium text-muted">
              <CalendarClock size={15} aria-hidden />
              {scholarship.deadline ? `Deadline ${scholarship.deadline}` : "Deadline not stated"}
            </span>
          </div>
        </div>

        {isOpenNextYear ? (
          <div className="clay-inset clay-tint-coral grid gap-4 rounded-2xl p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
            <div>
              <p className="text-[0.78rem] font-bold uppercase tracking-wide text-muted">
                You're in
              </p>
              <p className="font-display text-2xl font-bold text-ink">
                Year {scholarship.criteria.find((c) => c.kind === "year")?.value}
              </p>
            </div>
            <div>
              <p className="text-[0.78rem] font-bold uppercase tracking-wide text-muted">
                Requires
              </p>
              <p className="font-display text-2xl font-bold text-coral-deep">
                Year {Number(scholarship.criteria.find((c) => c.kind === "year")?.value)}+
              </p>
            </div>
            <div className="sm:row-span-1">
              <span className="text-muted">
                <ArrowDownRight size={36} aria-hidden className="inline text-coral" />
              </span>
            </div>
            <p className="sm:col-span-3 text-[0.82rem] text-muted">
              Wait for it — don't fill this form for the wrong year. It{" "}
              <em>may</em> open next year.
            </p>
          </div>
        ) : near ? (
          <div className="rounded-2xl border border-[#ffd0da] bg-coral-tint/70">
            <div className="grid grid-cols-2 divide-x divide-[#ffd0da] p-5">
              <div className="pr-5">
                <p className="text-[0.78rem] font-bold uppercase tracking-wide text-muted">
                  Your {near.criterion.short}
                </p>
                <p className="mt-1 font-display text-3xl font-bold tracking-tight text-ink">
                  {extractYou(near.criterion.kind, near.detail)}
                </p>
              </div>
              <div className="pl-5">
                <p className="text-[0.78rem] font-bold uppercase tracking-wide text-muted">
                  Required
                </p>
                <p className="mt-1 font-display text-3xl font-bold tracking-tight text-coral-deep">
                  {extractRequired(near.criterion.kind, near.detail)}
                </p>
              </div>
            </div>
            <div className="border-t border-[#ffd0da] px-5 py-3">
              <p className="text-[0.85rem] font-medium text-ink">
                {near.reason} — {near.detail}
              </p>
            </div>
          </div>
        ) : null}

        <p className="text-[0.92rem] text-muted">
          Don't start this application — you'll be rejected at the cutoff stage.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link href="/matches#eligible">
            <ClayButton variant="soft">See what I qualify for now</ClayButton>
          </Link>
          <Link
            href={`/opportunity/${scholarship.id}`}
            className="text-[0.88rem] font-semibold text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink"
          >
            Why ELIGENT says so
          </Link>
        </div>
      </div>
    </ClayCard>
  );
}

function extractYou(kind: string, detail: string): string {
  if (kind === "cgpa") return detail.match(/Your CGPA ([\d.]+)/)?.[1] ?? detail;
  if (kind === "income")
    return detail.match(/Your income (₹[\d.,]+L?)/)?.[1] ?? detail;
  return detail;
}

function extractRequired(kind: string, detail: string): string {
  if (kind === "cgpa") return detail.match(/Required ([\d.]+)/)?.[1] ?? detail;
  if (kind === "income")
    return detail.match(/Maximum (₹[\d.,]+L?)/)?.[1] ?? detail;
  return detail;
}