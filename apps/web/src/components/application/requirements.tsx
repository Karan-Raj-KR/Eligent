"use client";

import { Check, FileText, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ItemAvailability, Requirement } from "@/lib/types";

interface RequirementItemProps {
  item: Requirement;
  value: ItemAvailability | undefined;
  onChange: (value: "have" | "dont") => void;
}

/**
 * OFFICIAL requirement — institutional, structured, cobalt + white.
 */
export function RequirementItem({ item, value, onChange }: RequirementItemProps) {
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-clay-sm)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-cobalt-tint text-cobalt-deep"
        >
          <FileText size={15} />
        </span>
        <div>
          <p className="text-[0.95rem] font-semibold text-ink">{item.label}</p>
          {item.note && <p className="mt-0.5 text-[0.83rem] text-muted">{item.note}</p>}
        </div>
      </div>
      <AvailabilityToggle
        value={value}
        onChange={onChange}
        coral={false}
        label={item.label}
      />
    </li>
  );
}

/**
 * COMMUNITY-REPORTED requirement — cream surface, coral accent.
 * Never called "verified": always "Reported by N applicants".
 */
export function CommunityRequirement({
  item,
  value,
  onChange,
}: Omit<RequirementItemProps, "index">) {
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-coral/35 bg-[#fff5eb] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-coral-tint text-coral-deep"
        >
          ⚠
        </span>
        <div>
          <p className="text-[0.95rem] font-semibold text-ink">{item.label}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[0.8rem] font-semibold text-coral-deep">
            Not in the official requirements
          </p>
          <p className="mt-0.5 text-[0.83rem] text-muted">
            Reported by {item.communityReportCount ?? 0} applicants
            {item.note ? ` · ${item.note}` : ""}
          </p>
        </div>
      </div>
      <AvailabilityToggle
        value={value}
        onChange={onChange}
        coral
        label={item.label}
      />
    </li>
  );
}

function AvailabilityToggle({
  value,
  onChange,
  coral,
  label,
}: {
  value: ItemAvailability | undefined;
  onChange: (value: "have" | "dont") => void;
  coral: boolean;
  label: string;
}) {
  const isHave = value === "have";
  const isDont = value === "dont";

  const haveClass = coral
    ? "clay-btn--primary !min-h-[36px] !px-3.5 !text-[0.82rem]"
    : "clay-btn--primary !min-h-[36px] !px-3.5 !text-[0.82rem]";
  const dontClass = coral
    ? "clay-btn !border-coral/40 !bg-surface !text-coral-deep !min-h-[36px] !px-3.5 !text-[0.82rem] hover:!bg-coral-tint"
    : "clay-btn--soft !min-h-[36px] !px-3.5 !text-[0.82rem]";

  return (
    <div
      role="group"
      aria-label={`Do you ${isHave ? "still have" : "have"} ${label}?`}
      className="flex items-center gap-2"
    >
      {isHave ? (
        <button
          type="button"
          aria-pressed="true"
          onClick={() => onChange("dont")}
          className={cn("clay-btn", haveClass)}
        >
          <Check size={14} strokeWidth={3} /> I have this
        </button>
      ) : (
        <button
          type="button"
          aria-pressed="false"
          onClick={() => onChange("have")}
          className={cn(isDont ? "clay-btn !min-h-[36px] !px-3.5 !text-[0.82rem]" : "clay-btn !min-h-[36px] !px-3.5 !text-[0.82rem]")}
        >
          <Check size={14} strokeWidth={3} /> I have this
        </button>
      )}

      <button
        type="button"
        aria-pressed={isDont}
        onClick={() => onChange(isDont ? "have" : "dont")}
        className={cn("clay-btn", !isHave && isDont && dontClass)}
      >
        <X size={14} strokeWidth={3} /> I don't
      </button>

      {isHave || isDont ? (
        <span className="sr-only">
          {isHave ? "marked as available" : "marked as not available"}
        </span>
      ) : null}
    </div>
  );
}