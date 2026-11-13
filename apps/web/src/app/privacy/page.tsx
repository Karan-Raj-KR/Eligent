import type { ReactNode } from "react";
import { DraftBanner } from "@/components/draft-banner";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("privacy", "/privacy");

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-bold tracking-tight text-ink">{title}</h2>
      <div className="mt-2 space-y-3 text-[0.95rem] leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
      <p className="kicker text-cobalt">Privacy</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Privacy policy
      </h1>
      <p className="mt-3 text-[0.9rem] font-medium text-soft">Drafted 13 November 2026. Status: draft.</p>
      <div className="mt-6">
        <DraftBanner />
      </div>

      <Section title="Who this draft is about">
        <p>
          ELIGENT is a website for students in India. It is built by Karan Raj KR.
          The product code does not name a registered company. Karan needs to add
          the legal name of whoever is responsible for the data before this page
          is treated as final.
        </p>
        <p>
          Write to{" "}
          <a href="mailto:hello@eligent.in" className="font-semibold text-ink underline">
            hello@eligent.in
          </a>{" "}
          or{" "}
          <a href="mailto:mail@karanrajkr.com" className="font-semibold text-ink underline">
            mail@karanrajkr.com
          </a>
          .
        </p>
      </Section>

      <Section title="What the product is for">
        <p>
          Eligent compares the details you give with scholarship and programme
          criteria that a person entered, and returns one of three results:
          eligible, near miss, or rejected. That comparison is arithmetic. It is
          not a guess from a model, and it is not a decision by a college or a
          government.
        </p>
      </Section>

      <Section title="Details the product asks you for">
        <p>Onboarding asks for these fields, and the database stores them on your profile:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Full name</li>
          <li>CGPA and percentage</li>
          <li>Year of study and branch</li>
          <li>State</li>
          <li>Annual family income</li>
          <li>Institution type</li>
          <li>Category, which you can leave as prefer not to say</li>
          <li>Gender, which you can leave as prefer not to say</li>
        </ul>
        <p>
          Income, category, and academics are collected because many official
          criteria use them as cutoffs. Optional profile lists — skills, interests,
          and preferred locations — are stored only if you save them.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          Starting a check creates an anonymous session. The sign-in screen does
          not ask for an email address or a password. The session is how the site
          knows which profile row is yours.
        </p>
      </Section>

      <Section title="The ₹99 charge">
        <p>
          Checking eligibility is free. Getting ready to submit is the paid step,
          and the amount in the product is ₹99, collected through Razorpay. This
          draft does not say whether that charge is one-time or repeating. Karan
          has to confirm that before this page is final.
        </p>
        <p>
          Checkout asks for an email address. The purchase row the app stores is
          your account id, that email, the Razorpay payment id, the amount in
          paise, and whether you accepted the disclosure shown at checkout. This
          draft does not describe the records Razorpay keeps.
        </p>
      </Section>

      <Section title="Applications, reports, and the extension">
        <p>
          If you start an application inside Eligent, the app stores a draft, the
          opportunity it belongs to, and which listed documents you say you have.
          You can also send a report that a deadline was wrong, a document was
          missing from the list, a file had a size or format limit, the criteria
          did not match, applications were closed, or something else. A report is
          stored with your account id.
        </p>
        <p>
          The Chrome extension reads your Eligent profile and can fill matching
          fields on a scholarship website. It can also keep a copy of those values
          in that browser. You submit the form yourself. The extension does not
          submit it for you.
        </p>
      </Section>

      <Section title="Where the data sits">
        <p>
          The app is built to store its database in Supabase and to run on Vercel.
          Payments go through Razorpay. This draft does not claim those companies
          have been appointed under any contract, and it does not claim a transfer
          outside India does or does not happen. Karan needs to confirm the actual
          hosts and contracts.
        </p>
        <p>
          Where a model is used while preparing opportunity criteria, the product
          rule is that the model output is stored in the database. The eligibility
          result a student sees is still the arithmetic check, not a fresh model
          call.
        </p>
      </Section>

      <Section title="Asking for a copy, a correction, or deletion">
        <p>
          You can email the addresses above and ask for a copy of the profile
          attached to your session, a correction, or deletion. That is the route
          this draft offers. It is not a statement that the request meets the
          Digital Personal Data Protection Act, 2023, and this draft does not set
          a retention period.
        </p>
      </Section>

      <Section title="Students and age">
        <p>
          The product is aimed at students. This draft does not set a minimum age
          and does not describe a parent-consent flow. Karan needs to decide that
          before publishing, including for anyone under 18.
        </p>
      </Section>

      <Section title="The Act this draft is aware of">
        <p>
          The Digital Personal Data Protection Act, 2023 is India&apos;s law on
          personal data. This page uses its ideas — say why the data is needed,
          list what is asked for, and give a person to write to — so the draft can
          be reviewed. Publishing it is not a claim of compliance.
        </p>
      </Section>
    </div>
  );
}
