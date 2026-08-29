"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

/**
 * Anonymous auth — no email, no OAuth provider, no external redirect or
 * callback. signInAnonymously() still produces a real auth.users row and a
 * real auth.uid(), which is all RLS ever checked for; there is nothing to
 * verify and nothing to collect before /onboarding.
 */
export function SignInButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInAnonymously();
      if (authError) throw authError;
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button className="w-full" size="lg" onClick={start} disabled={loading}>
        {loading ? "Starting…" : "Check my eligibility"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
