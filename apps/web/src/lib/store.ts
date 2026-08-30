import type { ApplicationState, ScholarshipReport, UserProfile } from "@/lib/types";

export const STORAGE_KEYS = {
  user: "eligent.user",
  auth: "eligent.auth",
  applyMode: "eligent.applyMode",
  application: (id: string) => `eligent.application.${id}`,
  reports: "eligent.reports",
} as const;

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function defaultApplicationState(
  scholarshipId: string,
  officialLabels: string[],
): ApplicationState {
  const items: ApplicationState["items"] = {};
  for (const label of officialLabels) {
    const have =
      /marksheet|income certificate/i.test(label);
    items[label] = have ? "have" : "dont";
  }
  return { scholarshipId, items, lastUpdated: Date.now() };
}

export function applicationReadyCount(
  application: ApplicationState | undefined,
  officialLabels: string[],
  communityLabels: string[],
): { ready: number; total: number } {
  const total = officialLabels.length + communityLabels.length;
  const flag = (a: ApplicationState | undefined, label: string) =>
    a?.items[label] === "have";
  const ready =
    officialLabels.filter((l) => flag(application, l)).length +
    communityLabels.filter((l) => flag(application, l)).length;
  return { ready, total };
}

export function newReportId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isApplyModeUnlocked(): boolean {
  return readStorage(STORAGE_KEYS.applyMode, false);
}

export type { ScholarshipReport, UserProfile };