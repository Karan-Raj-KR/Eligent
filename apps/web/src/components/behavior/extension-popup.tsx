"use client";

import Link from "next/link";
import { AlertTriangle, CheckCheck, ShieldX, ArrowRight } from "lucide-react";
import { Logo } from "@/components/clay";
import { cn } from "@/lib/cn";

export type ExtensionState = "restored" | "document-needed" | "not-eligible";

interface ExtensionPopupProps {
  variant: ExtensionState;
  scholarshipTitle?: string;
}

const SCHOLARSHIP = "National Merit Scholarship";

/**
 * Reusable Chrome extension popup — 360px, visually ELIGENT.
 * Three moments: restored progress, an unexpected document, blocked eligibility.
 */
export function ExtensionPopup({
  variant,
  scholarshipTitle = SCHOLARSHIP,
}: ExtensionPopupProps) {
  return (
    <div
      className="w-[360px] overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-24px_rgba(23,21,37,0.4)]"
      aria-label={`ELIGENT extension — ${stateLabel(variant)}`}
    >
      <div className="flex items-center justify-between border-b border-line/80 bg-bg px-4 py-3">
        <Logo />
        <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold uppercase tracking-wide text-muted">
          <span aria-hidden className="size-1.5 rounded-full bg-lime" />
          Active
        </span>
      </div>

      <div className="px-4 py-4">
        {variant === "restored" && (
          <>
            <p className="text-[0.94rem] font-bold text-ink">{scholarshipTitle}</p>
            <p className="mt-2 font-display text-xl font-bold leading-snug text-ink">
              Application restored.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[0.9rem] font-semibold text-ink">
              <CheckCheck size={18} className="text-cobalt" aria-hidden />
              7 of 11 fields filled.
            </div>
            <p className="mt-1.5 pl-[26px] text-[0.78rem] text-muted">
              Your progress is safe — resume where you left off.
            </p>
            <button
              type="button"
              className="clay-btn clay-btn--primary mt-4 w-full !min-h-[42px] !text-[0.88rem]"
            >
              Resume filling
            </button>
          </>
        )}

        {variant === "document-needed" && (
          <div className="rounded-xl border border-coral/45 bg-coral-tint/60 p-4">
            <p className="text-[0.78rem] font-bold uppercase tracking-[0.12em] text-coral-deep">
              This portal is asking for
            </p>
            <p className="mt-1.5 font-display text-lg font-bold leading-snug text-ink">
              College Bonafide Certificate
            </p>
            <div className="mt-3 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-coral-deep" aria-hidden />
              <p className="text-[0.84rem] leading-relaxed text-ink">
                <strong>Not</strong> in the official requirements.
                <span className="mt-0.5 block font-semibold text-coral-deep">
                  Reported by 4 applicants.
                </span>
              </p>
            </div>
            <div className="mt-3 rounded-lg border border-coral/30 bg-surface px-3 py-2.5">
              <p className="text-[0.66rem] font-bold uppercase tracking-[0.12em] text-soft">
                You marked this as
              </p>
              <p className="font-display text-base font-bold text-coral-deep">
                Not available
              </p>
            </div>
            <p className="mt-3 text-[0.84rem] font-bold text-coral-deep">
              NEXT: Get this before continuing.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="clay-btn clay-btn--coral !min-h-[40px] !text-[0.84rem]"
              >
                Add to my checklist
              </button>
              <button
                type="button"
                className="clay-btn !min-h-[40px] !text-[0.84rem]"
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {variant === "not-eligible" && (
          <div className="flex flex-col items-start gap-3">
            <span
              aria-hidden
              className="grid size-11 place-items-center rounded-xl bg-coral-tint text-coral-deep"
            >
              <ShieldX size={22} />
            </span>
            <p className="font-display text-lg font-bold leading-snug text-ink">
              You're not eligible for this scholarship.
            </p>
            <p className="text-[0.88rem] leading-relaxed text-muted">
              Family income exceeds ₹3L.
            </p>
            <div className="rounded-lg border border-coral/30 bg-coral-tint/60 px-3.5 py-2.5">
              <p className="text-[0.84rem] font-semibold text-coral-deep">
                Eligent won't fill this form.
              </p>
            </div>
            <p className="text-[0.8rem] text-muted">
              We checked. You don't qualify. We're not going to waste your time.
            </p>
            <Link
              href="/matches"
              className={cn(
                "clay-btn clay-btn--primary w-full !min-h-[42px] !text-[0.88rem]",
              )}
            >
              See what you qualify for <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function stateLabel(variant: ExtensionState): string {
  switch (variant) {
    case "restored":
      return "Application restored";
    case "document-needed":
      return "Unexpected document required";
    case "not-eligible":
      return "Not eligible";
  }
}

export function ExtensionSwitcher({
  variant,
  onChange,
}: {
  variant: ExtensionState;
  onChange: (v: ExtensionState) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Extension states">
      {(
        [
          ["restored", "State A — restored"],
          ["document-needed", "State B — document"],
          ["not-eligible", "State C — blocked"],
        ] as Array<[ExtensionState, string]>
      ).map(([v, label]) => (
        <button
          key={v}
          type="button"
          aria-pressed={variant === v}
          onClick={() => onChange(v)}
          className={cn(
            "clay-btn !min-h-[38px] !px-3.5 !text-[0.84rem]",
            variant === v && "clay-btn--soft",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}