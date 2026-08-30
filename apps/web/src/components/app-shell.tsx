"use client";

/**
 * AppShell — wraps all page content inside the EligentProvider.
 * Shows <EligentLoading variant="initial" /> until the provider finishes
 * restoring auth + profile + matches. Prevents flash-of-uninitialized-content.
 *
 * IMPORTANT: This does NOT add artificial delay. It only gates on
 * `initializing`, which is true until the provider's init effect resolves.
 */

import type { ReactNode } from "react";
import { useEligent } from "@/components/provider";
import { EligentLoading } from "@/components/eligent-loading";

export function AppShell({ children }: { children: ReactNode }) {
  const { initializing } = useEligent();

  if (initializing) {
    return <EligentLoading variant="initial" />;
  }

  return <>{children}</>;
}
