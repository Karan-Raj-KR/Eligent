"use client";

import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { ClayBadge, ClayButton, ClayCard } from "@/components/clay";
import { ErrorState } from "@/components/states";
import { inr, inrCompact } from "@/lib/format";

interface Breakdown { key: string; students: number; qualified: number }

interface Result {
  students: number;
  qualified: number;
  opportunities: number;
  totalAid: number;
  unpricedMatches: number;
  topOpportunities: Array<{ id: string; name: string; provider: string; amount: string | null; students: number }>;
  zeroMatch: number;
  topBlocker: { criterion: string; students: number } | null;
  byBranch: Breakdown[];
  byYear: Breakdown[];
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
    ["students qualifying for at least one opportunity", r.qualified],
    ["students with zero matches", r.zeroMatch],
    ["opportunities evaluated", r.opportunities],
    ["total aid value eligible for (INR)", r.totalAid],
    ["most common blocking criterion", r.topBlocker?.criterion ?? "n/a"],
    [],
    ["top opportunity", "provider", "amount", "qualifying students"],
    ...r.topOpportunities.map((o) => [o.name, o.provider, o.amount ?? "", o.students]),
    [],
    ["branch", "students", "qualifying"],
    ...r.byBranch.map((b) => [b.key, b.students, b.qualified]),
    [],
    ["year", "students", "qualifying"],
    ...r.byYear.map((b) => [b.key, b.students, b.qualified]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <ClayCard className="p-5">
      <p className="text-[0.8rem] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-space-grotesk)] text-3xl font-bold text-ink">{value}</p>
      {sub && <p className="mt-1 text-[0.82rem] text-muted">{sub}</p>}
    </ClayCard>
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
              <th className="py-1.5 font-medium">{title.includes("year") ? "Year" : "Branch"}</th>
              <th className="py-1.5 text-right font-medium">Students</th>
              <th className="py-1.5 text-right font-medium">Qualifying</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-black/5">
                <td className="py-1.5 text-ink">{r.key}</td>
                <td className="py-1.5 text-right tabular-nums text-muted">{r.students}</td>
                <td className="py-1.5 text-right tabular-nums font-semibold text-ink">{r.qualified}</td>
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

          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="Qualify for at least one"
              value={`${result.qualified} of ${result.students}`}
              sub={`across ${result.opportunities} opportunities`}
            />
            <Stat
              label="Total aid value eligible for"
              value={inrCompact(result.totalAid)}
              sub={
                result.unpricedMatches > 0
                  ? `${inr(result.totalAid)} · ${result.unpricedMatches} matches have no stated amount`
                  : inr(result.totalAid)
              }
            />
            <Stat
              label="Zero matches"
              value={String(result.zeroMatch)}
              sub={
                result.topBlocker
                  ? `Most common blocker: ${result.topBlocker.criterion} (${result.topBlocker.students})`
                  : undefined
              }
            />
          </div>

          <ClayCard className="p-5">
            <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-ink">
              Top 5 opportunities by qualifying students
            </h3>
            <ul className="mt-3 divide-y divide-black/5">
              {result.topOpportunities.map((o) => (
                <li key={o.id} className="flex items-baseline justify-between gap-4 py-2">
                  <span>
                    <span className="font-medium text-ink">{o.name}</span>{" "}
                    <span className="text-[0.85rem] text-muted">{o.provider}</span>
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold text-ink">{o.students}</span>
                </li>
              ))}
              {result.topOpportunities.length === 0 && (
                <li className="py-2 text-muted">No student qualified for any opportunity.</li>
              )}
            </ul>
          </ClayCard>

          <div className="grid gap-4 md:grid-cols-2">
            <BreakdownTable title="By branch" rows={result.byBranch} />
            <BreakdownTable title="By year" rows={result.byYear} />
          </div>
        </div>
      )}
    </div>
  );
}
