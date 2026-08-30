"use client";

import { useState } from "react";
import { Clock, FileWarning, ShieldX } from "lucide-react";
import {
  ExtensionPopup,
  ExtensionSwitcher,
  type ExtensionState,
} from "@/components/behavior/extension-popup";

const MOMENTS: Array<{
  variant: ExtensionState;
  icon: typeof Clock;
  title: string;
  body: string;
}> = [
  {
    variant: "restored",
    icon: Clock,
    title: "Progress restored",
    body: "Mid-form, closed the tab? ELIGENT restores every field you'd already filled — nothing lost.",
  },
  {
    variant: "document-needed",
    icon: FileWarning,
    title: "An unexpected document",
    body: "The portal asks for something not on the official list. ELIGENT flags it and tells you the next step.",
  },
  {
    variant: "not-eligible",
    icon: ShieldX,
    title: "The refusal",
    body: "Criteria don't match? ELIGENT refuses to fill the form — and tells you exactly why.",
  },
];

export default function ExtensionPage() {
  const [variant, setVariant] = useState<ExtensionState>("document-needed");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <p className="kicker text-cobalt">ELIGENT for Chrome</p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl">
          Wins time back at the moment it matters most.
        </h1>
        <p className="mt-5 max-w-xl text-[1.02rem] leading-relaxed text-muted">
          A reusable popup that lives on the real scholarship portal.
          It restores your form, warns you about documents that aren't in the
          official requirements, and refuses to help when you don't qualify.
        </p>
      </div>

      <div className="mt-10">
        <ExtensionSwitcher variant={variant} onChange={setVariant} />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[360px_1fr] lg:items-start">
        <div>
          <div className="hash-bg rounded-3xl border border-line bg-sand/60 p-6 sm:p-8 lg:p-10">
            <div className="mx-auto w-fit">
              <ExtensionPopup variant={variant} />
            </div>
          </div>
          <p className="mt-4 text-center text-[0.8rem] text-soft lg:text-left">
            Popup width 360px — sized for the browser toolbar, not a phone.
          </p>
        </div>

        <div className="space-y-3">
          {MOMENTS.map((m) => (
            <button
              key={m.variant}
              type="button"
              onClick={() => setVariant(m.variant)}
              aria-pressed={variant === m.variant}
              className={`block w-full rounded-2xl border p-5 text-left transition-all ${
                variant === m.variant
                  ? "border-cobalt bg-cobalt-tint/70 shadow-[var(--shadow-clay-sm)]"
                  : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                    variant === m.variant
                      ? "bg-cobalt text-white"
                      : "bg-sand text-muted"
                  }`}
                >
                  <m.icon size={17} aria-hidden />
                </span>
                <div>
                  <p className="font-display font-bold text-ink">{m.title}</p>
                  <p className="mt-1 text-[0.88rem] leading-relaxed text-muted">
                    {m.body}
                  </p>
                </div>
              </div>
            </button>
          ))}

          <div className="rounded-2xl border border-lime-dark/40 bg-lime-tint px-5 py-4">
            <p className="text-[0.88rem] font-semibold leading-relaxed text-lime-ink">
              ELIGENT is honest: if you don't qualify, it won't fill the form.
              That's the whole point of ₹99 — it protects the hours Apply Mode
              would have spent on an application that can never finish.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}