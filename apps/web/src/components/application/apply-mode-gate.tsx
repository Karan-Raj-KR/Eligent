"use client";

import { useState } from "react";
import { Check, LockKeyhole, Rocket, ShieldCheck } from "lucide-react";
import { ClayBadge, ClayButton, ClayCard } from "@/components/clay";
import { loadCheckout, type CheckoutHandlerResponse } from "@/lib/razorpay-checkout";

interface ApplyModeGateProps {
  unlocked: boolean;
  onUnlock: () => void;
  scholarshipTitle: string;
  /** Rides along into the Razorpay receipt so a payment is traceable to a page. */
  opportunityId?: string;
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
export function ApplyModeGate({
  unlocked,
  onUnlock,
  scholarshipTitle,
  opportunityId,
}: ApplyModeGateProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setError(null);
    setBusy(true);
    try {
      const Razorpay = await loadCheckout();

      const orderRes = await fetch("/api/payment/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity_id: opportunityId }),
      });
      const order = (await orderRes.json()) as {
        order_id?: string;
        amount?: number;
        currency?: string;
        key_id?: string;
        error?: string;
      };
      if (!orderRes.ok || !order.order_id) {
        throw new Error(order.error ?? "Could not start payment.");
      }

      const checkout = new Razorpay({
        key: order.key_id || (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? ""),
        amount: order.amount ?? 9900,
        currency: order.currency ?? "INR",
        order_id: order.order_id,
        name: "ELIGENT",
        description: "Apply Mode — one time",
        theme: { color: "#5146f5" },
        // The modal owns the tab until it closes; both exits must clear `busy`.
        modal: {
          ondismiss: () => {
            setBusy(false);
            setError("Payment cancelled. Nothing was charged.");
          },
        },
        handler: (response: CheckoutHandlerResponse) => {
          void verify(response);
        },
      });

      checkout.on("payment.failed", (response) => {
        setBusy(false);
        setError(response.error?.description ?? "The payment failed. You have not been charged.");
      });

      checkout.open();
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Could not start payment.");
    }
  }

  /** Apply Mode unlocks ONLY when the server says the signature checks out. */
  async function verify(response: CheckoutHandlerResponse) {
    try {
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response),
      });
      const body = (await res.json()) as { verified?: boolean; error?: string };
      if (!res.ok || !body.verified) {
        throw new Error(
          body.error === "signature mismatch"
            ? "We could not verify that payment. Nothing has been unlocked — contact us with your payment id."
            : (body.error ?? "Could not verify payment."),
        );
      }
      onUnlock();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify payment.");
    } finally {
      setBusy(false);
    }
  }

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

        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-cobalt-tint px-8 py-6 text-center">
          <p className="font-display text-4xl font-bold text-ink">₹99</p>
          <p className="text-[0.85rem] font-semibold text-muted">one time, forever</p>
          <p className="mt-1 flex items-center gap-1.5 text-[0.78rem] text-soft">
            <ShieldCheck size={13} aria-hidden />
            UPI, cards, netbanking
          </p>
        </div>
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <div className="flex flex-wrap items-center gap-4">
          <ClayButton variant="coral" size="lg" onClick={() => void pay()} disabled={busy}>
            {busy ? "Opening payment…" : "Pay ₹99 and unlock"}
          </ClayButton>
          <p className="text-[0.8rem] text-soft">
            Secured by Razorpay. Apply Mode unlocks only after we verify the payment.
          </p>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-[0.86rem] font-semibold text-coral-deep">
            {error}
          </p>
        )}
      </div>
    </ClayCard>
  );
}