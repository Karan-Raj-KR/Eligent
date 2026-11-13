"use client";

/**
 * AppShell — wraps page content inside the EligentProvider.
 * Signed-in app routes wait for the provider's first auth read so they don't
 * flash an empty profile. Public pages render immediately: the gate starts
 * closed, and hiding them would leave crawlers with only the loading state.
 */

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useEligent } from "@/components/provider";
import { EligentLoading } from "@/components/eligent-loading";

const PUBLIC_EXACT = new Set([
  "/",
  "/opportunities",
  "/signin",
  "/privacy",
  "/terms",
  "/refund",
  "/extension",
]);

export function AppShell({ children }: { children: ReactNode }) {
  const { initializing } = useEligent();
  const pathname = usePathname();
  // Public pages must be in the first HTML response. The loading gate is a
  // client state that starts true, so leaving it on `/` meant crawlers only
  // received the spinner.
  if (initializing && !PUBLIC_EXACT.has(pathname)) {
    return <EligentLoading variant="initial" />;
  }

  return <>{children}</>;
}
