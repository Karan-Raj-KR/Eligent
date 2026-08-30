"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { ClayButton } from "@/components/clay";
import { cn } from "@/lib/cn";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

/* ------------------------------------------------------------------ */
/* Loading states — skeletons of the real interface, no spinners      */
/* ------------------------------------------------------------------ */

export function MatchesLoading() {
  return (
    <div className="w-full" aria-busy="true" aria-label="Loading your matches">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="h-[120px] w-full" />
          <SkeletonBlock className="h-5 w-3/4" />
        </div>
        <div className="flex flex-col gap-3">
          <SkeletonBlock className="h-56 w-full rounded-[22px]" />
        </div>
      </div>
      <div className="mt-12 space-y-3">
        <SkeletonBlock className="h-5 w-32" />
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <SkeletonBlock key={i} className="h-44 w-full rounded-[22px]" />
          ))}
        </div>
      </div>
      <div className="mt-10 space-y-3">
        <SkeletonBlock className="h-5 w-32" />
        <SkeletonBlock className="h-40 w-full rounded-[22px]" />
      </div>
    </div>
  );
}

export function DetailLoading() {
  return (
    <div className="w-full" aria-busy="true" aria-label="Loading">
      <SkeletonBlock className="h-5 w-40" />
      <SkeletonBlock className="mt-6 h-14 w-2/3" />
      <div className="mt-4 flex gap-3">
        <SkeletonBlock className="h-10 w-28" />
        <SkeletonBlock className="h-10 w-28" />
      </div>
      <SkeletonBlock className="mt-10 h-8 w-48" />
      <div className="mt-5 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-24 w-full rounded-[22px]" />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                        */
/* ------------------------------------------------------------------ */

interface EmptyStateProps {
  title?: string;
  body?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({
  title = "No scholarships found yet.",
  body = "Check your details or explore opportunities with different criteria.",
  actionLabel = "Review my details",
  actionHref = "/onboarding",
}: EmptyStateProps) {
  return (
    <ClayPanel className="mx-auto max-w-xl">
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <span
          aria-hidden
          className="grid size-14 place-items-center rounded-2xl bg-sand text-2xl font-bold text-muted"
        >
          Ø
        </span>
        <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
        <p className="max-w-sm text-[0.95rem] leading-relaxed text-muted">{body}</p>
        <div className="pt-2">
          <Link href={actionHref}>
            <ClayButton variant="primary">{actionLabel}</ClayButton>
          </Link>
        </div>
      </div>
    </ClayPanel>
  );
}

/* ------------------------------------------------------------------ */
/* Error state                                                        */
/* ------------------------------------------------------------------ */

interface ErrorStateProps {
  title?: string;
  body?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong.",
  body = "We couldn't load your matches.",
  onRetry,
}: ErrorStateProps) {
  return (
    <ClayPanel className="mx-auto max-w-xl">
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <span
          aria-hidden
          className="grid size-14 place-items-center rounded-2xl bg-coral-tint text-coral-deep"
        >
          !
        </span>
        <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
        <p className="max-w-sm text-[0.95rem] text-muted">{body}</p>
        <div className="pt-2">
          <ClayButton variant="soft" icon={<RefreshCw size={16} />} onClick={onRetry}>
            Try again
          </ClayButton>
        </div>
      </div>
    </ClayPanel>
  );
}

export function ClayPanel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("clay px-6 sm:px-8", className)}>{children}</div>;
}