"use client";

import Link from "next/link";
import { ArrowUpRight, BadgeCheck } from "lucide-react";
import { ClayBadge, ClayCard } from "@/components/clay";
import { cgpa, inrCompact } from "@/lib/format";
import type { UserProfile } from "@/lib/types";

interface MatchSummaryProps {
  counts: { total: number; eligible: number; nearMiss: number; notEligible: number };
}

export function MatchSummary({ counts }: MatchSummaryProps) {
  const others = counts.total - counts.eligible;

  return (
    <section aria-labelledby="match-hero-title">
      <p className="kicker text-cobalt">
        <span aria-hidden className="mr-2 inline-block size-2 rounded-full bg-cobalt align-middle" />
        Your opportunity matches
      </p>

      <div className="mt-6">
        <div className="clay-inset hash-bg inline-flex max-w-full flex-wrap items-baseline gap-x-4 gap-y-2 overflow-hidden rounded-[26px] px-6 py-7 sm:px-10 sm:py-8">
          <span
            id="match-hero-title"
            className="font-display text-[clamp(4.2rem,13vw,8.5rem)] font-bold leading-[0.88] tracking-tight text-ink"
          >
            {counts.eligible}
          </span>
          <span className="font-display text-[clamp(1.5rem,4.5vw,3rem)] font-semibold text-muted">
            of {counts.total}
          </span>
        </div>
      </div>

      <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-muted">
        You qualify for{" "}
        <strong className="font-semibold text-ink">
          {counts.eligible} opportunities
        </strong>
        . Here's why the other {others} said no.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <a
          href="#eligible"
          className="clay-badge clay-badge--cobalt !px-3.5 !py-2 hover:brightness-95"
        >
          {counts.eligible} eligible
        </a>
        <a
          href="#near-miss"
          className="clay-badge clay-badge--coral !px-3.5 !py-2 hover:brightness-95"
        >
          {counts.nearMiss} near miss
        </a>
        <a
          href="#not-eligible"
          className="clay-badge !px-3.5 !py-2 hover:brightness-95"
        >
          {counts.notEligible} not eligible
        </a>
      </div>
    </section>
  );
}

export function ProfilePanel({ profile, total }: { profile: UserProfile; total?: number }) {
  const rows: Array<[string, string]> = [
    ["CGPA", cgpa(profile.cgpa)],
    ["Year of study", String(profile.year)],
    ["Branch", profile.branch],
    ["State", profile.state],
    ["Family income", inrCompact(profile.income)],
    ["Institute", profile.institutionType],
  ];

  return (
    <ClayCard className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            What we checked
          </h2>
          <p className="mt-0.5 text-[0.85rem] text-muted">
            {total === undefined
              ? "Evaluated against your profile."
              : `${total} opportunit${total === 1 ? "y" : "ies"} evaluated against your profile.`}
          </p>
        </div>
        <Link
          href="/onboarding"
          className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[0.82rem] font-semibold text-cobalt-deep transition-colors hover:bg-cobalt-tint"
        >
          Edit details <ArrowUpRight size={14} aria-hidden />
        </Link>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-soft">
              {label}
            </dt>
            <dd className="text-[0.95rem] font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="rule my-5" />

      <div className="flex items-start gap-2.5">
        <BadgeCheck size={18} className="mt-0.5 shrink-0 text-cobalt" aria-hidden />
        <div>
          <p className="text-[0.85rem] font-semibold text-ink">
            Deterministic, not estimated
          </p>
          <p className="mt-0.5 text-[0.8rem] leading-relaxed text-muted">
            Eligibility is free and based on official criteria only.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <ClayBadge tone="lime">Free check · official criteria</ClayBadge>
      </div>
    </ClayCard>
  );
}