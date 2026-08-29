"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Criterion, Evaluation, Failed } from "@opportunity/engine";
import { Button } from "@/components/ui/button";
import { ReportButton } from "@/components/report-button";
import { apiSend } from "@/lib/api";
import { describeGap, failureReason, fieldLabel } from "@/lib/gap";
import type { Match } from "@/lib/types";

// The three verdicts are told apart by shape, not just by a badge colour:
// eligible leads with the action, near miss leads with the number, rejected
// leads with the quote. Status strings stay exactly as the engine emits them.

const TONE = {
  eligible: {
    label: "Eligible",
    card: "border-positive-border bg-positive-soft",
    badge: "bg-positive text-positive-foreground",
  },
  near_miss: {
    label: "Near miss",
    card: "border-attention-border bg-attention-soft",
    badge: "bg-attention text-attention-foreground",
  },
  rejected: {
    label: "Not eligible",
    card: "border-neutral-border bg-neutral-soft",
    badge: "bg-neutral text-neutral-foreground",
  },
} satisfies Record<Evaluation["status"], { label: string; card: string; badge: string }>;

/** The deadline column is a date string or null, and may not parse. */
function deadlineLabel(deadline: string | null | undefined): string | null {
  if (!deadline) return null;
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return deadline;
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** "scholarships.reliancefoundation.org", or null if the URL is missing/unparseable. */
function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

interface ClauseGroup {
  clause: string | null;
  items: Failed[];
}

/**
 * One sentence on the page can disqualify on several counts at once — the
 * Reliance PG clause states both the year and the CGPA. Printing the same quote
 * once per failure reads like a bug, so failures are grouped under their quote.
 */
function groupByClause(failed: Failed[], criteria: Criterion[] | null | undefined): ClauseGroup[] {
  const groups: ClauseGroup[] = [];
  for (const f of failed) {
    const clause = clauseFor(f, criteria);
    const existing = clause ? groups.find((g) => g.clause === clause) : undefined;
    if (existing) existing.items.push(f);
    else groups.push({ clause, items: [f] });
  }
  return groups;
}

/** Pairs a failure back to the verbatim quote the API sent alongside it. */
function clauseFor(failed: Failed, criteria: Criterion[] | null | undefined): string | null {
  if (!Array.isArray(criteria)) return null;
  const match = criteria.find(
    (c) => c?.field === failed.field && (!failed.displayText || c?.display_text === failed.displayText),
  );
  const quote = match?.source_text?.trim();
  return quote ? quote : null;
}

function Badge({ status }: { status: Evaluation["status"] }) {
  const tone = TONE[status];
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${tone.badge}`}>
      {tone.label}
    </span>
  );
}

function Meta({ match }: { match: Match }) {
  const { opportunity } = match;
  const deadline = deadlineLabel(opportunity?.deadline);
  // amount is TEXT in the schema ("Up to 2,00,000") — printed verbatim.
  const bits = [opportunity?.provider, opportunity?.amount, deadline ? `Closes ${deadline}` : null].filter(
    Boolean,
  ) as string[];
  return (
    <p className="text-sm text-muted-foreground">
      {bits.length > 0 ? bits.join(" · ") : "Details on the provider's page"}
    </p>
  );
}

function Actions({
  match,
  primary,
}: {
  match: Match;
  primary?: React.ReactNode;
}) {
  const url = match.opportunity?.url ?? null;
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {primary}
      {url ? (
        <Button size="touch" variant="outline" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            Official page
          </a>
        </Button>
      ) : null}
      {match.opportunity?.id ? <ReportButton opportunityId={match.opportunity.id} /> : null}
    </div>
  );
}

export function MatchCard({ match }: { match: Match }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const opportunity = match?.opportunity;
  const evaluation = match?.evaluation;
  // A row could arrive without its joined opportunity, or with no evaluation.
  if (!opportunity?.id || !evaluation?.status) return null;

  const status = evaluation.status;
  const tone = TONE[status] ?? TONE.rejected;
  const failed = Array.isArray(evaluation.failed) ? evaluation.failed : [];
  const passed = Array.isArray(evaluation.passed) ? evaluation.passed : [];

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

  const gaps = failed.map((f) => ({ failed: f, parts: describeGap(f) }));
  const numericGaps = gaps.filter((g) => g.parts !== null);

  return (
    <article className={`rounded-lg border p-5 sm:p-6 ${tone.card}`}>
      {/* ---------------- ELIGIBLE: the action is the hero ---------------- */}
      {status === "eligible" ? (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h3 className="text-xl font-semibold leading-tight sm:text-2xl">{opportunity.name}</h3>
              <Meta match={match} />
            </div>
            <Badge status={status} />
          </div>
          <p className="text-base font-medium text-positive">
            You meet {passed.length === 1 ? "the one stated criterion" : `all ${passed.length} stated criteria`}.
          </p>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Actions
            match={match}
            primary={
              <Button size="touch" onClick={startApplication} disabled={starting}>
                {starting ? "Opening…" : "Start application"}
              </Button>
            }
          />
        </div>
      ) : null}

      {/* ---------------- NEAR MISS: the gap is the hero ---------------- */}
      {status === "near_miss" ? (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-sm font-medium text-muted-foreground">{opportunity.name}</p>
            <Badge status={status} />
          </div>

          <div className="space-y-3">
            {numericGaps.map(({ failed: f, parts }, i) =>
              parts ? (
                <div key={`${f.field}-${i}`} className="space-y-0.5">
                  <p className="text-sm text-muted-foreground">
                    {parts.direction === "over" ? "The limit is" : "You need"}{" "}
                    <span className="font-medium text-foreground">{parts.need}</span>
                    {parts.have ? <> — you have {parts.have}</> : null}
                  </p>
                  <p className="text-3xl font-bold leading-tight tracking-tight text-attention sm:text-4xl">
                    {parts.delta}
                  </p>
                </div>
              ) : null,
            )}
            {/* A near miss can still carry a failure with no arithmetic. */}
            {gaps
              .filter((g) => g.parts === null)
              .map(({ failed: f }, i) => (
                <p key={`nogap-${f.field}-${i}`} className="text-sm">
                  <span className="font-medium">{f.displayText ?? fieldLabel(f.field)}</span> — {failureReason(f)}
                </p>
              ))}
          </div>

          <p className="rounded-md border border-attention-border/60 bg-background/60 px-3 py-2 text-sm">
            {numericGaps.length > 1 ? "Close both gaps" : "Close this gap"} and you qualify
            {opportunity.amount ? (
              <>
                {" "}
                for <span className="font-medium">{opportunity.amount}</span>
              </>
            ) : null}
            .
          </p>

          <Meta match={match} />
          <Actions match={match} />
        </div>
      ) : null}

      {/* ---------------- REJECTED: the clause is the hero ---------------- */}
      {status === "rejected" ? (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-sm font-medium text-muted-foreground">{opportunity.name}</p>
            <Badge status={status} />
          </div>

          <div className="space-y-4">
            {groupByClause(failed, match.criteria).map((group, i) => (
              <div key={`clause-${i}`} className="space-y-1.5">
                {group.clause ? (
                  <blockquote className="border-l-4 border-neutral-border pl-4 text-lg font-medium leading-snug text-foreground sm:text-xl">
                    &ldquo;{group.clause}&rdquo;
                  </blockquote>
                ) : (
                  <p className="border-l-4 border-neutral-border pl-4 text-base leading-snug">
                    {group.items[0]?.displayText ?? fieldLabel(group.items[0]?.field ?? "")}
                  </p>
                )}
                {/* One quote can rule you out on more than one count. */}
                <ul className="space-y-0.5 pl-4">
                  {group.items.map((f, j) => {
                    const parts = describeGap(f);
                    return (
                      <li key={`${f.field}-${j}`} className="text-sm text-muted-foreground">
                        {parts ? parts.sentence : failureReason(f)}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {hostOf(opportunity.url) ? (
            <p className="text-xs text-muted-foreground">
              Quoted from{" "}
              <a
                href={opportunity.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {hostOf(opportunity.url)}
              </a>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Quoted from the scholarship&rsquo;s own page.</p>
          )}

          <Meta match={match} />
          <Actions match={match} />
        </div>
      ) : null}
    </article>
  );
}
