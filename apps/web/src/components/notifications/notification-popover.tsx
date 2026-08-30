"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Sparkles, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { useEligent } from "@/components/provider";
import { ClayBadge } from "@/components/clay";
import { cn } from "@/lib/cn";
import type { NotificationItem, NotificationType } from "@/lib/types";

const TypeIconMap: Record<NotificationType, typeof Bell> = {
  matching_opportunity: Sparkles,
  deadline_approaching: Clock,
  status_changed: CheckCircle2,
  community_report: AlertCircle,
  general: Bell,
};



const TypeLabelMap: Record<NotificationType, string> = {
  matching_opportunity: "MATCH",
  deadline_approaching: "URGENT",
  status_changed: "STATUS",
  community_report: "REPORT",
  general: "INFO",
};

export function NotificationPopover() {
  const { notifications, unreadNotificationsCount, markNotificationRead, markAllNotificationsRead } = useEligent();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const filtered = notifications.filter((n) => {
    if (tab === "unread") return !n.isRead;
    return true;
  });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="clay-btn relative !min-h-[42px] !min-w-[42px] !p-0 grid place-items-center rounded-xl"
      >
        <Bell size={18} className="text-ink" />
        {unreadNotificationsCount > 0 && (
          <span
            className="absolute -top-1 -right-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-coral px-1 text-[0.7rem] font-bold text-white shadow-sm"
          >
            {unreadNotificationsCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label="Notifications Panel"
          className="clay absolute right-0 top-[calc(100%+10px)] z-50 w-80 sm:w-96 rounded-2xl p-4 shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-line/60">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-[0.98rem] font-bold tracking-tight text-ink">
                Notifications
              </h3>
              {unreadNotificationsCount > 0 && (
                <span className="rounded-full bg-cobalt/10 px-2 py-0.5 text-[0.72rem] font-bold text-cobalt">
                  {unreadNotificationsCount} unread
                </span>
              )}
            </div>

            {unreadNotificationsCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllNotificationsRead()}
                className="flex items-center gap-1 text-[0.78rem] font-semibold text-cobalt hover:underline"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 py-2.5">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={`rounded-lg px-3 py-1 text-[0.78rem] font-semibold transition-colors ${
                tab === "all"
                  ? "bg-ink text-bg"
                  : "bg-surface text-muted hover:text-ink"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("unread")}
              className={`rounded-lg px-3 py-1 text-[0.78rem] font-semibold transition-colors ${
                tab === "unread"
                  ? "bg-ink text-bg"
                  : "bg-surface text-muted hover:text-ink"
              }`}
            >
              Unread ({unreadNotificationsCount})
            </button>
          </div>

          {/* Notification Items List */}
          <div className="mt-1 max-h-80 overflow-y-auto space-y-2 pr-1">
            {filtered.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto grid size-10 place-items-center rounded-full bg-surface text-soft">
                  <Bell size={20} />
                </div>
                <p className="mt-2 text-[0.88rem] font-semibold text-ink">
                  You&apos;re all caught up.
                </p>
                <p className="text-[0.78rem] text-muted">
                  No new notifications right now.
                </p>
              </div>
            ) : (
              filtered.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onRead={(id) => markNotificationRead(id)}
                  onClose={() => setOpen(false)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  item,
  onRead,
  onClose,
}: {
  item: NotificationItem;
  onRead: (id: string) => void;
  onClose: () => void;
}) {
  const Icon = TypeIconMap[item.type] || Bell;

  const content = (
    <div
      onClick={() => {
        if (!item.isRead) onRead(item.id);
        onClose();
      }}
      className={cn(
        "group flex items-start gap-3 rounded-xl p-3 text-left transition-colors cursor-pointer border border-transparent",
        item.isRead ? "bg-surface/50 hover:bg-surface" : "bg-white clay-raised hover:border-cobalt/20",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg mt-0.5",
          item.isRead ? "bg-surface text-muted" : "bg-cobalt-tint text-cobalt",
        )}
      >
        <Icon size={16} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-[0.86rem] font-bold text-ink truncate">
            {item.title}
          </span>
          <ClayBadge
            tone={item.type === "deadline_approaching" ? "coral" : "cobalt"}
            className="!px-2 !py-0.5 !text-[0.68rem] shrink-0"
          >
            {TypeLabelMap[item.type]}
          </ClayBadge>
        </div>
        <p className="mt-0.5 text-[0.8rem] leading-relaxed text-muted line-clamp-2">
          {item.message}
        </p>
      </div>
    </div>
  );

  if (item.link) {
    return <Link href={item.link}>{content}</Link>;
  }

  return content;
}
