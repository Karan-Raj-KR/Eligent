"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { ClayBadge, ClayCard } from "@/components/clay";
import { cn } from "@/lib/cn";
import type { MatchResult } from "@/lib/types";

/**
 * NOT_ELIGIBLE cards are collapsed by default. They are never greyed out —
 * each one proves ELIGENT actually evaluated the opportunity.
 */
export function RejectedCard({ match }: { match: MatchResult }) {
  const { scholarship } = match;
  const [open, setOpen] = useState(false);
  const headline = match.results.find((r) => r.status === "fail");

  return (
    <ClayCard raised={false} className="overflow-hidden !rounded-[20px] p-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <ClayBadge tone="coral" className="!px-2.5 !py-1 !text-[0.72rem]">
            NOT ELIGIBLE
          </ClayBadge>
          <h4 className="font-display text-[1.05rem] font-bold tracking-tight text-ink">
            {scholarship.title}
          </h4>
          {headline && (
            <p className="w-full text-[0.86rem] font-semibold text-coral-deep sm:w-auto">
              {headline.reason}
            </p>
          )}
        </div>
        <ChevronDown
          size={18}
          className={cn(
            "shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-250 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <div className="border-t border-line pt-4">
              <ul className="space-y-3">
                {match.failures.map((failure) => (
                  <li
                    key={failure.criterion.id}
                    className="flex items-start gap-3"
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-coral-tint text-coral-deep"
                    >
                      <X size={13} strokeWidth={3} />
                    </span>
                    <div>
                      <p className="text-[0.92rem] font-semibold text-ink">
                        {failure.comparison}
                      </p>
                      <p className="text-[0.85rem] text-muted">
                        {failure.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[0.8rem] text-soft">
                Evaluated against official criteria — this is why ELIGENT said no.
                No application was started.
              </p>
              <Link
                href={`/opportunity/${scholarship.id}`}
                className="mt-2 inline-block text-[0.85rem] font-semibold text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink"
              >
                View official requirements
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ClayCard>
  );
}