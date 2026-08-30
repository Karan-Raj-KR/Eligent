"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useEligent } from "@/components/provider";
import { ClayCard, Logo } from "@/components/clay";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.27-2.09 3.58-5.16 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.25 0 5.97-1.08 7.96-2.91l-3.87-3.01c-1.08.73-2.45 1.16-4.09 1.16-3.14 0-5.8-2.12-6.75-4.97H1.29v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.25 14.27A7.19 7.19 0 0 1 4.9 12c0-.79.13-1.55.35-2.27V6.62H1.29a12 12 0 0 0 0 10.76l3.96-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.36.61 4.61 1.8l3.44-3.45A12 12 0 0 0 1.29 6.62l3.96 3.11C6.2 6.87 8.86 4.75 12 4.75Z"
      />
    </svg>
  );
}

export default function SignInPage() {
  const { hydrated, signedIn, user, signIn } = useEligent();
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
          ELIGENT checks 43 scholarships against official criteria — and tells
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
            onClick={() => {
              signIn();
              router.push("/onboarding");
            }}
            className="clay-btn clay-btn--primary w-full !min-h-[54px] !rounded-[16px] !text-[1rem]"
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <p className="mt-4 text-center text-[0.8rem] leading-relaxed text-soft">
            Demo mode — this simulates sign-in and moves you to your profile.
          </p>
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