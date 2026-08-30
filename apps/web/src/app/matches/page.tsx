"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useEligent } from "@/components/provider";
import {
  MatchesLoading,
  ErrorState,
  EmptyState,
  ClayPanel,
} from "@/components/states";
import { MatchSummary, ProfilePanel } from "@/components/matches/match-summary";
import { EligibilityCard } from "@/components/matches/eligibility-card";
import { NearMissCard } from "@/components/matches/near-miss-card";
import { RejectedCard } from "@/components/matches/rejected-card";
import { getMatches, getMatchCounts } from "@/lib/eligibility";

type Phase = "loading" | "ready" | "error";

const STEPS = [
  ["QUALIFY", "Free check against 43 official criteria sets."],
  ["UNDERSTAND", "Exactly why you qualify — or by how much you miss."],
  ["CHECK", "Every document, official and community-reported."],
  ["PREPARE", "₹99 Apply Mode gets what you need, counted, no guesswork."],
  ["APPLY", "The extension fills the real portal form and restores progress."],
  ["DON'T WASTE TIME", "Mismatched criteria? ELIGENT refuses to fill the form."],
] as const;

export default function MatchesPage() {
  const { hydrated, signedIn, user } = useEligent();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    if (!hydrated) return;
    if (!signedIn) {
      router.replace("/signin");
      return;
    }
    if (!user) {
      router.replace("/onboarding");
      return;
    }
    const t = setTimeout(() => setPhase("ready"), 800);
    return () => clearTimeout(t);
  }, [hydrated, signedIn, user, router]);

  const { counts, groups } = useMemo(() => {
    if (!user) return { counts: null, groups: null };
    try {
      return { counts: getMatchCounts(user), groups: getMatches(user) };
    } catch {
      return { counts: null, groups: null };
    }
  }, [user]);

  const notHydrated = !hydrated || !user;
  const showSkeleton = notHydrated || phase === "loading";
  const showError = phase === "error";
  const showEmpty =
    phase === "ready" && groups && counts && counts.eligible + counts.nearMiss === 0;

  if (notHydrated || showSkeleton) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <MatchesLoading />
      </div>
    );
  }

  if (showError) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        <ErrorState
          onRetry={() => {
            setPhase("loading");
            setTimeout(() => setPhase("ready"), 800);
          }}
        />
      </div>
    );
  }

  if (showEmpty || !groups || !counts) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        <EmptyState />
      </div>
    );
  }

  const others = counts.total - counts.eligible;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:items-start lg:gap-14">
        <MatchSummary counts={counts} />
        <ProfilePanel profile={user} />
      </div>

      <p className="mt-10 max-w-2xl text-[0.92rem] leading-relaxed text-muted">
        The other {others} were evaluated too — checked, not skipped. No
        greyed-out cards. That's how you know the {counts.eligible} are real.
      </p>

      {/* ELIGIBLE */}
      <section id="eligible" aria-labelledby="eligible-heading" className="mt-6 scroll-mt-28">
        <SectionHeader
          id="eligible-heading"
          kicker="Official check passed"
          title="Eligible"
          count={counts.eligible}
          caption="You pass every official criterion. Use the Cutoff extension to fill the real form."
        />
        <div className="space-y-4">
          {groups.eligible.map((match) => (
            <EligibilityCard key={match.scholarship.id} match={match} />
          ))}
        </div>
      </section>

      {/* NEAR MISS */}
      <section id="near-miss" aria-labelledby="near-miss-heading" className="mt-16 scroll-mt-28">
        <SectionHeader
          id="near-miss-heading"
          kicker="Close — but rejected at the cutoff"
          title="Near miss"
          count={counts.nearMiss}
          caption="Don't start these applications. The portal will still say no."
        />
        <div className="space-y-4">
          {groups.nearMiss.map((match) => (
            <NearMissCard key={match.scholarship.id} match={match} />
          ))}
        </div>
      </section>

      {/* NOT ELIGIBLE */}
      <section id="not-eligible" aria-labelledby="not-eligible-heading" className="mt-16 scroll-mt-28">
        <SectionHeader
          id="not-eligible-heading"
          kicker="We checked. Here's why not."
          title="Not eligible"
          count={counts.notEligible}
          caption="Every one of these was actually evaluated. Expand any card to see the exact reason."
        />
        <div className="space-y-2">
          {groups.notEligible.map((match) => (
            <RejectedCard key={match.scholarship.id} match={match} />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" aria-labelledby="how-it-works-heading" className="mt-24 scroll-mt-28">
        <ClayPanel className="p-8 sm:p-10">
          <p className="kicker text-cobalt">How it works</p>
          <h2 id="how-it-works-heading" className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight text-ink">
            Know when to apply.
            <br />
            Know when not to.
          </h2>
          <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-muted">
            ELIGENT is honest in one direction: it won't start an application it
            knows you can't finish. Everything above was decided by official
            criteria — nothing guessed, nothing estimated.
          </p>
          <ol className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="flex items-start gap-3.5">
                <span
                  aria-hidden
                  className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-ink font-display text-[0.95rem] font-bold text-bg"
                >
                  {i + 1}
                </span>
                <div>
                  <p className="font-display text-[0.98rem] font-bold text-ink">{title}</p>
                  <p className="mt-1 text-[0.86rem] leading-relaxed text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </ClayPanel>
      </section>
    </div>
  );
}

function SectionHeader({
  id,
  kicker,
  title,
  count,
  caption,
}: {
  id: string;
  kicker: string;
  title: string;
  count: number;
  caption: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
      <div>
        <p className="kicker text-muted">{kicker}</p>
        <h2
          id={id}
          className="mt-1 font-display text-[1.7rem] font-bold tracking-tight text-ink sm:text-3xl"
        >
          {title} <span className="font-medium text-muted">· {count}</span>
        </h2>
      </div>
      <p className="max-w-sm text-[0.86rem] leading-relaxed text-muted">{caption}</p>
    </div>
  );
}