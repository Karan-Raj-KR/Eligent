"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Criterion, Evaluation, Failed } from "@opportunity/engine";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReportButton } from "@/components/report-button";
import { apiGet, apiSend, isAuthError } from "@/lib/api";
import { failureReason, gapSentence, profileValueLabel } from "@/lib/gap";
import type { Match, Matches, Opportunity } from "@/lib/types";

const EMPTY: Matches = { eligible: [], near_miss: [], rejected: [] };

const SECTIONS = [
  {
    key: "eligible" as const,
    title: "Eligible",
    blurb: "You meet every stated criterion.",
    empty: "Nothing here yet. Near misses below show exactly what would change that.",
  },
  {
    key: "near_miss" as const,
    title: "Near miss",
    blurb: "One or two numbers away — here is the exact distance.",
    empty: "No near misses. You are either clearly in or clearly out on everything below.",
  },
  {
    key: "rejected" as const,
    title: "Not eligible",
    blurb: "With the clause that rules you out, quoted from the scholarship's own page.",
    empty: "Nothing ruled out. That is a good problem to have.",
  },
];

/** The deadline column is a date string or null, and may not parse. */
function deadlineLabel(deadline: string | null): string | null {
  if (!deadline) return null;
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return deadline;
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * The engine's Failed entries carry display_text but not the verbatim quote, so
 * pair them back up with the criteria the API sent alongside.
 */
function clauseFor(failed: Failed, criteria: Criterion[]): string | null {
  const match = criteria.find(
    (c) => c.field === failed.field && (!failed.displayText || c.display_text === failed.displayText),
  );
  const quote = match?.source_text?.trim();
  return quote ? quote : null;
}

function StatusBadge({ status }: { status: Evaluation["status"] }) {
  const styles: Record<Evaluation["status"], string> = {
    eligible: "bg-primary text-primary-foreground",
    near_miss: "border border-primary text-primary",
    rejected: "bg-muted text-muted-foreground",
  };
  const labels: Record<Evaluation["status"], string> = {
    eligible: "Eligible",
    near_miss: "Near miss",
    rejected: "Not eligible",
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function MatchCard({ match }: { match: Match }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { opportunity, evaluation, criteria } = match;

  // Defensive: a row could arrive without the joined opportunity.
  if (!opportunity?.id) return null;

  const deadline = deadlineLabel(opportunity.deadline);
  const gaps = evaluation.failed.filter((f) => f.gap);
  const blockers = evaluation.failed.filter((f) => !f.gap);

  async function startApplication() {
    setStarting(true);
    setError(null);
    try {
      const result = await apiSend<{ application?: { id?: string } }>("/api/application", "POST", {
        opportunity_id: opportunity.id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const id = result.data?.application?.id;
      if (!id) {
        setError("The application was created but we got no id back.");
        return;
      }
      router.push(`/application/${id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="font-semibold leading-tight">{opportunity.name}</h3>
            <p className="text-sm text-muted-foreground">
              {/* amount is TEXT in the schema — printed verbatim, never formatted as a number. */}
              {[opportunity.provider, opportunity.amount].filter(Boolean).join(" · ") || "Details on the provider's page"}
            </p>
            {deadline ? <p className="text-xs text-muted-foreground">Closes {deadline}</p> : null}
          </div>
          <StatusBadge status={evaluation.status} />
        </div>

        {gaps.length > 0 ? (
          <ul className="space-y-1.5 rounded-md bg-muted/50 p-3 text-sm">
            {gaps.map((failed, i) => {
              const sentence = gapSentence(failed);
              const have = profileValueLabel(failed);
              return (
                <li key={`${failed.field}-${i}`}>
                  <span className="font-medium">{failed.displayText ?? failed.field}</span>
                  {sentence ? <> — you are {sentence}</> : null}
                  {have ? <span className="text-muted-foreground"> (you have {have})</span> : null}
                </li>
              );
            })}
          </ul>
        ) : null}

        {blockers.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {blockers.map((failed, i) => {
              const clause = clauseFor(failed, criteria);
              return (
                <li key={`${failed.field}-${i}`} className="space-y-1">
                  <p className="font-medium">{failed.displayText ?? failed.field}</p>
                  {clause ? (
                    <blockquote className="border-l-2 pl-3 text-muted-foreground italic">
                      &ldquo;{clause}&rdquo;
                    </blockquote>
                  ) : (
                    <p className="text-muted-foreground">{failureReason(failed)}</p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {evaluation.status === "eligible" ? (
            <Button size="sm" onClick={startApplication} disabled={starting}>
              {starting ? "Opening…" : "Start application"}
            </Button>
          ) : null}
          {opportunity.url ? (
            <Button size="sm" variant="outline" asChild>
              <a href={opportunity.url} target="_blank" rel="noopener noreferrer">
                Open the official page
              </a>
            </Button>
          ) : null}
          <ReportButton opportunityId={opportunity.id} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function MatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Matches>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<Matches>("/api/matches");
      if (!result.ok) {
        // The route returns this when no profile row exists yet.
        if (/onboarding/i.test(result.error)) {
          router.push("/onboarding");
          return;
        }
        setError(result.error);
        return;
      }
      setMatches({ ...EMPTY, ...result.data });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = matches.eligible.length + matches.near_miss.length + matches.rejected.length;

  return (
    <main className="min-h-screen p-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Your matches</h1>
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Checking every scholarship against your profile…"
                : `${total} scholarship${total === 1 ? "" : "s"} checked against your profile.`}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/onboarding">Edit profile</Link>
          </Button>
        </div>

        {error ? (
          <Card>
            <CardContent className="space-y-3 p-6 text-center">
              {isAuthError(error) ? (
                <>
                  <p className="font-medium">You&rsquo;re signed out.</p>
                  <p className="text-sm text-muted-foreground">Sign in again to see your matches.</p>
                  <Button size="sm" asChild>
                    <Link href="/">Sign in</Link>
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => void load()}>
                    Try again
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : null}

        {loading ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">Loading…</CardContent>
          </Card>
        ) : null}

        {!loading && !error && total === 0 ? (
          <Card>
            <CardContent className="space-y-2 p-6 text-center">
              <p className="font-medium">No scholarships loaded yet.</p>
              <p className="text-sm text-muted-foreground">
                The database has no opportunities in it. Run the harvester and{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">pnpm db:push</code> to load them.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {!loading && !error && total > 0
          ? SECTIONS.map((section) => {
              const items = matches[section.key] ?? [];
              return (
                <section key={section.key} className="space-y-3">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold">
                      {section.title}{" "}
                      <span className="text-base font-normal text-muted-foreground">({items.length})</span>
                    </h2>
                    <p className="text-sm text-muted-foreground">{section.blurb}</p>
                  </div>
                  {items.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center text-sm text-muted-foreground">
                        {section.empty}
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {items.map((match: Match) => (
                        <MatchCard key={(match.opportunity as Opportunity)?.id ?? Math.random()} match={match} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          : null}
      </div>
    </main>
  );
}
