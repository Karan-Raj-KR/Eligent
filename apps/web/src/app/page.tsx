"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEligent } from "@/components/provider";
import { MatchesLoading } from "@/components/states";

export default function HomePage() {
  const { hydrated, signedIn, user } = useEligent();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (!signedIn) {
      router.replace("/signin");
    } else if (!user) {
      router.replace("/onboarding");
    } else {
      router.replace("/matches");
    }
  }, [hydrated, signedIn, user, router]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <MatchesLoading />
    </div>
  );
}