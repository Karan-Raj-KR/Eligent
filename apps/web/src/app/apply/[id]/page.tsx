"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  IndianRupee,
  Rocket,
  ShieldX,
  Flag,
} from "lucide-react";
import { useEligent } from "@/components/provider";
import { ClayBadge, ClayButton, ClayCard } from "@/components/clay";
import { DetailLoading } from "@/components/states";
import { EligibilityVerified } from "@/components/application/eligibility-verified";
import {
  CommunityRequirement,
  RequirementItem,
} from "@/components/application/requirements";
import { ReadinessCount } from "@/components/application/readiness-count";
import { ApplyModeGate } from "@/components/application/apply-mode-gate";
import { ReportModal } from "@/components/behavior/report-modal";
import type { ApplicationState, ReportTopic } from "@/lib/types";

export default function ApplyPage() {
  const params = useParams<{ id: string }>();
  const {
    hydrated,
    signedIn,
    user,
    applyMode,
    unlockApplyMode,
    getMatch,
    startApplication,
    setRequirement,
    submitReport,
    reports,
  } = useEligent();
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);
  const [app, setApp] = useState<ApplicationState | null>(null);
  const [appError, setAppError] = useState<string | null>(null);

  const match = getMatch(params.id);
  const eligible = match?.status === "ELIGIBLE";

  // Creating the application is what materialises its document checklist
  // (official rows + community-reported extras) server-side. Only ever for a
  // scholarship the engine already cleared.
  useEffect(() => {
    if (!eligible || app) return;
    let cancelled = false;
    void (async () => {
      try {
        const next = await startApplication(params.id);
        if (!cancelled) setApp(next);
      } catch (err) {
        if (!cancelled) setAppError(err instanceof Error ? err.message : "Could not open this application.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eligible, app, params.id, startApplication]);

  useEffect(() => {
    if (!hydrated) return;
    if (!signedIn) router.replace("/signin");
    else if (!user) router.replace("/onboarding");
  }, [hydrated, signedIn, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <DetailLoading />
      </div>
    );
  }

  if (!match) {
    router.replace("/matches");
    return null;
  }
  const sc = match.scholarship;

  const allRequired = app?.requirements ?? [];
  const officialReqs = allRequired.filter((r) => r.source === "official");
  const communityReqs = allRequired.filter((r) => r.source === "community");
  const total = allRequired.length;
  const ready = allRequired.filter((r) => app?.items[r.id] === "have").length;
  const firstMissing = allRequired.find((r) => app?.items[r.id] !== "have");

  function setAvailability(requirementId: string, value: "have" | "dont") {
    setApp((prev) =>
      prev ? { ...prev, items: { ...prev.items, [requirementId]: value }, lastUpdated: Date.now() } : prev,
    );
    if (app) void setRequirement(app.applicationId, requirementId, value);
  }

  function handleReport(topic: ReportTopic, details: string) {
    void submitReport({ scholarshipId: sc.id, topic, details });
  }

  const existingReports = reports.filter((r) => r.scholarshipId === sc.id);

  if (match.status !== "ELIGIBLE") {
    return (
      <EligibilityBlocked
        matchLabel={match.status === "NEAR_MISS" ? "near miss" : "not eligible"}
        lines={match.results
          .filter((r) => r.status !== "pass")
          .map((r) => r.criterion.sourceText ?? r.detail)}
        scholarshipTitle={sc.title}
        onReport={() => setReportOpen(true)}
        onNavigate={() => router.push("/matches")}
        existingReportCount={existingReports.length}
        onSubmit={handleReport}
        reportOpen={reportOpen}
        onCloseReport={() => setReportOpen(false)}
      />
    );
  }

  const nextText = firstMissing
    ? `NEXT: Get your ${firstMissing.label.toLowerCase()} before you start.`
    : "NEXT: Everything's ready — submit.";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/matches"
        className="inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden /> Back to matches
      </Link>

      <div className="mt-8">
        <p className="text-[0.92rem] font-semibold text-soft">{sc.provider}</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {sc.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.95rem] font-semibold">
          {sc.amount && (
            <span className="flex items-center gap-1.5 text-cobalt-deep">
              <IndianRupee size={16} aria-hidden />
              {sc.amount}
            </span>
          )}
          <span className="flex items-center gap-1.5 font-medium text-muted">
            <CalendarClock size={16} aria-hidden />
            {sc.deadline ? `Deadline ${sc.deadline}` : "Deadline not stated"}
          </span>
        </div>
      </div>

      {/* Handoff to the Chrome extension. The extension needs the *application*
          id (that's what /api/fill/:application_id takes), which only exists
          once this page has created the application row — it can't be derived
          from the URL, which carries the opportunity id. apps/extension/src/bridge.ts
          reads these attributes. */}
      {app && (
        <span
          hidden
          data-eligent-application-id={app.applicationId}
          data-eligent-application-name={sc.title}
        />
      )}

      <div className="mt-8">
        <EligibilityVerified match={match} />
      </div>

      {/* OFFICIAL REQUIREMENTS */}
      <section aria-labelledby="need-heading" className="mt-14">
        <h2 id="need-heading" className="font-display text-xl font-bold tracking-tight text-ink">
          What you need
        </h2>
        <div className="mt-3 flex items-center gap-2">
          <ClayBadge tone="cobalt">OFFICIAL</ClayBadge>
          <p className="text-[0.84rem] text-muted">
            Listed by the provider
          </p>
        </div>
        {appError && (
          <p role="alert" className="mt-4 text-[0.88rem] font-semibold text-coral-deep">
            {appError}
          </p>
        )}
        {!app && !appError && (
          <p className="mt-4 text-[0.88rem] text-muted">Loading your document checklist…</p>
        )}
        {app && officialReqs.length === 0 && (
          <p className="mt-4 text-[0.88rem] text-muted">
            This opportunity has no official document list recorded yet.
          </p>
        )}
        <ul className="mt-4 space-y-2.5">
          {officialReqs.map((req) => (
            <RequirementItem
              key={req.id}
              item={req}
              value={app?.items[req.id]}
              onChange={(v) => setAvailability(req.id, v)}
            />
          ))}
        </ul>
      </section>

      {/* COMMUNITY REQUIREMENTS */}
      {communityReqs.length > 0 && (
        <section aria-labelledby="community-heading" className="mt-12">
          <h2 id="community-heading" className="font-display text-xl font-bold tracking-tight text-ink">
            Community-reported
          </h2>
          <div className="mt-3 flex items-center gap-2">
            <ClayBadge tone="coral">NOT OFFICIALLY LISTED</ClayBadge>
            <p className="text-[0.84rem] text-muted">
              Reported by previous applicants
            </p>
          </div>
          <ul className="mt-4 space-y-2.5">
            {communityReqs.map((req) => (
              <CommunityRequirement
                key={req.id}
                item={req}
                value={app?.items[req.id]}
                onChange={(v) => setAvailability(req.id, v)}
              />
            ))}
          </ul>
        </section>
      )}

      {/* READINESS */}
      <section aria-labelledby="readiness-heading" className="mt-12">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id="readiness-heading" className="font-display text-xl font-bold tracking-tight text-ink">
            Ready to submit
          </h2>
          <p className="text-[0.82rem] text-soft">Counts only — no score.</p>
        </div>
        <ClayCard tone="lime" className="p-6">
          <ReadinessCount ready={ready} total={total} />
          <p className="mt-2 max-w-md text-[0.88rem] leading-relaxed text-muted">
            {ready === total
              ? "Every document is accounted for. Open Apply Mode and the extension will fill the form."
              : "Mark what you have. ELIGENT only counts — it won't estimate your chances."}
          </p>
        </ClayCard>
      </section>

      {/* APPLY MODE */}
      <div id="unlock" className="mt-12 scroll-mt-28">
        <ApplyModeGate
          unlocked={applyMode}
          onUnlock={() => unlockApplyMode()}
          scholarshipTitle={sc.title}
          opportunityId={sc.id}
        />
      </div>

      {/* NEXT ACTION */}
      <section aria-labelledby="next-heading" className="mt-12">
        <ClayCard topAccent="coral" className="p-6 sm:p-7">
          <p id="next-heading" className="kicker text-coral">
            What's next
          </p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-[1.7rem]">
            {nextText}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {applyMode ? (
              <Link href="/extension">
                <ClayButton
                  variant="primary"
                  icon={<Rocket size={17} />}
                >
                  Open Apply Mode
                </ClayButton>
              </Link>
            ) : (
              <a href="#unlock">
                <ClayButton variant="primary" icon={<Rocket size={17} />}>
                  Unlock Apply Mode
                </ClayButton>
              </a>
            )}
            <ClayButton
              variant="ghost"
              icon={<Flag size={16} />}
              onClick={() => setReportOpen(true)}
            >
              Report what happened
            </ClayButton>
          </div>
        </ClayCard>
      </section>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        scholarshipTitle={sc.title}
        onSubmit={handleReport}
        existingReportCount={existingReports.length}
      />
    </div>
  );
}

interface BlockedProps {
  matchLabel: string;
  lines: string[];
  scholarshipTitle: string;
  onReport: () => void;
  onNavigate: () => void;
  existingReportCount: number;
  onSubmit: (topic: ReportTopic, details: string) => void;
  reportOpen: boolean;
  onCloseReport: () => void;
}

function EligibilityBlocked({
  matchLabel,
  lines,
  scholarshipTitle,
  onReport,
  onNavigate,
  existingReportCount,
  onSubmit,
  reportOpen,
  onCloseReport,
}: BlockedProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <Link
        href="/matches"
        className="inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden /> Back to matches
      </Link>

      <ClayCard tone="coral" className="mt-8 p-7 sm:p-10">
        <span
          aria-hidden
          className="grid size-14 place-items-center rounded-2xl bg-coral-tint text-coral-deep"
        >
          <ShieldX size={26} />
        </span>
        <ClayBadge tone="coral" className="mt-5 !px-3 !py-1.5 !text-[0.82rem]">
          {matchLabel.toUpperCase()}
        </ClayBadge>
        <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          You're not eligible for this one.
        </h1>
        <ul className="mt-6 space-y-2.5">
          {lines.map((line) => (
            <li
              key={line}
              className="flex items-start gap-3 rounded-xl border border-coral/30 bg-surface/70 px-4 py-3"
            >
              <span
                aria-hidden
                className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-coral-tint text-coral-deep"
              >
                ✕
              </span>
              <span className="text-[0.92rem] font-medium text-ink">{line}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 rounded-2xl border border-coral/35 bg-coral-tint/80 px-5 py-4">
          <p className="text-[0.95rem] font-bold text-coral-deep">
            {scholarshipTitle} — we checked, you don't qualify.
          </p>
          <p className="mt-1 text-[0.86rem] leading-relaxed text-coral-deep/80">
            Eligent won't fill this form. We're not going to waste your time.
          </p>
        </div>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <ClayButton variant="primary" onClick={onNavigate}>
            See what you qualify for <ArrowRight size={16} />
          </ClayButton>
          <ClayButton variant="ghost" icon={<Flag size={16} />} onClick={onReport}>
            Report what happened
          </ClayButton>
        </div>
      </ClayCard>

      <ReportModal
        open={reportOpen}
        onClose={onCloseReport}
        scholarshipTitle={scholarshipTitle}
        onSubmit={onSubmit}
        existingReportCount={existingReportCount}
      />
    </div>
  );
}