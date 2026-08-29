"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Evaluation } from "@opportunity/engine";
import { Button } from "@/components/ui/button";
import { MatchCard } from "@/components/match-card";
import { MatchesSkeleton } from "@/components/skeletons";
import { apiGet, isAuthError, isMissingProfileError } from "@/lib/api";
import type { Match, Matches } from "@/lib/types";

const EMPTY: Matches = { eligible: [], near_miss: [], rejected: [] };

// Order and copy for the three buckets. Keys are the engine's own status
// strings and are never renamed or mapped back into logic.
const SECTIONS: Array<{
  key: Evaluation["status"];
  title: string;
  blurb: string;
  empty: string;
}> = [
  {
    key: "eligible",
    title: "Eligible",
    blurb: "You meet every criterion these list. Worth your time.",
    empty: "Nothing you fully qualify for yet — the near misses below show exactly what would change that.",
  },
  {
    key: "near_miss",
    title: "Near miss",
    blurb: "Close enough to be worth knowing the number.",
    empty: "No near misses. You are either clearly in or clearly out on everything here.",
  },
  {
    key: "rejected",
    title: "Not eligible",
    blurb: "Ruled out, with the clause that does it — quoted from the scholarship's own page.",
    empty: "Nothing ruled out. That is a good problem to have.",
  },
];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">{children}</div>
    </main>
  );
}

/** "6 eligible · 4 near miss · 33 rejected" — the headline number. */
function CountSummary({ matches }: { matches: Matches }) {
  const counts: Array<{ key: Evaluation["status"]; n: number; label: string; tone: string }> = [
    { key: "eligible", n: matches.eligible.length, label: "eligible", tone: "text-positive" },
    { key: "near_miss", n: matches.near_miss.length, label: "near miss", tone: "text-attention" },
    { key: "rejected", n: matches.rejected.length, label: "rejected", tone: "text-muted-foreground" },
  ];
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:gap-x-5">
      {counts.map((c, i) => (
        <span key={c.key} className="flex items-baseline gap-1.5">
          {i > 0 ? <span aria-hidden="true" className="pr-2 text-muted-foreground/50">·</span> : null}
          <span className={`text-3xl font-bold tabular-nums tracking-tight sm:text-4xl ${c.tone}`}>{c.n}</span>
          <span className="text-sm text-muted-foreground">{c.label}</span>
        </span>
      ))}
    </div>
  );
}

function Notice({
  title,
  body,
  action,
}: {
  title: string;
  body: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-8 text-center">
      <p className="font-medium">{title}</p>
      <div className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</div>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Matches>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNeedsProfile(false);
    try {
      const result = await apiGet<Matches>("/api/matches");
      if (!result.ok) {
        // No profile row yet. An explicit prompt, not a silent redirect that
        // leaves someone wondering why the page changed under them.
        if (!isAuthError(result.error) && isMissingProfileError(result.error)) {
          setNeedsProfile(true);
          return;
        }
        setError(result.error);
        return;
      }
      setNeedsProfile(false);
      const data = result.data;
      setMatches({
        eligible: Array.isArray(data?.eligible) ? data.eligible : [],
        near_miss: Array.isArray(data?.near_miss) ? data.near_miss : [],
        rejected: Array.isArray(data?.rejected) ? data.rejected : [],
      });
    } finally {
      // Always clears, on every path above.
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const total = matches.eligible.length + matches.near_miss.length + matches.rejected.length;

  return (
    <Shell>
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4 sm:mb-10">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your matches</h1>
          {loading ? (
            <div className="h-9 w-64 animate-pulse rounded bg-muted" aria-hidden="true" />
          ) : error || needsProfile ? null : (
            <>
              <CountSummary matches={matches} />
              <p className="text-sm text-muted-foreground">
                {total} scholarship{total === 1 ? "" : "s"} checked against your profile. No guessing —{" "}
                <Link href="/proof" className="underline underline-offset-2 hover:text-foreground">
                  here is the arithmetic
                </Link>
                .
              </p>
            </>
          )}
        </div>
        <Button variant="outline" size="touch" asChild>
          <Link href="/onboarding">Edit profile</Link>
        </Button>
      </header>

      {needsProfile && !loading ? (
        <Notice
          title="Finish your profile first."
          body="We need your marks, year and family income before we can check a single scholarship. It takes about a minute."
          action={
            <Button size="touch" asChild>
              <Link href="/onboarding">Complete your profile</Link>
            </Button>
          }
        />
      ) : null}

      {error ? (
        isAuthError(error) ? (
          <Notice
            title="You're signed out."
            body="Sign in again to see which scholarships you qualify for."
            action={
              <Button size="touch" asChild>
                <Link href="/">Sign in</Link>
              </Button>
            }
          />
        ) : (
          <Notice
            title="We couldn't load your matches."
            body={<span role="alert">{error}</span>}
            action={
              <Button variant="outline" size="touch" onClick={() => void load()}>
                Try again
              </Button>
            }
          />
        )
      ) : null}

      {loading && !error ? <MatchesSkeleton /> : null}

      {!loading && !error && !needsProfile && total === 0 ? (
        <Notice
          title="No scholarships have been loaded yet."
          body={
            <>
              This is not a filter — the database is empty, so there is nothing to check your profile against.
              Run the harvester, then{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">pnpm db:push</code> to load them.
            </>
          }
          action={
            <Button variant="outline" size="touch" onClick={() => void load()}>
              Check again
            </Button>
          }
        />
      ) : null}

      {!loading && !error && !needsProfile && total > 0 ? (
        <div className="space-y-10 sm:space-y-12">
          {SECTIONS.map((section) => {
            const items: Match[] = matches[section.key] ?? [];
            return (
              <section key={section.key} className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                    {section.title}{" "}
                    <span className="font-normal text-muted-foreground tabular-nums">({items.length})</span>
                  </h2>
                  <p className="text-sm text-muted-foreground">{section.blurb}</p>
                </div>
                {items.length === 0 ? (
                  <p className="rounded-lg border border-dashed px-5 py-6 text-center text-sm text-muted-foreground">
                    {section.empty}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {items.map((match, i) => (
                      <MatchCard key={match?.opportunity?.id ?? `${section.key}-${i}`} match={match} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : null}

      <footer className="mt-14 border-t pt-4 text-center text-xs text-muted-foreground">
        <Link
          href="/proof"
          className="inline-flex min-h-11 items-center px-3 underline underline-offset-2 hover:text-foreground"
        >
          How eligibility is decided
        </Link>
        <p className="pb-2">We never submit an application for you.</p>
      </footer>
    </Shell>
  );
}
