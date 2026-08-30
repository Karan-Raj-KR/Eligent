"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { useEligent } from "@/components/provider";
import { ClayCard, Logo } from "@/components/clay";

export default function SignInPage() {
  const { hydrated, signedIn, user, signIn, error } = useEligent();
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
          Know which scholarships you actually qualify for.
        </h1>
        <p className="mt-5 max-w-md text-[1.02rem] leading-relaxed text-muted">
          ELIGENT checks every scholarship we hold official criteria for — and tells
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
          <p className="mt-4 text-center text-[0.8rem] leading-relaxed text-soft">
            No email, no password — an anonymous session is created for you.
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