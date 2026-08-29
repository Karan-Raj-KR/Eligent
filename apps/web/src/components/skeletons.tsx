// Skeletons mirror the real layout so nothing jumps when data lands.
// Plain Tailwind animate-pulse — no animation library.

export function MatchCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border bg-card p-5 sm:p-6" aria-hidden="true">
      <div className="flex items-start justify-between gap-3">
        <div className="w-full space-y-2">
          <div className="h-5 w-2/3 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
        <div className="h-6 w-20 shrink-0 rounded-full bg-muted" />
      </div>
      <div className="mt-5 space-y-2">
        <div className="h-3 w-40 rounded bg-muted" />
        <div className="h-9 w-48 rounded bg-muted" />
      </div>
      <div className="mt-5 flex gap-2">
        <div className="h-11 w-36 rounded-md bg-muted" />
        <div className="h-11 w-28 rounded-md bg-muted" />
      </div>
    </div>
  );
}

export function MatchesSkeleton() {
  return (
    <div className="space-y-10">
      <span className="sr-only" role="status">
        Checking every scholarship against your profile
      </span>
      {[0, 1].map((section) => (
        <div key={section} className="space-y-4">
          <div className="animate-pulse space-y-2" aria-hidden="true">
            <div className="h-6 w-44 rounded bg-muted" />
            <div className="h-3 w-72 max-w-full rounded bg-muted" />
          </div>
          <div className="space-y-4">
            {[0, 1].map((card) => (
              <MatchCardSkeleton key={card} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChecklistSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden="true">
      <div className="space-y-2">
        <div className="h-8 w-2/3 rounded bg-muted" />
        <div className="h-3 w-1/3 rounded bg-muted" />
      </div>
      <div className="rounded-lg border bg-card p-6">
        <div className="h-5 w-48 rounded bg-muted" />
        <div className="mt-5 space-y-4">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-3">
              <div className="h-5 w-5 shrink-0 rounded bg-muted" />
              <div className="h-4 flex-1 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
