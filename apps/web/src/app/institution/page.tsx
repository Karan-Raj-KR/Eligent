"use client";

import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { ClayBadge, ClayButton, ClayCard } from "@/components/clay";
import { ErrorState } from "@/components/states";
import { inr, inrCompact } from "@/lib/format";
import { cn } from "@/lib/cn";

interface Breakdown { key: string; students: number; qualified: number }
interface OppRow { id: string; name: string; provider: string; amount: string | null; students: number }

interface Result {
  students: number;
  catalogue: {
    total: number;
    funded: number;
    open: number;
    unverified: number;
    fundedWithoutAmount: number;
  };
  funded: {
    qualified: number;
    totalAid: number;
    studentsWithUnpricedBest: number;
    topOpportunities: OppRow[];
    mostMissed: { name: string; nearMiss: number; eligible: number } | null;
    withinCgpaReach: number;
    cgpaReach: number;
    withinPercentageReach: number;
    percentageReach: number;
  };
  open: {
    qualified: number;
    topOpportunities: OppRow[];
    blockingFields: string[];
  };
  qualifiedNothing: number;
  topBlocker: { criterion: string; students: number } | null;
  byBranch: Breakdown[];
  byYear: Breakdown[];
  breakdownIsFlat: boolean;
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(r: Result): string {
  const rows: Array<Array<string | number>> = [
    ["metric", "value"],
    ["students", r.students],
    ["funded opportunities scored", r.catalogue.funded],
    ["open opportunities scored", r.catalogue.open],
    ["excluded — no published criteria", r.catalogue.unverified],
    [],
    ["students qualifying for at least one FUNDED opportunity", r.funded.qualified],
    ["total aid value (highest single award per qualifying student, INR)", r.funded.totalAid],
    ["qualifying students whose best award has no published amount", r.funded.studentsWithUnpricedBest],
    ["funded opportunities with no parseable amount", r.catalogue.fundedWithoutAmount],
    [`students within ${r.funded.cgpaReach} CGPA of qualifying`, r.funded.withinCgpaReach],
    [`students within ${r.funded.percentageReach} percentage points of qualifying`, r.funded.withinPercentageReach],
    [],
    ["students qualifying for at least one OPEN opportunity", r.open.qualified],
    [],
    ["students qualifying for NOTHING", r.qualifiedNothing],
    ["most common blocking criterion", r.topBlocker?.criterion ?? "n/a"],
    ["students blocked by it", r.topBlocker?.students ?? 0],
    [],
    ["most missed opportunity", r.funded.mostMissed?.name ?? "n/a"],
    ["  students who nearly qualify", r.funded.mostMissed?.nearMiss ?? 0],
    ["  students who qualify", r.funded.mostMissed?.eligible ?? 0],
    [],
    ["top funded opportunity", "provider", "amount", "qualifying students"],
    ...r.funded.topOpportunities.map((o) => [o.name, o.provider, o.amount ?? "", o.students]),
    [],
    ["top open opportunity", "provider", "qualifying students"],
    ...r.open.topOpportunities.map((o) => [o.name, o.provider, o.students]),
    [],
    ["branch", "students", "qualifying (funded)"],
    ...r.byBranch.map((b) => [b.key, b.students, b.qualified]),
    [],
    ["year", "students", "qualifying (funded)"],
    ...r.byYear.map((b) => [b.key, b.students, b.qualified]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

function Stat({
  label,
  value,
  sub,
  formula,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  /** Shown on hover and focus — a number this size has to show its working. */
  formula?: string;
  tone?: "coral";
}) {
  return (
    <ClayCard className="p-5" tone={tone}>
      <p
        className={cn(
          "text-[0.8rem] font-medium uppercase tracking-wide text-muted",
          formula && "cursor-help underline decoration-dotted decoration-line-strong underline-offset-4",
        )}
        title={formula}
        tabIndex={formula ? 0 : undefined}
      >
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-space-grotesk)] text-3xl font-bold text-ink">{value}</p>
      {sub && <p className="mt-1 text-[0.82rem] leading-relaxed text-muted">{sub}</p>}
      {formula && <p className="mt-2 text-[0.72rem] leading-relaxed text-soft">{formula}</p>}
    </ClayCard>
  );
}

/** One opportunity list, shared by the funded and open blocks. */
function OppList({ rows, empty }: { rows: OppRow[]; empty: string }) {
  return (
    <ul className="mt-3 divide-y divide-black/5">
      {rows.map((o) => (
        <li key={o.id} className="flex items-baseline justify-between gap-4 py-2">
          <span>
            <span className="font-medium text-ink">{o.name}</span>{" "}
            <span className="text-[0.85rem] text-muted">{o.provider}</span>
          </span>
          <span className="shrink-0 tabular-nums font-semibold text-ink">{o.students}</span>
        </li>
      ))}
      {rows.length === 0 && <li className="py-2 text-muted">{empty}</li>}
    </ul>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: Breakdown[] }) {
  return (
    <ClayCard className="p-5">
      <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-ink">{title}</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-[0.9rem]">
          <thead>
            <tr className="text-[0.78rem] uppercase tracking-wide text-muted">
              <th className="py-1.5 font-medium">{title.toLowerCase().includes("year") ? "Year" : "Branch"}</th>
              <th className="py-1.5 text-right font-medium">Students</th>
              <th className="py-1.5 text-right font-medium">Qualifying</th>
              <th className="py-1.5 text-right font-medium">Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-black/5">
                <td className="py-1.5 text-ink">{r.key}</td>
                <td className="py-1.5 text-right tabular-nums text-muted">{r.students}</td>
                <td className="py-1.5 text-right tabular-nums font-semibold text-ink">{r.qualified}</td>
                <td className="py-1.5 text-right tabular-nums text-muted">
                  {r.students === 0 ? "—" : `${Math.round((r.qualified / r.students) * 100)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ClayCard>
  );
}

export default function InstitutionPage() {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(csv: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/institution", { method: "POST", body: csv });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      setResult(json as Result);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function runSample() {
    const res = await fetch("/institution-sample.csv");
    await run(await res.text());
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <ClayBadge tone="default">Sample data — 200 synthetic profiles</ClayBadge>
      <h1 className="mt-4 font-[family-name:var(--font-space-grotesk)] text-4xl font-bold text-ink">
        How many of your students qualify?
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Upload a roster and we run the same eligibility engine students use, across every opportunity
        in the catalogue. Results are aggregate only — no student is named or stored.
      </p>

      <ClayCard className="mt-8 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <label className="clay-btn clay-btn--primary cursor-pointer">
            <Upload className="size-4" />
            {busy ? "Running…" : "Upload CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) await run(await file.text());
              }}
            />
          </label>
          <ClayButton variant="soft" onClick={runSample} disabled={busy}>
            Try the 200-profile sample
          </ClayButton>
          <a className="clay-btn clay-btn--ghost" href="/institution-template.csv" download>
            <Download className="size-4" />
            Template
          </a>
        </div>
        <p className="mt-4 text-[0.84rem] text-muted">
          Columns: name, cgpa, percentage, year, branch, state, family_income, institution_type, gender.
          Names are ignored — nothing per-student is shown or saved.
        </p>
      </ClayCard>

      {error && <div className="mt-8"><ErrorState title="Could not process that file." body={error} onRetry={runSample} /></div>}

      {result && (
        <div className="mt-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-ink">Results</h2>
            <ClayButton
              variant="soft"
              icon={<Download className="size-4" />}
              onClick={() => download("eligent-institution-summary.csv", toCsv(result))}
            >
              Export CSV
            </ClayButton>
          </div>

          {/* ---------------------------------------------- the headline */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="Qualify for funding"
              value={`${result.funded.qualified} of ${result.students}`}
              sub={`students eligible for at least one of ${result.catalogue.funded} funded opportunities`}
            />
            <Stat
              label="Aid unlocked"
              value={inrCompact(result.funded.totalAid)}
              sub={inr(result.funded.totalAid)}
              formula="Sum of the highest award each qualifying student is eligible for. One award per student — never stacked, never a hackathon prize pool."
            />
            <Stat
              tone={result.qualifiedNothing > 0 ? "coral" : undefined}
              label="Qualify for nothing"
              value={String(result.qualifiedNothing)}
              sub={
                result.topBlocker
                  ? `Most common blocker: ${result.topBlocker.criterion} — ${result.topBlocker.students} of them`
                  : "Every student matched something."
              }
            />
          </div>

          {/* ------------------------------------------- what to act on */}
          <div className="grid gap-4 md:grid-cols-2">
            <ClayCard className="p-5" topAccent="cobalt">
              <p className="text-[0.8rem] font-medium uppercase tracking-wide text-muted">Most missed opportunity</p>
              {result.funded.mostMissed ? (
                <>
                  <p className="mt-2 font-[family-name:var(--font-space-grotesk)] text-xl font-bold leading-snug text-ink">
                    {result.funded.mostMissed.name}
                  </p>
                  <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">
                    <strong className="text-ink">{result.funded.mostMissed.nearMiss} students</strong> sit one
                    criterion outside it — more than for any other funded opportunity — while{" "}
                    <strong className="text-ink">{result.funded.mostMissed.eligible}</strong> already qualify. The
                    biggest group a single policy change would reach.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-[0.88rem] text-muted">
                  No opportunity has more near-misses than qualifiers.
                </p>
              )}
            </ClayCard>

            <ClayCard className="p-5" topAccent="coral">
              <p className="text-[0.8rem] font-medium uppercase tracking-wide text-muted">Within reach</p>
              <p className="mt-2 font-[family-name:var(--font-space-grotesk)] text-3xl font-bold text-ink">
                {result.funded.withinPercentageReach || result.funded.withinCgpaReach}
              </p>
              {result.funded.withinPercentageReach > 0 || result.funded.withinCgpaReach === 0 ? (
                <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">
                  students are within{" "}
                  <strong className="text-ink">{result.funded.percentageReach} percentage points</strong> of qualifying
                  for a funded opportunity — their marks are the only thing stopping them.
                  {result.funded.withinCgpaReach === 0 && (
                    <span className="mt-1 block text-[0.8rem] text-soft">
                      Measured in percentage, not CGPA: every funded opportunity in this catalogue publishes its
                      academic bar as a percentage. ({result.funded.withinCgpaReach} students are within{" "}
                      {result.funded.cgpaReach} CGPA.)
                    </span>
                  )}
                </p>
              ) : (
                <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">
                  students are within <strong className="text-ink">{result.funded.cgpaReach} CGPA</strong> of
                  qualifying for a funded opportunity — CGPA is the only thing stopping them.
                </p>
              )}
            </ClayCard>
          </div>

          {/* ------------------------------------------------ funded block */}
          <ClayCard className="p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-ink">
                Funded opportunities
              </h3>
              <p className="text-[0.8rem] text-soft">
                scholarships, fellowships and grants · {result.catalogue.funded} scored
              </p>
            </div>
            <OppList rows={result.funded.topOpportunities} empty="No student qualified for a funded opportunity." />
          </ClayCard>

          {/* -------------------------------------------------- open block */}
          <ClayCard className="p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-ink">
                Open opportunities
              </h3>
              <p className="text-[0.8rem] text-soft">
                hackathons, competitions and programmes · {result.catalogue.open} scored · no aid value
              </p>
            </div>
            <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">
              <strong className="text-ink">{result.open.qualified} of {result.students}</strong> students qualify for at
              least one. Prize pools are not aid and are never counted above.
            </p>
            {result.open.qualified === 0 && result.open.blockingFields.length > 0 && (
              <p className="mt-2 text-[0.8rem] leading-relaxed text-soft">
                Zero here is a gap in the roster, not a verdict on these students: these opportunities are gated on{" "}
                {result.open.blockingFields.join(", ").replace(/_/g, " ")} — fields a roster CSV does not carry. A
                missing value is treated as a failure rather than a guess, so nobody is told they qualify on data we
                do not have.
              </p>
            )}
            <OppList rows={result.open.topOpportunities} empty="No student qualified for an open opportunity." />
          </ClayCard>

          {result.breakdownIsFlat && (
            <ClayCard tone="coral" className="p-5">
              <p className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-ink">
                Every branch and year returned the same qualifying rate.
              </p>
              <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">
                That is not a finding about these students — it means the criteria in the catalogue are not
                discriminating between them. Treat the breakdown below as unreliable until the underlying
                eligibility data is fixed.
              </p>
            </ClayCard>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <BreakdownTable title="By branch" rows={result.byBranch} />
            <BreakdownTable title="By year" rows={result.byYear} />
          </div>

          {/* The disclosure that keeps every number above honest. */}
          <div className="border-t border-line pt-5 text-[0.8rem] leading-relaxed text-soft">
            {result.catalogue.unverified > 0 && (
              <p>
                {result.catalogue.unverified} opportunit
                {result.catalogue.unverified === 1 ? "y" : "ies"} in the catalogue{" "}
                {result.catalogue.unverified === 1 ? "has" : "have"} no published eligibility criteria and{" "}
                {result.catalogue.unverified === 1 ? "is" : "are"} excluded from these numbers. An opportunity with no
                criteria matches every student, which would tell you nothing.
              </p>
            )}
            {result.catalogue.fundedWithoutAmount > 0 && (
              <p className="mt-2">
                {result.catalogue.fundedWithoutAmount} funded opportunit
                {result.catalogue.fundedWithoutAmount === 1 ? "y publishes" : "ies publish"} no parseable award amount
                and {result.catalogue.fundedWithoutAmount === 1 ? "is" : "are"} excluded from the aid figure.
                {result.funded.studentsWithUnpricedBest > 0 && (
                  <>
                    {" "}
                    {result.funded.studentsWithUnpricedBest} qualifying student
                    {result.funded.studentsWithUnpricedBest === 1 ? "" : "s"} contribute
                    {result.funded.studentsWithUnpricedBest === 1 ? "s" : ""} ₹0 as a result — the real figure is
                    higher, never lower.
                  </>
                )}
              </p>
            )}
            <p className="mt-2">
              {result.catalogue.funded + result.catalogue.open} of {result.catalogue.total} opportunities were scored.
              Aggregate only — no student is named, stored, or shown.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
