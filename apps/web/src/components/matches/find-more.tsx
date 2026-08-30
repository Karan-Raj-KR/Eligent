"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronDown, Loader2, Search, ShieldCheck } from "lucide-react";
import { ClayBadge, ClayButton, ClayCard } from "@/components/clay";
import { cn } from "@/lib/cn";
import { useEligent } from "@/components/provider";

interface Rejection {
  kind: "validator" | "unextractable";
  url: string;
  opportunity: string | null;
  field: string | null;
  reason: string;
}

interface Summary {
  added: number;
  eligible: number;
  nearMiss: number;
  rejected: number;
}

type Event =
  | { type: "step"; message: string }
  | ({ type: "rejected" } & Rejection)
  | { type: "added"; name: string; status: string }
  | ({ type: "done" } & Summary)
  | { type: "error"; message: string };

export function FindMore() {
  const { refresh } = useEligent();
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [rejections, setRejections] = useState<Rejection[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const started = useRef(false);

  const run = useCallback(async () => {
    if (started.current) return;
    started.current = true;
    setRunning(true);
    setSteps([]);
    setRejections([]);
    setSummary(null);
    setError(null);

    try {
      const res = await fetch("/api/discover", { method: "POST" });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? `Discovery failed (${res.status}).`);
        return;
      }

      // NDJSON: one event per line, rendered as it arrives.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let event: Event;
          try {
            event = JSON.parse(line) as Event;
          } catch {
            continue;
          }
          if (event.type === "step") setSteps((prev) => [...prev, event.message]);
          else if (event.type === "rejected") setRejections((prev) => [...prev, event]);
          else if (event.type === "error") setError(event.message);
          else if (event.type === "done") setSummary(event);
        }
      }

      // New rows are in the database — pull the buckets again so they update in place.
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed.");
    } finally {
      setRunning(false);
      started.current = false;
    }
  }, [refresh]);

  return (
    <ClayCard className="p-6 sm:p-7">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="font-display text-lg font-bold text-ink">Find more opportunities</p>
          <p className="mt-1 max-w-lg text-[0.88rem] leading-relaxed text-muted">
            Reads the configured sources, structures what each page says, and keeps only the
            criteria it can quote back word for word. Then checks them against your profile.
          </p>
        </div>
        <ClayButton
          variant="primary"
          onClick={() => void run()}
          disabled={running}
          icon={running ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          className="shrink-0"
        >
          {running ? "Searching…" : "Find more opportunities"}
        </ClayButton>
      </div>

      {(steps.length > 0 || error) && (
        <ol className="mt-5 space-y-1.5 border-t border-line pt-4" aria-live="polite">
          {steps.map((step, i) => (
            <li key={`${step}-${i}`} className="flex items-start gap-2 text-[0.86rem] text-muted">
              <span
                aria-hidden
                className={cn(
                  "mt-1.5 size-1.5 shrink-0 rounded-full",
                  i === steps.length - 1 && running ? "bg-cobalt" : "bg-line-strong",
                )}
              />
              {step}
            </li>
          ))}
          {error && (
            <li role="alert" className="pt-1 text-[0.86rem] font-semibold text-coral-deep">
              {error}
            </li>
          )}
        </ol>
      )}

      {summary && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ClayBadge tone={summary.added > 0 ? "lime" : "default"}>
            {summary.added} added
          </ClayBadge>
          {summary.eligible > 0 && <ClayBadge tone="cobalt">{summary.eligible} eligible</ClayBadge>}
          {summary.nearMiss > 0 && <ClayBadge tone="coral">{summary.nearMiss} near miss</ClayBadge>}
        </div>
      )}

      {rejections.length > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <button
            type="button"
            aria-expanded={logOpen}
            onClick={() => setLogOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="flex items-center gap-2 text-[0.88rem] font-semibold text-ink">
              <ShieldCheck size={16} className="shrink-0 text-cobalt" aria-hidden />
              {rejections.length} thing{rejections.length === 1 ? "" : "s"} we refused to act on
            </span>
            <ChevronDown
              size={16}
              aria-hidden
              className={cn("shrink-0 text-muted transition-transform", logOpen && "rotate-180")}
            />
          </button>

          {logOpen && (
            <>
              <p className="mt-2 text-[0.8rem] leading-relaxed text-soft">
                A rule only becomes a criterion when its exact sentence is on the page. These did not
                clear that bar, so nothing here influenced your results.
              </p>
              <ul className="mt-3 space-y-2">
                {rejections.map((r, i) => (
                  <li
                    key={`${r.url}-${r.field ?? r.reason}-${i}`}
                    className="rounded-xl border border-line bg-bg px-4 py-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <ClayBadge
                        tone={r.kind === "validator" ? "coral" : "default"}
                        className="!px-2 !py-0.5 !text-[0.68rem]"
                      >
                        {r.kind === "validator" ? "REJECTED BY VALIDATOR" : "NOT QUOTABLE"}
                      </ClayBadge>
                      <p className="text-[0.84rem] font-semibold text-ink">
                        {r.field ?? "stated on the page"}
                        {r.opportunity && (
                          <span className="font-medium text-muted"> · {r.opportunity}</span>
                        )}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-[0.82rem]",
                        r.kind === "validator" ? "text-coral-deep" : "text-muted",
                      )}
                    >
                      {r.kind === "validator" ? r.reason : `“${r.reason}” — could not be quoted verbatim`}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </ClayCard>
  );
}
