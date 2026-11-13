"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, MapPin, Search, Plus, Bookmark, ExternalLink, Sparkles } from "lucide-react";
import { useEligent } from "@/components/provider";
import { ClayBadge, ClayButton, ClayCard } from "@/components/clay";
import { ErrorState } from "@/components/states";
import { isPastDeadline } from "@/lib/deadlines";
import type { PlatformOpportunity, PlatformOpportunityCategory } from "@/lib/types";

const CATEGORIES: Array<{ label: string; value: string }> = [
  { label: "ALL", value: "all" },
  { label: "SCHOLARSHIPS", value: "scholarship" },
  { label: "HACKATHONS", value: "hackathon" },
  { label: "EVENTS", value: "event" },
  { label: "JOBS", value: "job" },
  { label: "INTERNSHIPS", value: "internship" },
  { label: "COMPETITIONS", value: "competition" },
  { label: "FELLOWSHIPS", value: "fellowship" },
  { label: "WORKSHOPS", value: "workshop" },
];

const LOCATIONS: Array<{ label: string; value: string }> = [
  { label: "All Locations", value: "all" },
  { label: "India", value: "india" },
  { label: "Abroad", value: "abroad" },
  { label: "Online / Remote", value: "online" },
];

const CATEGORY_VALUES = new Set<string>([
  "scholarship", "fellowship", "grant", "hackathon", "internship", "job",
  "programme", "event", "competition", "workshop",
]);

function asOpportunity(row: Record<string, unknown>): PlatformOpportunity | null {
  const locationRaw = String(row.locationType ?? row.location_type ?? "india");
  const locationType = locationRaw === "abroad" || locationRaw === "online" ? locationRaw : "india";
  const categoryRaw = typeof row.category === "string" ? row.category.toLowerCase() : "scholarship";
  const category = (CATEGORY_VALUES.has(categoryRaw) ? categoryRaw : "scholarship") as PlatformOpportunityCategory;
  const deadline = typeof row.deadline === "string" ? row.deadline : null;
  if (isPastDeadline(deadline)) return null;
  const id = row.id;
  const name = row.name;
  if (typeof id !== "string" || typeof name !== "string") return null;
  return {
    id,
    name,
    provider: typeof row.provider === "string" ? row.provider : typeof row.organization === "string" ? row.organization : "",
    organization: typeof row.organization === "string" ? row.organization : undefined,
    url: typeof row.url === "string" ? row.url : null,
    deadline,
    amount: typeof row.amount === "string" ? row.amount : null,
    category,
    locationType,
    funded: typeof row.funded === "boolean" ? row.funded : undefined,
    description: typeof row.description === "string" ? row.description : undefined,
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : [],
    skills: Array.isArray(row.skills) ? row.skills.filter((skill): skill is string => typeof skill === "string") : [],
    status: row.status === "draft" || row.status === "pending_review" || row.status === "published" || row.status === "rejected" || row.status === "expired"
      ? row.status
      : "published",
    createdAt: typeof row.created_at === "string" ? row.created_at : typeof row.createdAt === "string" ? row.createdAt : "",
    applicationMode: row.applicationMode === "eligent" || row.applicationMode === "external" ? row.applicationMode : undefined,
  };
}

export function OpportunitiesBrowser() {
  const { savedOpportunityIds, toggleSaveOpportunity } = useEligent();
  const [opportunities, setOpportunities] = useState<PlatformOpportunity[]>([]);
  const [category, setCategory] = useState("all");
  const [locationType, setLocationType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams();
        if (category !== "all") params.set("category", category);
        if (locationType !== "all") params.set("location_type", locationType);
        if (searchQuery.trim()) params.set("search", searchQuery.trim());

        const res = await fetch(`/api/opportunities?${params.toString()}`);
        const data = (await res.json().catch(() => null)) as { opportunities?: unknown; error?: string } | null;
        if (!active) return;
        if (!res.ok || !data || !Array.isArray(data.opportunities)) {
          setOpportunities([]);
          setLoadError(data?.error ?? "The opportunity catalogue is unreachable.");
          return;
        }
        setOpportunities(
          data.opportunities
            .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
            .map((row) => asOpportunity(row))
            .filter((row): row is PlatformOpportunity => row !== null),
        );
      } catch {
        if (active) {
          setOpportunities([]);
          setLoadError("The opportunity catalogue is unreachable.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [category, locationType, searchQuery, attempt]);

  const filtered = useMemo(() => {
    return opportunities.filter((opp) => {
      if (isPastDeadline(opp.deadline)) return false;
      if (category !== "all" && opp.category.toLowerCase() !== category.toLowerCase()) return false;
      if (locationType !== "all" && opp.locationType.toLowerCase() !== locationType.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = opp.name.toLowerCase().includes(q);
        const matchesOrg = (opp.organization ?? opp.provider ?? "").toLowerCase().includes(q);
        const matchesDesc = (opp.description ?? "").toLowerCase().includes(q);
        return matchesName || matchesOrg || matchesDesc;
      }
      return true;
    });
  }, [opportunities, category, locationType, searchQuery]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ClayBadge tone="cobalt" className="!px-3 !py-1.5 !text-[0.82rem]">
              OPPORTUNITIES
            </ClayBadge>
            <span className="text-[0.85rem] font-semibold text-muted">
              Discovery Engine
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Find something worth your time.
          </h1>
          <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-muted">
            Explore curated scholarships, hackathons, internships, and tech events. Filter by location, type, and field.
          </p>
        </div>

        <div>
          <Link href="/opportunities/create">
            <ClayButton variant="soft" icon={<Plus size={16} />}>
              + Create opportunity
            </ClayButton>
          </Link>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="space-y-4 mb-8">
        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, organization, or topic..."
            className="w-full rounded-2xl border border-line/80 bg-surface pl-11 pr-4 py-3 text-[0.95rem] text-ink placeholder:text-soft focus:border-cobalt focus:outline-none"
          />
        </div>

        {/* Categories Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-soft mr-1">
            Category:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`clay-badge !px-3 !py-1.5 !text-[0.8rem] transition-colors cursor-pointer ${
                category === cat.value ? "clay-badge--cobalt" : ""
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Location Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-soft mr-1">
            Location:
          </span>
          {LOCATIONS.map((loc) => (
            <button
              key={loc.value}
              type="button"
              onClick={() => setLocationType(loc.value)}
              className={`clay-badge !px-3 !py-1.5 !text-[0.8rem] transition-colors cursor-pointer ${
                locationType === loc.value ? "clay-badge--cobalt" : ""
              }`}
            >
              {loc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-64 w-full rounded-3xl" />
          ))}
        </div>
      ) : loadError ? (
        <ErrorState
          title="The catalogue is unavailable."
          body="We couldn't load opportunities, so this page stays empty. Sample cards are not shown, and deadlines that have passed are never listed."
          onRetry={() => setAttempt((n) => n + 1)}
        />
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-line/80 bg-surface p-12 text-center">
          <p className="font-display text-xl font-bold text-ink">
            No open opportunities.
          </p>
          <p className="mt-2 text-[0.9rem] text-muted">
            Nothing published is still open for this view. Deadlines that have already passed are hidden.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <ClayButton
              variant="soft"
              onClick={() => {
                setCategory("all");
                setLocationType("all");
                setSearchQuery("");
              }}
            >
              Browse all opportunities
            </ClayButton>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              isSaved={savedOpportunityIds.includes(opp.id)}
              onToggleSave={() => toggleSaveOpportunity(opp.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OpportunityCard({
  opportunity,
  isSaved,
  onToggleSave,
}: {
  opportunity: PlatformOpportunity;
  isSaved: boolean;
  onToggleSave: () => void;
}) {
  const isScholarship = opportunity.category === "scholarship";
  const isEligentHosted = opportunity.applicationMode === "eligent";
  const isExternal = opportunity.applicationMode === "external" && opportunity.url;

  return (
    <ClayCard className="h-full p-6 flex flex-col justify-between hover:shadow-lg transition-shadow">
      <div className="flex-1 space-y-3.5">
        {/* Badges row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <ClayBadge
              tone={isScholarship ? "cobalt" : "lime"}
              className="!px-2.5 !py-1 !text-[0.75rem] uppercase"
            >
              {opportunity.category}
            </ClayBadge>
            <span className="flex items-center gap-1 text-[0.75rem] font-semibold text-muted">
              <MapPin size={12} />
              {opportunity.locationType}
            </span>
          </div>

          <button
            type="button"
            aria-label={isSaved ? "Unsave opportunity" : "Save opportunity"}
            onClick={onToggleSave}
            className={`p-1.5 rounded-lg transition-colors ${
              isSaved ? "bg-cobalt-tint text-cobalt" : "text-soft hover:text-ink"
            }`}
          >
            <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Title & Organization */}
        <div>
          <h3 className="font-display text-lg font-bold tracking-tight text-ink line-clamp-2">
            {opportunity.name}
          </h3>
          <p className="mt-1 text-[0.84rem] font-medium text-soft">
            {opportunity.organization ?? opportunity.provider}
          </p>
        </div>

        {/* Details: Amount & Deadline */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.84rem] font-semibold text-muted">
          {opportunity.amount && (
            <span className="text-cobalt-deep font-bold">{opportunity.amount}</span>
          )}
          <span className="flex items-center gap-1 text-[0.82rem] font-medium">
            <CalendarClock size={14} />
            {opportunity.deadline ? `Deadline ${opportunity.deadline}` : "Rolling deadline"}
          </span>
        </div>

        {/* Description */}
        {opportunity.description && (
          <p className="text-[0.85rem] leading-relaxed text-muted line-clamp-3">
            {opportunity.description}
          </p>
        )}

        {/* Tags */}
        {opportunity.tags && opportunity.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {opportunity.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-surface px-2 py-0.5 text-[0.72rem] font-semibold text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-6 pt-3 border-t border-line/60 flex flex-col gap-2">
        {isScholarship ? (
          <Link href="/matches" className="w-full">
            <ClayButton variant="primary" block size="sm">
              <Sparkles size={14} className="mr-1.5 inline" />
              Check eligibility
            </ClayButton>
          </Link>
        ) : isEligentHosted ? (
          <Link href={`/apply/${opportunity.id}`} className="w-full">
            <ClayButton variant="primary" block size="sm">
              <Sparkles size={14} className="mr-1.5 inline" />
              Apply with ELIGENT
            </ClayButton>
          </Link>
        ) : isExternal ? (
          <>
            <a
              href={opportunity.url!}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <ClayButton variant="soft" block size="sm" icon={<ExternalLink size={14} />}>
                Apply externally
              </ClayButton>
            </a>
            <p className="text-center text-[0.72rem] text-soft">
              Application hosted by {opportunity.organization ?? opportunity.provider}
            </p>
          </>
        ) : (
          <ClayButton variant="soft" block size="sm" disabled>
            Details unavailable
          </ClayButton>
        )}
      </div>
    </ClayCard>
  );
}

