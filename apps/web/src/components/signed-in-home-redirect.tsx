"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEligent } from "@/components/provider";

/** Signed-out visitors stay on the public landing page. Signed-in visitors continue into the app. */
export function SignedInHomeRedirect() {
  const { hydrated, signedIn, user } = useEligent();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated || !signedIn) return;
    router.replace(user ? "/matches" : "/onboarding");
  }, [hydrated, signedIn, user, router]);

  return null;
}
