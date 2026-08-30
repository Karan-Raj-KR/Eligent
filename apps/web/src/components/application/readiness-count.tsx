"use client";

/**
 * Readiness is a plain count — never a percentage, circle, ring or score.
 */
export function ReadinessCount({ ready, total }: { ready: number; total: number }) {
  return (
    <div className="flex items-baseline gap-3">
      <p className="font-display text-4xl font-bold tracking-tight text-ink">
        {ready}
        <span className="text-muted"> of {total}</span>
      </p>
      <p className="text-[0.95rem] font-semibold text-muted">ready</p>
    </div>
  );
}