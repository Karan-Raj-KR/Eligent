"use client";

import { useState } from "react";
import { Check, LockKeyhole, Rocket } from "lucide-react";
import { ClayBadge, ClayButton, ClayCard } from "@/components/clay";
import { PseudoQR } from "@/components/qr-code";

interface ApplyModeGateProps {
  unlocked: boolean;
  onUnlock: () => void;
  scholarshipTitle: string;
}

const BENEFITS = [
  "Requirement checklist — official and community-reported",
  "The extension fills the form on the real portal",
  "Knows which document is needed before you get stuck",
];

/**
 * ₹99 Apply Mode — the paid, "ready to submit" product.
 * Deliberately separate from free eligibility.
 */
export function ApplyModeGate({ unlocked, onUnlock, scholarshipTitle }: ApplyModeGateProps) {
  const [paidClicked, setPaidClicked] = useState(false);

  if (unlocked) {
    return (
      <ClayCard tone="lime" className="p-6 sm:p-8">
        <div className="flex flex-col items-start gap-5">
          <ClayBadge tone="lime" className="!px-3 !py-1.5 !text-[0.82rem]">
            <Check size={14} strokeWidth={3} aria-hidden />
            Apply Mode — unlocked forever
          </ClayBadge>
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
              You're ready to submit {scholarshipTitle}.
            </h2>
            <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-muted">
              Open the ELIGENT extension on the real portal. It will restore
              your progress and stop you before anything gets you stuck.
            </p>
          </div>
          <a href="/extension">
            <ClayButton variant="primary" icon={<Rocket size={17} />}>
              Open Apply Mode
            </ClayButton>
          </a>
        </div>
      </ClayCard>
    );
  }

  return (
    <ClayCard className="p-6 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
        <div className="space-y-5">
          <ClayBadge tone="coral" className="!px-3 !py-1.5 !text-[0.82rem]">
            <LockKeyhole size={13} aria-hidden />
            Apply Mode — ₹99, one time, forever
          </ClayBadge>
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              You already know you qualify.
            </h2>
            <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-muted">
              Apply Mode gets you <strong className="text-ink">ready to submit</strong>:
            </p>
          </div>
          <ul className="max-w-md space-y-3">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-cobalt-tint text-cobalt"
                >
                  <Check size={14} strokeWidth={3} />
                </span>
                <span className="text-[0.92rem] font-medium text-ink">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-center gap-3">
          <PseudoQR seed="eligent-upi-99" size={150} />
          <div className="text-center">
            <p className="text-[0.92rem] font-bold text-ink">₹99 · one time</p>
            <p className="text-[0.8rem] text-muted">Scan with any UPI app</p>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-line pt-6">
        {paidClicked ? (
          <div className="rounded-2xl border border-lime-dark/40 bg-lime-tint px-5 py-4">
            <p className="text-[0.92rem] font-semibold text-lime-ink">
              Payment recorded for this demo. Apply Mode is now yours.
            </p>
            <ClayButton variant="primary" className="mt-4" onClick={onUnlock}>
              Unlock Apply Mode
            </ClayButton>
          </div>
        ) : (
          <>
            <p className="text-[0.9rem] font-semibold text-ink">Paid?</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <ClayButton variant="coral" onClick={() => setPaidClicked(true)}>
                I've paid — unlock
              </ClayButton>
              <p className="text-[0.8rem] text-soft">
                Manual unlock for this demo. No verification.
              </p>
            </div>
          </>
        )}
      </div>
    </ClayCard>
  );
}