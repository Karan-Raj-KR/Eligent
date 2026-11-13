import type { ReactNode } from "react";
import Link from "next/link";
import { DraftBanner } from "@/components/draft-banner";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("terms", "/terms");

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-bold tracking-tight text-ink">{title}</h2>
      <div className="mt-2 space-y-3 text-[0.95rem] leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
      <p className="kicker text-cobalt">Terms</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Terms of use
      </h1>
      <p className="mt-3 text-[0.9rem] font-medium text-soft">Drafted 13 November 2026. Status: draft.</p>
      <div className="mt-6">
        <DraftBanner />
      </div>

      <Section title="What you are using">
        <p>
          ELIGENT is a website built by Karan Raj KR for students in India. It
          tells you whether the criteria it holds say you are eligible, a near
          miss, or rejected. That result is a calculation. It is not an offer of
          money, a seat, a job, or a decision by a college, a foundation, or a
          government.
        </p>
        <p>
          The product code does not name a registered company. Karan needs to add
          the legal name of the operator before these terms are treated as final.
        </p>
      </Section>

      <Section title="Checking is free">
        <p>
          You can check which opportunities you qualify for without paying. The
          check uses the details you type. If those details are wrong, the result
          is wrong. You can go back and correct them.
        </p>
      </Section>

      <Section title="₹99 to get ready to submit">
        <p>
          The paid step is to get ready to submit. The price shown in the product
          is ₹99, taken through Razorpay. This draft does not say whether that
          charge is one-time or repeating. Karan has to confirm the billing
          interval before this page is final.
        </p>
        <p>
          The current refund page says that if it does not work for you, you can
          email{" "}
          <a href="mailto:mail@karanrajkr.com" className="font-semibold text-ink underline">
            mail@karanrajkr.com
          </a>{" "}
          and the charge is refunded, no questions asked. Read that page:{" "}
          <Link href="/refund" className="font-semibold text-ink underline">
            Refund policy
          </Link>
          . This draft does not add a new refund rule.
        </p>
      </Section>

      <Section title="You submit the form">
        <p>
          Apply Mode and the Chrome extension can fill fields on a real
          application portal and can restore progress in that browser. They do
          not submit the form. You read it and you submit it. If the criteria do
          not match, Eligent is built to refuse to fill the form.
        </p>
      </Section>

      <Section title="Opportunities can be wrong">
        <p>
          Criteria and deadlines are entered by a person from source pages. They
          can be out of date. You can report a wrong deadline, an extra document,
          a file limit, a criteria mismatch, or that applications are closed. A
          report does not by itself change the published result.
        </p>
      </Section>

      <Section title="Your account and your details">
        <p>
          A check starts with an anonymous session, without an email or a
          password. The email asked for at payment is stored with that purchase.
          The{" "}
          <Link href="/privacy" className="font-semibold text-ink underline">
            privacy policy
          </Link>{" "}
          lists the profile fields. Both pages are drafts.
        </p>
      </Section>

      <Section title="What you agree not to do">
        <p>
          Do not use Eligent to break into someone else&apos;s account, to scrape
          the site in a way that knocks it over, or to present an Eligent result
          as a letter from a scholarship provider. The site can change or pause.
          This draft does not promise that any opportunity will stay listed or
          that a result will stay the same after criteria are corrected.
        </p>
      </Section>

      <Section title="India, and what this draft does not decide">
        <p>
          This draft is written for students in India and is aware of the Digital
          Personal Data Protection Act, 2023. It does not choose a court, a
          governing law, or a statute, and it does not claim that ELIGENT complies
          with that Act or any other law. Karan needs to add those clauses if he
          wants them.
        </p>
        <p>
          Questions:{" "}
          <a href="mailto:hello@eligent.in" className="font-semibold text-ink underline">
            hello@eligent.in
          </a>
          .
        </p>
      </Section>
    </div>
  );
}
