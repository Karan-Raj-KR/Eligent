import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { EligentProvider } from "@/components/provider";
import { AppShell } from "@/components/app-shell";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { PAGE_COPY, SITE_NAME, SITE_URL, siteJsonLd } from "@/lib/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: PAGE_COPY.home.title,
    template: `%s · ${SITE_NAME}`,
  },
  description: PAGE_COPY.home.description,
  applicationName: SITE_NAME,
  authors: [{ name: "Karan Raj KR", url: SITE_URL }],
  creator: "Karan Raj KR",
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: SITE_NAME,
    title: PAGE_COPY.home.title,
    description: PAGE_COPY.home.description,
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_COPY.home.title,
    description: PAGE_COPY.home.description,
  },
};

// Emits <meta name="color-scheme" content="only light">, so a browser in dark
// mode is told this page has no dark variant rather than inventing one.
export const viewport: Viewport = {
  colorScheme: "only light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <EligentProvider>
          <SiteHeader />
          <main className="flex-1">
            <AppShell>{children}</AppShell>
          </main>
          <SiteFooter />
        </EligentProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(siteJsonLd()).replace(/</g, "\\u003c"),
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}