"use client";

// Route-level error boundary. Catches errors thrown by Server Components,
// Route Handlers, and client components within this segment tree.
// Shows the actual error message in development; a friendly message in production.

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to the console so it shows up in browser devtools even without
    // a logging service wired up.
    console.error("[app/error]", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <span
        aria-hidden
        className="grid size-16 place-items-center rounded-2xl bg-[var(--coral-tint,#fff0ef)] text-3xl font-bold text-[var(--coral-deep,#c0392b)]"
      >
        !
      </span>
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--ink,#111)]">
          Something went wrong
        </h1>
        {isDev && error?.message && (
          <pre className="mt-3 max-w-lg overflow-x-auto rounded-xl bg-[var(--sand,#f5f5f0)] px-4 py-3 text-left text-[0.78rem] text-[var(--muted,#666)]">
            {error.message}
            {error.digest ? `\n\nDigest: ${error.digest}` : ""}
          </pre>
        )}
        {!isDev && (
          <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--muted,#666)]">
            We hit an unexpected error. If this keeps happening, please reload
            the page or contact support.
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          id="error-retry-btn"
          type="button"
          onClick={reset}
          className="clay px-5 py-2.5 text-[0.9rem] font-semibold"
        >
          Try again
        </button>
        <Link
          href="/"
          className="clay px-5 py-2.5 text-[0.9rem] font-semibold"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
