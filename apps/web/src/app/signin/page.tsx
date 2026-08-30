"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { useEligent } from "@/components/provider";
import { ClayCard, Logo } from "@/components/clay";

/** Google's brand mark. Inline so the button needs no network request. */
function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 18 18" className="size-[18px]">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

export default function SignInPage() {
  const { hydrated, signedIn, user, signIn, signInWithGoogle, error } = useEligent();
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (hydrated && signedIn) {
      router.replace(user ? "/matches" : "/onboarding");
    }
  }, [hydrated, signedIn, user, router]);

  return (
    <div className="mx-auto grid w-full max-w-5xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
      <div>
        <Logo />
        <h1 className="mt-8 font-display text-4xl font-bold leading-[1.06] tracking-tight text-ink sm:text-5xl">
          Know which opportunities you actually qualify for.
        </h1>
        <p className="mt-5 max-w-md text-[1.02rem] leading-relaxed text-muted">
          ELIGENT checks every opportunity we hold official criteria for — and tells
          you, before you apply, whether you'll be wasting your time.
        </p>
        <p className="mt-8 text-[0.85rem] font-semibold text-soft">
          Free to check. No email, no password.
        </p>
      </div>

      <div className="space-y-6">
        <ClayCard className="p-7 sm:p-9">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await signIn();
                router.push("/onboarding");
              } finally {
                setBusy(false);
              }
            }}
            className="clay-btn clay-btn--primary w-full !min-h-[54px] !rounded-[16px] !text-[1rem] disabled:opacity-60"
          >
            {busy ? "Starting…" : "Start checking"}
            {!busy && <ArrowRight size={18} />}
          </button>
          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[0.75rem] font-semibold uppercase tracking-wide text-soft">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              // Redirects away; no finally — the page is unloading.
              void signInWithGoogle();
            }}
            className="clay-btn w-full !min-h-[50px] !rounded-[16px] !text-[0.95rem] disabled:opacity-60"
          >
            <GoogleMark />
            Continue with Google
          </button>

          <p className="mt-4 text-center text-[0.8rem] leading-relaxed text-soft">
            Anonymous keeps you out of every database we don't need. Google keeps your
            profile if you switch browsers.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-center text-[0.82rem] font-semibold text-coral-deep">
              {error}
            </p>
          )}
        </ClayCard>

        <ClayCard inset raised={false} className="p-6">
          <p className="kicker text-muted">Sample match card</p>
          <div className="mt-3 flex items-center gap-3">
            <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-lime text-lime-ink">
              <Check size={16} strokeWidth={3} />
            </span>
            <div>
              <p className="text-[0.95rem] font-bold text-ink">National Merit Scholarship</p>
              <p className="text-[0.82rem] text-muted">
                CGPA 8.4 ≥ 8.0 · Income ₹2.5L ≤ ₹3L · Karnataka resident
              </p>
            </div>
          </div>
          <div className="rule my-4" />
          <p className="text-[0.82rem] leading-relaxed text-muted">
            Eligibility is <strong className="text-ink">deterministic</strong> — official
            criteria, not guesses.&nbsp;
            <Link href="/extension" className="font-semibold text-cobalt-deep underline decoration-line-strong underline-offset-2 hover:decoration-cobalt">
              See how the extension protects you →
            </Link>
          </p>
        </ClayCard>
      </div>
    </div>
  );
}