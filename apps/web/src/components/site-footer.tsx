"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ClayButton, ClayCard, Logo } from "@/components/clay";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line/80 bg-sand/30 pt-12 pb-8 text-ink">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Top & Middle Grid */}
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2.1fr_1.2fr] lg:gap-10">
          {/* Brand Column */}
          <div className="flex flex-col items-start gap-3">
            <Link href="/" aria-label="ELIGENT home" className="inline-block">
              <Logo />
            </Link>
            <p className="font-display text-[1.02rem] font-bold tracking-tight text-ink">
              Scholarships, without the guesswork.
            </p>
            <p className="max-w-xs text-[0.84rem] leading-relaxed text-muted">
              Know what you qualify for. Know what you need. Don&apos;t waste time on
              applications you can&apos;t finish.
            </p>
          </div>

          {/* Navigation Groups */}
          <div className="grid grid-cols-3 gap-6">
            {/* Product */}
            <div>
              <p className="mb-3.5 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-soft">
                Product
              </p>
              <ul className="space-y-2.5 text-[0.86rem] font-medium text-muted">
                <li>
                  <Link href="/matches" className="transition-colors hover:text-ink">
                    Matches
                  </Link>
                </li>
                <li>
                  <Link href="/matches#how-it-works" className="transition-colors hover:text-ink">
                    How it works
                  </Link>
                </li>
                <li>
                  <Link href="/extension" className="transition-colors hover:text-ink">
                    Extension
                  </Link>
                </li>
                <li>
                  <Link href="/onboarding" className="transition-colors hover:text-ink">
                    Review details
                  </Link>
                </li>
              </ul>
            </div>

            {/* Apply */}
            <div>
              <p className="mb-3.5 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-soft">
                Apply
              </p>
              <ul className="space-y-2.5 text-[0.86rem] font-medium text-muted">
                <li>
                  <Link href="/matches#eligible" className="transition-colors hover:text-ink">
                    Eligibility
                  </Link>
                </li>
                <li>
                  <Link href="/matches#how-it-works" className="transition-colors hover:text-ink">
                    Apply Mode
                  </Link>
                </li>
                <li>
                  <Link href="/matches#how-it-works" className="transition-colors hover:text-ink">
                    Community reports
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="mb-3.5 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-soft">
                Company
              </p>
              <ul className="space-y-2.5 text-[0.86rem] font-medium text-muted">
                <li>
                  <Link href="/matches#how-it-works" className="transition-colors hover:text-ink">
                    About
                  </Link>
                </li>
                <li>
                  <a href="mailto:hello@eligent.in" className="transition-colors hover:text-ink">
                    Contact
                  </a>
                </li>
                <li>
                  <span className="text-soft cursor-not-allowed">
                    Privacy
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* CTA Panel Column */}
          <div>
            <ClayCard topAccent="cobalt" className="p-5 sm:p-5">
              <p className="font-display text-[0.96rem] font-bold tracking-tight text-ink">
                Ready to check your matches?
              </p>
              <p className="mt-1 text-[0.81rem] leading-relaxed text-muted">
                Run a free check against every official opportunity.
              </p>
              <div className="mt-4">
                <Link href="/onboarding">
                  <ClayButton variant="primary" block size="sm" icon={<ArrowRight size={14} />}>
                    Check my eligibility
                  </ClayButton>
                </Link>
              </div>
            </ClayCard>
          </div>
        </div>

        {/* Horizontal Brand Statement */}
        <div className="mt-9 rounded-2xl border border-line/70 bg-surface/70 px-5 py-3 text-center shadow-[0_1px_2px_rgba(23,21,37,0.03)]">
          <p className="text-[0.84rem] font-semibold text-muted">
            Free tells you whether you qualify.{" "}
            <span className="font-bold text-cobalt-deep">₹99</span> gets you ready to submit.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="mt-7 flex flex-col gap-3 border-t border-line/70 pt-5 text-[0.82rem] font-medium text-soft sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 ELIGENT. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="transition-colors hover:text-muted cursor-pointer">Privacy</span>
            <span aria-hidden>·</span>
            <span className="transition-colors hover:text-muted cursor-pointer">Terms</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
