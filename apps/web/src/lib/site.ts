import type { Metadata } from "next";

/** Live site. eligent.in does not resolve, so it is not the canonical host. */
export const SITE_URL = "https://eligent.karanrajkr.com";
export const SITE_NAME = "ELIGENT";

export const PAGE_COPY = {
  home: {
    title: "ELIGENT — Know which opportunities you qualify for",
    description:
      "Eligent checks official criteria for Indian students and shows which scholarships they qualify for, what they miss, and what to prepare before they apply.",
  },
  opportunities: {
    title: "Find opportunities",
    description:
      "Browse scholarships, internships, hackathons, and other programmes for Indian students. Closed deadlines stay hidden, and this page never shows sample cards.",
  },
  signin: {
    title: "Start checking",
    description:
      "Start an anonymous Eligent session with no email and no password, then see which scholarships and programmes you qualify for before you open an application.",
  },
  privacy: {
    title: "Privacy policy",
    description:
      "Draft notice of the name, academic record, family income, and category Eligent stores so it can check scholarship criteria for students in India.",
  },
  terms: {
    title: "Terms of use",
    description:
      "Draft terms for using Eligent. The eligibility check is informational, you submit every form yourself, and the paid step is only to get ready to submit.",
  },
  refund: {
    title: "Refund policy",
    description:
      "How to ask for your money back if Apply Mode did not help you get ready to submit. Email mail@karanrajkr.com and Eligent refunds the charge it took.",
  },
  extension: {
    title: "Chrome extension",
    description:
      "How the Eligent Chrome extension fills a real scholarship form in the browser, warns you about extra documents, and refuses to fill when you do not qualify.",
  },
} as const;

export function pageMetadata(page: keyof typeof PAGE_COPY, path: string): Metadata {
  const copy = PAGE_COPY[page];
  const absolute = page === "home";
  return {
    title: absolute ? { absolute: copy.title } : copy.title,
    description: copy.description,
    alternates: { canonical: path },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: path,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
    },
  };
}

export function privateMetadata(title: string): Metadata {
  return {
    title,
    robots: { index: false, follow: false },
  };
}

/** Public JSON-LD. The only named person is Karan Raj KR. */
export function siteJsonLd() {
  const orgId = `${SITE_URL}/#organization`;
  const siteId = `${SITE_URL}/#website`;
  const personId = `${SITE_URL}/#karan-raj-kr`;
  const appId = `${SITE_URL}/#app`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: SITE_NAME,
        url: SITE_URL,
        email: "hello@eligent.in",
        founder: { "@id": personId },
      },
      {
        "@type": "WebSite",
        "@id": siteId,
        name: SITE_NAME,
        url: SITE_URL,
        publisher: { "@id": orgId },
        inLanguage: "en-IN",
      },
      {
        "@type": "SoftwareApplication",
        "@id": appId,
        name: SITE_NAME,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        description: PAGE_COPY.home.description,
        creator: { "@id": personId },
        offers: [
          {
            "@type": "Offer",
            price: "0",
            priceCurrency: "INR",
            description: "Free to check whether you qualify.",
          },
          {
            "@type": "Offer",
            price: "99",
            priceCurrency: "INR",
            description: "Gets you ready to submit.",
          },
        ],
      },
      {
        "@type": "Person",
        "@id": personId,
        name: "Karan Raj KR",
        email: "mailto:mail@karanrajkr.com",
      },
    ],
  };
}
