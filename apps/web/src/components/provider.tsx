"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  STORAGE_KEYS,
  readStorage,
  writeStorage,
} from "@/lib/store";
import type {
  ApplicationState,
  ScholarshipReport,
  UserProfile,
} from "@/lib/types";

interface EligentContextValue {
  hydrated: boolean;
  user: UserProfile | null;
  signedIn: boolean;
  applyMode: boolean;
  applications: Record<string, ApplicationState>;
  reports: ScholarshipReport[];
  signIn: () => void;
  signOut: () => void;
  setProfile: (profile: UserProfile) => void;
  unlockApplyMode: () => void;
  getApplication: (scholarshipId: string) => ApplicationState | undefined;
  upsertApplication: (
    scholarshipId: string,
    items: ApplicationState["items"],
  ) => void;
  getReports: (scholarshipId: string) => ScholarshipReport[];
  submitReport: (report: Omit<ScholarshipReport, "id" | "createdAt">) => void;
}

const EligentContext = createContext<EligentContextValue | null>(null);

export function EligentProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [applyMode, setApplyMode] = useState(false);
  const [applications, setApplications] = useState<
    Record<string, ApplicationState>
  >({});
  const [reports, setReports] = useState<ScholarshipReport[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setUser(readStorage<UserProfile | null>(STORAGE_KEYS.user, null));
      setSignedIn(readStorage(STORAGE_KEYS.auth, false));
      setApplyMode(readStorage(STORAGE_KEYS.applyMode, false));
      setHydrated(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const signIn = useCallback(() => {
    setSignedIn(true);
    writeStorage(STORAGE_KEYS.auth, true);
  }, []);

  const signOut = useCallback(() => {
    setSignedIn(false);
    setUser(null);
    writeStorage(STORAGE_KEYS.auth, false);
    writeStorage(STORAGE_KEYS.user, null);
  }, []);

  const setProfile = useCallback((profile: UserProfile) => {
    setUser(profile);
    setSignedIn(true);
    writeStorage(STORAGE_KEYS.user, profile);
    writeStorage(STORAGE_KEYS.auth, true);
  }, []);

  const unlockApplyMode = useCallback(() => {
    setApplyMode(true);
    writeStorage(STORAGE_KEYS.applyMode, true);
  }, []);

  const getApplication = useCallback(
    (scholarshipId: string) => applications[scholarshipId],
    [applications],
  );

  const upsertApplication = useCallback(
    (scholarshipId: string, items: ApplicationState["items"]) => {
      setApplications((prev) => {
        const next = {
          ...prev,
          [scholarshipId]: { scholarshipId, items, lastUpdated: Date.now() },
        };
        writeStorage(STORAGE_KEYS.application(scholarshipId), next[scholarshipId]);
        return next;
      });
    },
    [],
  );

  const getReports = useCallback(
    (scholarshipId: string) => reports.filter((r) => r.scholarshipId === scholarshipId),
    [reports],
  );

  const submitReport = useCallback(
    (report: Omit<ScholarshipReport, "id" | "createdAt">) => {
      setReports((prev) => {
        const next = [
          { ...report, id: `report-${report.scholarshipId}-${Date.now()}`, createdAt: Date.now() },
          ...prev,
        ];
        writeStorage(STORAGE_KEYS.reports, next);
        return next;
      });
    },
    [],
  );

  const value = useMemo<EligentContextValue>(
    () => ({
      hydrated,
      user,
      signedIn,
      applyMode,
      applications,
      reports,
      signIn,
      signOut,
      setProfile,
      unlockApplyMode,
      getApplication,
      upsertApplication,
      getReports,
      submitReport,
    }),
    [
      hydrated,
      user,
      signedIn,
      applyMode,
      applications,
      reports,
      signIn,
      signOut,
      setProfile,
      unlockApplyMode,
      getApplication,
      upsertApplication,
      getReports,
      submitReport,
    ],
  );

  return <EligentContext.Provider value={value}>{children}</EligentContext.Provider>;
}

export function useEligent(): EligentContextValue {
  const ctx = useContext(EligentContext);
  if (!ctx) throw new Error("useEligent must be used within EligentProvider");
  return ctx;
}