"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HorizontalScholarshipRowProps {
  /** Section id for anchor links */
  id: string;
  /** aria heading id */
  headingId: string;
  /** Small uppercase kicker above the title */
  kicker: string;
  /** Section title, e.g. "Eligible" */
  title: string;
  /** Number of items */
  count: number;
  /** Descriptive caption below the title */
  caption: string;
  /** The card elements to render horizontally */
  children: ReactNode;
}

export function HorizontalScholarshipRow({
  id,
  headingId,
  kicker,
  title,
  count,
  caption,
  children,
}: HorizontalScholarshipRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Initial check after a brief delay (cards may still be painting)
    const raf = requestAnimationFrame(checkScroll);

    el.addEventListener("scroll", checkScroll, { passive: true });
    // Also track resize so breakpoint-driven card width changes are caught
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll by approximately one card width + gap
    const card = el.querySelector<HTMLElement>(".scroll-row-card");
    const distance = card ? card.offsetWidth + 20 : 370;
    el.scrollBy({
      left: direction === "right" ? distance : -distance,
      behavior: "smooth",
    });
  };

  return (
    <section id={id} aria-labelledby={headingId} className="mt-16 scroll-mt-28">
      {/* Header with arrows */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
        <div>
          <p className="kicker text-muted">{kicker}</p>
          <h2
            id={headingId}
            className="mt-1 font-display text-[1.7rem] font-bold tracking-tight text-ink sm:text-3xl"
          >
            {title}{" "}
            <span className="font-medium text-muted">· {count}</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <p className="mr-1 hidden text-[0.86rem] leading-relaxed text-muted sm:block">
            {caption}
          </p>
          {/* Navigation arrows — hidden on mobile (swipe is natural there) */}
          {canScrollLeft && (
            <div className="items-center gap-2">
              <button
                type="button"
                className="scroll-row-nav"
                onClick={() => scroll("left")}
                aria-label="Previous scholarships"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          )}
          {canScrollRight && (
            <div className="items-center gap-2">
              <button
                type="button"
                className="scroll-row-nav"
                onClick={() => scroll("right")}
                aria-label="Next scholarships"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile-only caption (below heading, above cards) */}
      <p className="mb-4 text-[0.86rem] leading-relaxed text-muted sm:hidden">
        {caption}
      </p>

      {/* Scroll container */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="scroll-row"
          role="region"
          aria-label={`${title} scholarships — scroll horizontally`}
          tabIndex={0}
        >
          {children}
        </div>

        {/* Right fade edge hint */}
        {canScrollRight && <div className="scroll-row-fade" aria-hidden />}
      </div>
    </section>
  );
}
