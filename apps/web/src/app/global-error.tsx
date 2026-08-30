"use client";

// Global error boundary — catches errors in the root layout itself
// (e.g. a crash inside EligentProvider before children mount).
// Must render its own <html> and <body> since the normal layout is broken.
// See: https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errorjs

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#fafafa",
          color: "#111",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-grid",
              placeItems: "center",
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#fff0ef",
              fontSize: 28,
              fontWeight: 700,
              color: "#c0392b",
              marginBottom: 24,
            }}
            aria-hidden
          >
            !
          </div>
          <h1
            style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 12 }}
          >
            Application error
          </h1>
          {isDev && error?.message && (
            <pre
              style={{
                background: "#f5f5f0",
                borderRadius: 12,
                padding: "12px 16px",
                textAlign: "left",
                fontSize: "0.78rem",
                overflowX: "auto",
                color: "#555",
                marginBottom: 20,
              }}
            >
              {error.message}
              {error.digest ? `\n\nDigest: ${error.digest}` : ""}
            </pre>
          )}
          {!isDev && (
            <p style={{ color: "#666", marginBottom: 20, lineHeight: 1.6 }}>
              A critical error occurred. Please reload or contact support if
              the problem persists.
            </p>
          )}
          <button
            id="global-error-retry-btn"
            type="button"
            onClick={reset}
            style={{
              padding: "10px 24px",
              borderRadius: 12,
              background: "#111",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.9rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
