"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, LockKeyhole, Rocket, ShieldCheck } from "lucide-react";
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

// Bump this string whenever the disclosure copy changes materially.
// It is stored in the `purchase` row so we know which version a buyer agreed to.
const DISCLOSURE_VERSION = "2026-08-30-v1";

const DISCLOSURE_BULLETS = [
  "Apply Mode is early access. The Chrome extension is not yet on the Chrome Web Store.",
  "Today you get: your unlock, plus a manual install link (load unpacked in Chrome developer mode).",
  "We'll email you the moment it's live on the Web Store.",
  "This is a one-time payment. Lifetime access, no subscription.",
  "Built during a 24-hour hackathon on 29–30 August 2026. Early software. Things will break.",
];

/**
 * ₹99 Apply Mode — the paid, "ready to submit" product.
 * Deliberately separate from free eligibility.
 *
 * Locked state shows:
 *   1. A prominent pre-purchase disclosure box (not fine print)
 *   2. A required email field
 *   3. A required acknowledgement checkbox
 *   4. The pay button — disabled until checkbox is ticked AND email is filled
 */
export function ApplyModeGate({
  unlocked,
  onUnlock,
  scholarshipTitle,
  opportunityId,
}: ApplyModeGateProps) {
  const router = useRouter();
  const checkboxId = useId();
  const emailId = useId();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  const emailValid = email.trim().length > 0 && email.includes("@");
  const canPay = acknowledged && emailValid && !busy;

  async function pay() {
    if (!canPay) return;
    setError(null);
    setBusy(true);
    try {
      const Razorpay = await loadCheckout();

      const orderRes = await fetch("/api/payment/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunity_id: opportunityId,
          email: email.trim(),
        }),
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
        description: "Apply Mode — one time, early access",
        prefill: { email: email.trim() },
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
        body: JSON.stringify({
          ...response,
          email: email.trim(),
          disclosure_accepted: true,
          disclosure_version: DISCLOSURE_VERSION,
        }),
      });
      const body = (await res.json()) as { verified?: boolean; error?: string };
      if (!res.ok || !body.verified) {
        throw new Error(
          body.error === "signature mismatch"
            ? "We could not verify that payment. Nothing has been unlocked — contact us with your payment id."
            : (body.error ?? "Could not verify payment."),
        );
      }
      // Unlock locally first so the UI responds instantly, then navigate to the
      // post-payment install guide.
      onUnlock();
      router.push("/extension?purchased=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify payment.");
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Unlocked state                                                      */
  /* ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------ */
  /* Locked state — pre-purchase disclosure flow                        */
  /* ------------------------------------------------------------------ */
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

      {/* ------------------------------------------------------------ */}
      {/* Pre-purchase disclosure — MUST appear before checkout opens  */}
      {/* ------------------------------------------------------------ */}
      <div className="mt-8 rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0 text-amber-600"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="font-display text-[0.88rem] font-bold uppercase tracking-wide text-amber-900">
              What you&apos;re buying — read this
            </p>
            <ul className="mt-3 space-y-2">
              {DISCLOSURE_BULLETS.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-2.5 text-[0.86rem] leading-relaxed text-amber-900"
                >
                  <span
                    aria-hidden
                    className="mt-[0.35rem] size-1.5 shrink-0 rounded-full bg-amber-500"
                  />
                  {bullet}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[0.8rem] text-amber-700">
              Not sure?{" "}
              <a href="/refund" className="underline hover:text-amber-900">
                Read our refund policy
              </a>{" "}
              — ₹99, no questions asked.
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Email + acknowledgement + pay button                        */}
      {/* ------------------------------------------------------------ */}
      <div className="mt-6 space-y-5 border-t border-line pt-6">
        {/* Email field */}
        <div>
          <label
            htmlFor={emailId}
            className="mb-1.5 block text-[0.86rem] font-semibold text-ink"
          >
            Your email{" "}
            <span className="text-coral-deep">*</span>
          </label>
          <input
            id={emailId}
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full max-w-sm rounded-xl border border-line bg-surface px-4 py-2.5 text-[0.92rem] text-ink placeholder:text-soft focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/20"
          />
          <p className="mt-1.5 text-[0.78rem] text-soft">
            We&apos;ll notify you when the extension is on the Web Store. No spam, ever.
          </p>
        </div>

        {/* Acknowledgement checkbox */}
        <label
          htmlFor={checkboxId}
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-sand/60 px-4 py-3.5 hover:border-line-strong"
        >
          <input
            id={checkboxId}
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-cobalt"
          />
          <span className="text-[0.88rem] leading-relaxed text-ink">
            I understand the extension isn&apos;t on the Chrome Web Store yet
            and I&apos;m buying early access.
          </span>
        </label>

        {/* Pay button row */}
        <div className="flex flex-wrap items-center gap-4">
          <ClayButton
            id="apply-mode-pay-btn"
            variant="coral"
            size="lg"
            onClick={() => void pay()}
            disabled={!canPay}
          >
            {busy ? "Opening payment…" : "Pay ₹99 and unlock"}
          </ClayButton>
          <p className="text-[0.8rem] text-soft">
            Secured by Razorpay. Apply Mode unlocks only after we verify the payment.
          </p>
        </div>

        {!canPay && !busy && (
          <p className="text-[0.78rem] text-soft">
            {!emailValid && !acknowledged
              ? "Enter your email and tick the checkbox to continue."
              : !emailValid
                ? "Enter your email address to continue."
                : "Tick the checkbox to continue."}
          </p>
        )}

        {error && (
          <p role="alert" className="text-[0.86rem] font-semibold text-coral-deep">
            {error}
          </p>
        )}
      </div>
    </ClayCard>
  );
}