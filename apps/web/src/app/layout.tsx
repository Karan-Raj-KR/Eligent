import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { EligentProvider } from "@/components/provider";
import { SiteFooter, SiteHeader } from "@/components/site-header";

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
  title: {
    default: "ELIGENT — Know which opportunities you qualify for",
    template: "%s · ELIGENT",
  },
  description:
    "Free tells you whether you qualify. ₹99 gets you ready to submit.",
  metadataBase: new URL("https://eligent.in"),
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
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </EligentProvider>
        <Analytics />
      </body>
    </html>
  );
}