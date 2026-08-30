"use client";

import { useEffect, useId, useState } from "react";
import { Check, X } from "lucide-react";
import { ClayButton } from "@/components/clay";
import { cn } from "@/lib/cn";
import type { ReportTopic } from "@/lib/types";

const TOPICS: ReportTopic[] = [
  "The deadline was wrong",
  "It asked for a document that wasn't listed",
  "There was a file size or format limit",
  "The criteria didn't match what was listed",
  "Applications are closed",
  "Something else",
];

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  scholarshipTitle: string;
  onSubmit: (topic: ReportTopic, details: string) => void;
  existingReportCount: number;
}

export function ReportModal({
  open,
  onClose,
  scholarshipTitle,
  onSubmit,
  existingReportCount,
}: ReportModalProps) {
  if (!open) return null;
  return (
    <ReportDialog
      onClose={onClose}
      scholarshipTitle={scholarshipTitle}
      onSubmit={onSubmit}
      existingReportCount={existingReportCount}
    />
  );
}

function ReportDialog({
  onClose,
  scholarshipTitle,
  onSubmit,
  existingReportCount,
}: Omit<ReportModalProps, "open">) {
  const [topic, setTopic] = useState<ReportTopic | null>(null);
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="clay w-full max-w-lg rounded-b-none p-6 sm:rounded-b-[22px] sm:p-7">
        {submitted ? (
          <div className="flex flex-col items-start gap-5 py-4">
            <span
              aria-hidden
              className="grid size-12 place-items-center rounded-2xl bg-lime text-lime-ink"
            >
              <Check size={24} strokeWidth={3} />
            </span>
            <h2 id={titleId} className="font-display text-2xl font-bold text-ink">
              Thanks.
            </h2>
            <p className="max-w-sm text-[0.98rem] leading-relaxed text-muted">
              The next student applying to this opportunity will see it.
            </p>
            <ClayButton variant="soft" onClick={onClose}>
              Close
            </ClayButton>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="kicker text-coral">Report what happened</p>
                <h2 id={titleId} className="mt-2 font-display text-2xl font-bold text-ink">
                  What happened?
                </h2>
                <p className="mt-1 text-[0.88rem] text-muted">{scholarshipTitle}</p>
              </div>
              <button
                type="button"
                aria-label="Close report dialog"
                onClick={onClose}
                className="clay-btn !min-h-[38px] !w-[38px] !px-0"
              >
                <X size={16} />
              </button>
            </div>

            <div
              role="radiogroup"
              aria-label="Choose what happened"
              className="mt-6 grid gap-2"
            >
              {TOPICS.map((t) => {
                const active = topic === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTopic(t)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-4 py-3 text-left text-[0.92rem] font-medium transition-colors",
                      active
                        ? "border-cobalt bg-cobalt-tint text-ink"
                        : "border-line bg-surface text-ink hover:border-line-strong",
                    )}
                  >
                    {t}
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-5 place-items-center rounded-full border-2",
                        active ? "border-cobalt bg-cobalt text-white" : "border-line-strong",
                      )}
                    >
                      {active && <Check size={12} strokeWidth={3.5} />}
                    </span>
                  </button>
                );
              })}
            </div>

            <label htmlFor="report-details" className="mt-5 block text-[0.86rem] font-semibold text-ink">
              Add details <span className="font-medium text-soft">(optional)</span>
            </label>
            <textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="What exactly happened when you tried?"
              className="clay-input mt-2 !min-h-[92px] resize-none"
            />

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[0.8rem] text-soft">
                {existingReportCount > 0
                  ? `${existingReportCount} applicant${existingReportCount === 1 ? "" : "s"} already reported this.`
                  : "No reports for this opportunity yet."}
              </p>
              <ClayButton
                variant="primary"
                disabled={!topic}
                onClick={() => {
                  if (topic) onSubmit(topic, details.trim());
                  setSubmitted(true);
                }}
              >
                Submit report
              </ClayButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}