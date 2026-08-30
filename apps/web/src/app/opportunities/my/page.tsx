"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Plus, ExternalLink, ShieldCheck, AlertCircle } from "lucide-react";
import { useEligent } from "@/components/provider";
import { ClayBadge, ClayButton, ClayCard } from "@/components/clay";
import type { PlatformOpportunity, OpportunityStatus } from "@/lib/types";

const StatusBadgeMap: Record<OpportunityStatus, { tone: "cobalt" | "coral" | "lime"; label: string }> = {
  draft: { tone: "cobalt", label: "DRAFT" },
  pending_review: { tone: "coral", label: "PENDING REVIEW" },
  published: { tone: "lime", label: "PUBLISHED" },
  rejected: { tone: "coral", label: "REJECTED" },
  expired: { tone: "coral", label: "EXPIRED" },
};

export default function MyOpportunitiesPage() {
  const { signedIn, hydrated } = useEligent();
  const router = useRouter();
  const [items, setItems] = useState<PlatformOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/opportunities?my=true");
        if (res.ok) {
          const data = (await res.json()) as { opportunities: PlatformOpportunity[] };
          if (active && Array.isArray(data.opportunities)) {
            setItems(data.opportunities);
          }
        }
      } catch {
        // demo state
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (hydrated && !signedIn) {
    router.replace("/signin");
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ClayBadge tone="cobalt" className="!px-3 !py-1.5 !text-[0.82rem]">
              CREATOR DASHBOARD
            </ClayBadge>
            <span className="text-[0.85rem] font-semibold text-muted">
              Submitted Items
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            My Created Opportunities
          </h1>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">
            Track the publishing and review status of opportunities you posted.
          </p>
        </div>

        <div>
          <Link href="/opportunities/create">
            <ClayButton variant="primary" icon={<Plus size={16} />}>
              + Create opportunity
            </ClayButton>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-line/80 bg-surface p-12 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-cobalt-tint text-cobalt mb-4">
            <Clock size={24} />
          </div>
          <p className="font-display text-xl font-bold text-ink">
            You haven&apos;t created an opportunity yet.
          </p>
          <p className="mt-2 max-w-md mx-auto text-[0.9rem] text-muted">
            Host a hackathon, conference, or grant? Submit it to ELIGENT to connect with matched students.
          </p>
          <div className="mt-6">
            <Link href="/opportunities/create">
              <ClayButton variant="primary" icon={<Plus size={16} />}>
                Create opportunity
              </ClayButton>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const badge = StatusBadgeMap[item.status] || { tone: "cobalt", label: item.status.toUpperCase() };
            return (
              <ClayCard key={item.id} className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <ClayBadge tone={badge.tone} className="!px-2.5 !py-1 !text-[0.72rem]">
                        {badge.label}
                      </ClayBadge>
                      <span className="text-[0.78rem] font-semibold text-muted uppercase">
                        {item.category}
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-ink">
                      {item.name}
                    </h3>
                    <p className="text-[0.84rem] text-muted line-clamp-1">
                      {item.organization ?? item.provider} · {item.description}
                    </p>
                  </div>

                  {item.url && (
                    <div className="flex items-center gap-3 shrink-0">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[0.84rem] font-semibold text-cobalt hover:underline flex items-center gap-1"
                      >
                        Visit link <ExternalLink size={14} />
                      </a>
                    </div>
                  )}
                </div>

                {item.status === "pending_review" && (
                  <div className="mt-4 pt-3 border-t border-line/60 flex items-center gap-2 text-[0.82rem] text-muted">
                    <ShieldCheck size={14} className="text-cobalt" />
                    Pending admin review for public discovery.
                  </div>
                )}
                {item.status === "rejected" && (
                  <div className="mt-4 pt-3 border-t border-line/60 flex items-center gap-2 text-[0.82rem] text-coral-deep">
                    <AlertCircle size={14} />
                    Requires changes or does not meet community guidelines.
                  </div>
                )}
              </ClayCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
