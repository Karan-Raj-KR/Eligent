"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Clock, Download, FileWarning, ShieldX } from "lucide-react";
import {
  ExtensionPopup,
  ExtensionSwitcher,
  type ExtensionState,
} from "@/components/behavior/extension-popup";

// TODO: replace with the real extension ZIP download URL when available.
const EXTENSION_DOWNLOAD_URL = "#extension-download-placeholder";

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
  const searchParams = useSearchParams();
  const justPurchased = searchParams.get("purchased") === "1";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
      {/* ---------------------------------------------------------------- */}
      {/* Post-purchase confirmation banner                               */}
      {/* Only shown when ?purchased=1 is in the URL after checkout.      */}
      {/* ---------------------------------------------------------------- */}
      {justPurchased && (
        <div className="mb-10 rounded-2xl border-2 border-lime-dark/40 bg-lime-tint px-6 py-6 sm:px-8">
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-lime-dark/20 text-lime-ink"
            >
              <Check size={20} strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold tracking-tight text-lime-ink">
                You&apos;re in. Apply Mode unlocked.
              </h2>
              <p className="mt-1 text-[0.92rem] leading-relaxed text-lime-ink/80">
                The extension isn&apos;t on the Chrome Web Store yet — here&apos;s
                how to install it right now:
              </p>

              <ol className="mt-4 space-y-3">
                {[
                  <>
                    <a
                      href={EXTENSION_DOWNLOAD_URL}
                      className="font-semibold underline"
                      download
                    >
                      <Download size={13} className="mr-1 inline" aria-hidden />
                      Download the extension ZIP
                    </a>{" "}
                    and unzip it anywhere on your computer.
                  </>,
                  <>
                    Open Chrome and go to{" "}
                    <code className="rounded bg-lime-dark/10 px-1.5 py-0.5 text-[0.85em]">
                      chrome://extensions
                    </code>
                    . Enable <strong>Developer mode</strong> (toggle, top-right).
                  </>,
                  <>
                    Click <strong>Load unpacked</strong> and select the unzipped
                    folder. The ELIGENT icon will appear in your toolbar.
                  </>,
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-lime-dark/20 font-display text-[0.8rem] font-bold text-lime-ink"
                    >
                      {i + 1}
                    </span>
                    <span className="text-[0.9rem] leading-relaxed text-lime-ink">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>

              <p className="mt-5 text-[0.86rem] leading-relaxed text-lime-ink/80">
                We&apos;ll email you the moment it&apos;s live on the Web Store — you
                won&apos;t need to reinstall, just install normally then.
              </p>
              <p className="mt-2 text-[0.86rem] text-lime-ink/80">
                Reply to your confirmation email if anything breaks.{" "}
                <a
                  href="mailto:mail@karanrajkr.com"
                  className="font-semibold underline"
                >
                  mail@karanrajkr.com
                </a>{" "}
                — Karan, Eligent
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Extension page body                                             */}
      {/* ---------------------------------------------------------------- */}
      <div className="max-w-2xl">
        <p className="kicker text-cobalt">ELIGENT for Chrome</p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl">
          Wins time back at the moment it matters most.
        </h1>
        <p className="mt-5 max-w-xl text-[1.02rem] leading-relaxed text-muted">
          A reusable popup that lives on the real application portal.
          It restores your form, warns you about documents that aren&apos;t in the
          official requirements, and refuses to help when you don&apos;t qualify.
        </p>
      </div>

      <div className="mt-10">
        <ExtensionSwitcher variant={variant} onChange={setVariant} />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[max-content_1fr] lg:items-start">
        <div>
          <div className="hash-bg rounded-3xl border border-line bg-sand/60 p-6 sm:p-8 lg:p-10">
            <div className="mx-auto w-full max-w-[360px]">
              <ExtensionPopup variant={variant} />
            </div>
          </div>
          <p className="mt-4 max-w-[360px] text-center text-[0.8rem] text-soft lg:text-left">
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
              ELIGENT is honest: if you don&apos;t qualify, it won&apos;t fill the form.
              That&apos;s the whole point of ₹99 — it protects the hours Apply Mode
              would have spent on an application that can never finish.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}