"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

/**
 * Google OAuth only. Supabase's built-in email sender caps at 2 messages an
 * hour project-wide, which would lock out an entire room of people trying to
 * sign in at once.
 */
export function SignInButton({ next = "/matches" }: { next?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      // On success the browser is already navigating to Google.
      if (authError) setError(authError.message);
    } catch {
      setError("Could not start sign-in. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button className="w-full" size="lg" onClick={signIn} disabled={loading}>
        {loading ? "Redirecting…" : "Continue with Google"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
