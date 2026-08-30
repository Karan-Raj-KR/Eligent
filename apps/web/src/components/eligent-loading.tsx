"use client";

/**
 * Reusable ELIGENT loading component with three variants:
 * - "initial"  — first app load / page refresh
 * - "auth"     — account creation / sign-in
 * - "matching" — onboarding → matches transition (minimal, used inline)
 *
 * Visual language: warm cream bg, cobalt progress, clay surfaces.
 * No spinners, no AI imagery, no fake statistics.
 */

import { cn } from "@/lib/cn";

export type LoadingVariant = "initial" | "auth" | "matching";

interface EligentLoadingProps {
  variant?: LoadingVariant;
  /** Optional override for the supporting text */
  message?: string;
  /** Render full-viewport (default) or inline */
  inline?: boolean;
  className?: string;
}

const VARIANT_CONFIG: Record<
  LoadingVariant,
  { headline: string; message: string }
> = {
  initial: {
    headline: "ELIGENT",
    message: "Getting everything ready.",
  },
  auth: {
    headline: "ELIGENT",
    message: "Setting up your account.",
  },
  matching: {
    headline: "ELIGENT",
    message: "Finding opportunities for you.",
  },
};

export function EligentLoading({
  variant = "initial",
  message,
  inline = false,
  className,
}: EligentLoadingProps) {
  const config = VARIANT_CONFIG[variant];
  const displayMessage = message ?? config.message;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        !inline && "min-h-[calc(100vh-64px)]",
        inline && "py-20",
        className,
      )}
      role="status"
      aria-label={displayMessage}
    >
      {/* Logo mark */}
      <div className="mb-6 flex items-center gap-2">
        <span
          className="grid size-9 place-items-center rounded-xl bg-cobalt font-display text-[0.85rem] font-extrabold text-white shadow-[var(--shadow-cobalt)]"
          aria-hidden
        >
          E
        </span>
        <span className="font-display text-xl font-extrabold tracking-tight text-ink">
          {config.headline}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-6 h-1 w-48 overflow-hidden rounded-full bg-line/60">
        <div className="eligent-loading-bar h-full rounded-full bg-cobalt" />
      </div>

      {/* Message */}
      <p className="text-[0.95rem] font-medium text-muted">
        {displayMessage}
      </p>
      <p className="mt-1.5 text-[0.82rem] text-soft">
        {variant === "auth"
          ? "This only takes a moment."
          : "Loading your opportunities…"}
      </p>
    </div>
  );
}
