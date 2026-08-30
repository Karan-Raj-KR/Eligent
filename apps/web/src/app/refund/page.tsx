import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund policy — ELIGENT",
  description: "₹99, one time. If it doesn't work for you, we refund it, no questions asked.",
};

export default function RefundPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
        Refund policy
      </h1>
      <div className="mt-6 space-y-4 text-[0.95rem] leading-relaxed text-muted">
        <p>₹99, one time.</p>
        <p>
          If it doesn&apos;t work for you, email{" "}
          <a
            href="mailto:mail@karanrajkr.com"
            className="font-semibold text-ink underline"
          >
            mail@karanrajkr.com
          </a>{" "}
          and we&apos;ll refund it, no questions asked.
        </p>
        <p>
          We&apos;re a two-person team that built this in 24 hours; we&apos;d
          rather refund you than have you feel misled.
        </p>
      </div>
    </div>
  );
}
