"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  FileText,
  IndianRupee,
  X,
} from "lucide-react";
import { useEligent } from "@/components/provider";
import { ClayBadge, ClayButton, ClayCard } from "@/components/clay";
import { DetailLoading, EmptyState } from "@/components/states";
import { getScholarship } from "@/lib/data/scholarships";
import { evaluate } from "@/lib/eligibility";
import { inr } from "@/lib/format";
import { cn } from "@/lib/cn";

export default function OpportunityPage() {
  const params = useParams<{ id: string }>();
  const { hydrated, signedIn, user } = useEligent();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (!signedIn) router.replace("/signin");
    else if (!user) router.replace("/onboarding");
  }, [hydrated, signedIn, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <DetailLoading />
      </div>
    );
  }

  const scholarship = getScholarship(params.id);
  if (!scholarship) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
        <EmptyState
          title="This scholarship isn't in our dataset."
          body="It may have been removed, or the link is stale."
          actionLabel="Back to matches"
          actionHref="/matches"
        />
      </div>
    );
  }

  const match = evaluate(scholarship, user);
  const qualifies = match.status === "ELIGIBLE";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/matches"
        className="inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden /> Back to matches
      </Link>

      <div className="mt-8 flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
        <div>
          <p className="text-[0.92rem] font-semibold text-soft">{scholarship.provider}</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {scholarship.title}
          </h1>
        </div>
        {qualifies ? (
          <ClayBadge tone="cobalt" className="!px-3.5 !py-2 !text-[0.85rem]">
            <span aria-hidden className="size-1.5 rounded-full bg-cobalt" />
            ELIGIBLE
          </ClayBadge>
        ) : match.status === "NEAR_MISS" ? (
          <ClayBadge tone="coral" className="!px-3.5 !py-2 !text-[0.85rem]">
            NEAR MISS
          </ClayBadge>
        ) : (
          <ClayBadge tone="coral" className="!px-3.5 !py-2 !text-[0.85rem]">
            NOT ELIGIBLE
          </ClayBadge>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.95rem] font-semibold">
        <span className="flex items-center gap-1.5 text-cobalt-deep">
          <IndianRupee size={16} aria-hidden />
          {inr(scholarship.amount)}
        </span>
        <span className="flex items-center gap-1.5 font-medium text-muted">
          <CalendarClock size={16} aria-hidden />
          Deadline {scholarship.deadline}
        </span>
        {scholarship.cadence && (
          <span className="font-medium text-muted">{scholarship.cadence}</span>
        )}
      </div>

      <p className="mt-6 max-w-2xl text-[1rem] leading-relaxed text-muted">
        {scholarship.summary}
      </p>

      <section aria-labelledby="why-heading" className="mt-10">
        <h2 id="why-heading" className="font-display text-xl font-bold tracking-tight text-ink">
          {qualifies ? "Why you qualify" : "Why ELIGENT says no"}
        </h2>
        <div className="mt-4 space-y-2">
          {match.results.map((result) => (
            <div
              key={result.criterion.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-3.5 shadow-[var(--shadow-clay-sm)]"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={cn(
                    "grid size-7 place-items-center rounded-lg",
                    result.status === "pass" && "bg-lime text-lime-ink",
                    result.status === "near" && "bg-coral-tint text-coral-deep",
                    result.status === "fail" && "bg-coral-tint text-coral-deep",
                  )}
                >
                  {result.status === "pass" ? (
                    <Check size={15} strokeWidth={3} />
                  ) : (
                    <X size={14} strokeWidth={3} />
                  )}
                </span>
                <span className="text-[0.92rem] font-semibold text-ink">
                  {result.comparison}
                </span>
              </div>
              <span
                className={cn(
                  "text-right text-[0.82rem] font-medium",
                  result.status === "pass" ? "text-muted" : "text-coral-deep",
                )}
              >
                {result.detail}
              </span>
            </div>
          ))}
        </div>
        {!qualifies && (
          <p className="mt-4 text-[0.85rem] leading-relaxed text-muted">
            {match.status === "NEAR_MISS"
              ? "You're close, but close still fails the official cutoff. Don't start this application."
              : "Based on the published criteria. If you think something is wrong, help the next student and report it from the application page."}
          </p>
        )}
      </section>

      <section aria-labelledby="requirements-heading" className="mt-12">
        <h2 id="requirements-heading" className="font-display text-xl font-bold tracking-tight text-ink">
          Official requirements
        </h2>
        <p className="mt-1 text-[0.86rem] text-muted">
          The complete list of documents the portal will ask for.
        </p>
        <ul className="mt-4 space-y-2">
          {scholarship.officialRequirements.map((req) => (
            <li
              key={req.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-3.5 shadow-[var(--shadow-clay-sm)]"
            >
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-lg bg-cobalt-tint text-cobalt-deep"
              >
                <FileText size={15} />
              </span>
              <div>
                <p className="text-[0.92rem] font-semibold text-ink">{req.label}</p>
                {req.note && <p className="text-[0.8rem] text-muted">{req.note}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <ClayCard className="mt-10 p-6 sm:p-7">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-lg font-bold text-ink">
              {qualifies ? "Ready to check what you have?" : "Find what you actually qualify for"}
            </p>
            <p className="mt-1 text-[0.88rem] text-muted">
              {qualifies
                ? "The application page counts every document — official and community-reported — before you start."
                : "ELIGENT won't start this application for you. It would be wasted effort."}
            </p>
          </div>
          <Link
            href={qualifies ? `/apply/${scholarship.id}` : "/matches"}
            className="shrink-0"
          >
            <ClayButton
              variant={qualifies ? "primary" : "soft"}
              icon={<ArrowRight size={17} />}
            >
              {qualifies ? "Apply with Cutoff" : "See what I qualify for"}
            </ClayButton>
          </Link>
        </div>
      </ClayCard>
    </div>
  );
}