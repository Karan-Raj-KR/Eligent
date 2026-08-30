"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Menu, UserRound, X } from "lucide-react";
import { useEligent } from "@/components/provider";
import { ClayButton, Logo } from "@/components/clay";
import { cn } from "@/lib/cn";

import { NotificationPopover } from "@/components/notifications/notification-popover";

function NavLinks({ onNavigate, signedIn }: { onNavigate?: () => void; signedIn: boolean }) {
  return (
    <>
      <Link
        href={signedIn ? "/matches" : "/signin"}
        onClick={onNavigate}
        className="rounded-lg px-2 py-1.5 text-[0.9rem] font-medium text-muted transition-colors hover:text-ink"
      >
        Matches
      </Link>
      <Link
        href="/opportunities"
        onClick={onNavigate}
        className="rounded-lg px-2 py-1.5 text-[0.9rem] font-medium text-muted transition-colors hover:text-ink"
      >
        Opportunities
      </Link>
      <Link
        href="/matches#how-it-works"
        onClick={onNavigate}
        className="rounded-lg px-2 py-1.5 text-[0.9rem] font-medium text-muted transition-colors hover:text-ink"
      >
        How it works
      </Link>
    </>
  );
}

function UserMenu() {
  const { user, signOut, hydrated } = useEligent();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  if (!hydrated) return <div className="skeleton h-10 w-24" />;

  const initial = (user?.name ?? "U").charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="clay-btn !min-h-[42px] !gap-2 !px-3"
      >
        <span
          aria-hidden
          className="grid size-7 place-items-center rounded-[10px] bg-cobalt text-[0.8rem] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"
        >
          {initial}
        </span>
        <span className="max-w-28 truncate">{user?.name?.split(" ")[0] ?? "Student"}</span>
        <ChevronDown size={15} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="menu"
          className="clay absolute right-0 top-[calc(100%+8px)] z-30 w-56 p-2"
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.9rem] font-medium text-ink transition-colors hover:bg-cobalt-tint"
          >
            <UserRound size={16} /> My profile
          </Link>
          <Link
            href="/matches"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.9rem] font-medium text-ink transition-colors hover:bg-cobalt-tint"
          >
            <UserRound size={16} /> Scholarship matches
          </Link>
          <Link
            href="/opportunities/my"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.9rem] font-medium text-ink transition-colors hover:bg-cobalt-tint"
          >
            <UserRound size={16} /> My created items
          </Link>
          <div className="rule my-1.5" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.9rem] font-medium text-coral-deep transition-colors hover:bg-coral-tint"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const { signedIn, signOut } = useEligent();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href={signedIn ? "/matches" : "/signin"} aria-label="ELIGENT home">
            <Logo />
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            <NavLinks signedIn={signedIn} />
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {signedIn ? (
            <>
              <Link
                href="/opportunities/create"
                className="clay-badge !px-3 !py-1.5 !text-[0.82rem] transition-colors hover:bg-cobalt-tint"
              >
                + Create
              </Link>
              <NotificationPopover />
              <div className="h-6 w-px bg-line" aria-hidden />
              <UserMenu />
            </>
          ) : (
            <ClayButton
              size="sm"
              variant="soft"
              onClick={() => router.push("/signin")}
            >
              Sign in
            </ClayButton>
          )}
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
          className="clay-btn !min-h-[42px] !px-3 md:hidden"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-line/70 bg-surface md:hidden">
          <nav aria-label="Mobile" className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 sm:px-6">
            <NavLinks signedIn={signedIn} onNavigate={() => setMobileOpen(false)} />
            {signedIn ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-2 py-1.5 text-[0.9rem] font-medium text-muted hover:text-ink"
                >
                  My profile
                </Link>
                <Link
                  href="/opportunities/create"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-2 py-1.5 text-[0.9rem] font-medium text-cobalt hover:text-ink"
                >
                  + Create opportunity
                </Link>
                <div className="rule my-2" />
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    signOut();
                  }}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[0.9rem] font-medium text-coral-deep"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </>
            ) : (
              <Link
                href="/signin"
                onClick={() => setMobileOpen(false)}
                className="mt-2"
              >
                <ClayButton size="sm" variant="soft" block>
                  Sign in
                </ClayButton>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export { SiteFooter } from "@/components/site-footer";