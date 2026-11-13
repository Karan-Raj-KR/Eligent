/** Calendar day in India. Opportunity deadlines are dates, not timestamps. */
export function todayISOInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * A deadline of today is still open. Null means no fixed deadline.
 * Unparseable values are treated as open so a bad string cannot hide a row
 * that we failed to read.
 */
export function isPastDeadline(
  deadline: string | null | undefined,
  today: string = todayISOInIndia(),
): boolean {
  if (!deadline) return false;
  const day = deadline.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  return day < today;
}
