import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cutoff — scholarship eligibility",
  description:
    "See which scholarships you are actually eligible for, with the exact gap or the exact clause.",
  // Static file rather than a generated route: installable on Android from the
  // same codebase and the same login, with no extra API surface.
  manifest: "/manifest.webmanifest",
  applicationName: "Cutoff",
  appleWebApp: { capable: true, title: "Cutoff", statusBarStyle: "default" },
  icons: {
    apple: "/icons/icon-180.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Matches --primary, so the Android status bar picks up the accent.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}