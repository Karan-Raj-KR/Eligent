import Link from "next/link";
import { ArrowRight } from "lucide-react";

const STEPS = [
  ["Qualify", "Free check against every opportunity we hold official criteria for."],
  ["Understand", "Exactly why you qualify — or by how much you miss."],
  ["Check", "Every document, official and community-reported."],
  ["Prepare", "₹99 Apply Mode gets what you need, counted, no guesswork."],
  ["Apply", "The extension fills the real portal form and restores progress."],
  ["Don't waste time", "Mismatched criteria? ELIGENT refuses to fill the form."],
] as const;

export function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <section className="max-w-3xl">
        <p className="kicker text-cobalt">Scholarships, without the guesswork.</p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
          Know which opportunities you qualify for.
        </h1>
        <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-muted">
          Eligent checks the official criteria we hold for Indian students — income,
          category, academics, and the rest — and tells you whether you qualify,
          what you miss, and when not to start the form.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/signin" className="clay-btn clay-btn--primary !min-h-[54px] !rounded-[16px] !px-7 !text-[1rem]">
            Start checking
            <ArrowRight size={18} aria-hidden />
          </Link>
          <Link href="#how-it-works" className="clay-btn clay-btn--soft !min-h-[54px] !rounded-[16px] !px-7">
            How it works
          </Link>
        </div>
      </section>

      <section id="how-it-works" aria-labelledby="how-it-works-heading" className="mt-20 scroll-mt-28">
        <div className="clay px-6 py-8 sm:px-10 sm:py-10">
          <p className="kicker text-cobalt">How it works</p>
          <h2 id="how-it-works-heading" className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight text-ink">
            Know when to apply.
            <br />
            Know when not to.
          </h2>
          <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-muted">
            ELIGENT is honest in one direction: it won&apos;t start an application it
            knows you can&apos;t finish. A result is eligible, near miss, or rejected.
            The decision is arithmetic on official criteria.
          </p>
          <ol className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="flex items-start gap-3.5">
                <span
                  aria-hidden
                  className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-ink font-display text-[0.95rem] font-bold text-bg"
                >
                  {i + 1}
                </span>
                <div>
                  <p className="font-display text-[0.98rem] font-bold text-ink">{title}</p>
                  <p className="mt-1 text-[0.86rem] leading-relaxed text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="apply-mode" aria-labelledby="apply-mode-heading" className="mt-16 scroll-mt-28">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="clay px-6 py-8 sm:px-8">
            <p className="kicker text-cobalt">Apply Mode</p>
            <h2 id="apply-mode-heading" className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
              The extension fills the form. You submit it.
            </h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
              Apply Mode gets you ready to submit. The Chrome extension writes your
              details into the real portal, restores progress if you close the tab,
              and refuses to fill a form when the criteria do not match. You are the
              person who presses submit.
            </p>
            <div className="mt-6">
              <Link href="/extension" className="clay-btn clay-btn--soft">
                See the extension
              </Link>
            </div>
          </div>

          <div id="pricing" className="clay clay-top-accent clay-top-accent--cobalt scroll-mt-28 px-6 py-8 sm:px-8">
            <p className="kicker text-cobalt">Pricing</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
              Free to check.
            </h2>
            {/* TODO(Karan): do not add a billing interval here. Confirm whether
                ₹99 is one-time or recurring before writing "one time", "per month",
                or "per year" on this public section. */}
            <p className="mt-3 font-display text-2xl font-bold text-cobalt-deep">
              ₹99 to get ready to submit.
            </p>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
              Checking which opportunities you qualify for does not cost anything.
              The ₹99 charge is the step that gets you ready to submit.
            </p>
            <div className="mt-6">
              <Link href="/refund" className="text-[0.9rem] font-semibold text-ink underline">
                Refund policy
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="about" aria-labelledby="about-heading" className="mt-16 scroll-mt-28">
        <div className="clay px-6 py-8 sm:px-8">
          <p className="kicker text-cobalt">About</p>
          <h2 id="about-heading" className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
            Built by Karan Raj KR.
          </h2>
          <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-muted">
            ELIGENT is for students in India who want to know whether they qualify
            before they spend time on an application. The check uses criteria a
            person entered. It does not guess a result.
          </p>
          <p className="mt-4 text-[0.95rem] text-muted">
            Questions:{" "}
            <a href="mailto:hello@eligent.in" className="font-semibold text-ink underline">
              hello@eligent.in
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
