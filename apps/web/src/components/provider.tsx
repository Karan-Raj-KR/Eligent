"use client";

// The app's single data hub. Everything the UI renders comes through here.
//
// Replaces the prototype's localStorage + bundled-mock-data provider with the
// real thing: anonymous Supabase auth for identity, and our own API routes for
// profile, matches, applications and reports. No mock data, no client-side
// eligibility — /api/matches returns the engine's verdict already decided.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase";
import {
  fromUserProfile,
  toCounts,
  toGroups,
  toRequirement,
  toUserProfile,
  type ApiMatchesResponse,
  type ApiProfile,
  type ApiRequirement,
} from "@/lib/adapt";
import { STORAGE_KEYS, readStorage, writeStorage } from "@/lib/store";
import type {
  ApplicationState,
  ItemAvailability,
  MatchCounts,
  MatchGroups,
  MatchResult,
  ReportTopic,
  ScholarshipReport,
  UserProfile,
} from "@/lib/types";

/** Our /api/report vocabulary. The UI's topics map onto it exactly. */
const REPORT_TYPE: Record<ReportTopic, string> = {
  "The deadline was wrong": "wrong_deadline",
  "It asked for a document that wasn't listed": "extra_document",
  "There was a file size or format limit": "file_limit",
  "The criteria didn't match what was listed": "criteria_mismatch",
  "Applications are closed": "closed",
  "Something else": "other",
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

interface EligentContextValue {
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  user: UserProfile | null;
  signedIn: boolean;
  applyMode: boolean;
  groups: MatchGroups | null;
  counts: MatchCounts | null;
  reports: ScholarshipReport[];
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  setProfile: (profile: UserProfile) => Promise<void>;
  unlockApplyMode: () => void;
  getMatch: (scholarshipId: string) => MatchResult | undefined;
  refresh: () => Promise<void>;
  startApplication: (scholarshipId: string) => Promise<ApplicationState | null>;
  setRequirement: (
    applicationId: string,
    requirementId: string,
    value: ItemAvailability,
  ) => Promise<void>;
  submitReport: (report: { scholarshipId: string; topic: ReportTopic; details: string }) => Promise<void>;
}

const EligentContext = createContext<EligentContextValue | null>(null);

export function EligentProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [applyMode, setApplyMode] = useState(false);
  const [groups, setGroups] = useState<MatchGroups | null>(null);
  const [reports, setReports] = useState<ScholarshipReport[]>([]);

  const supabase = useMemo(() => createClient(), []);

  /** Loads the profile, and the matches if the profile is complete enough. */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // The profile is read straight from Postgres rather than through an
      // endpoint: RLS already scopes `profile` to auth.uid(), and /api/profile
      // is write-only. Reading it here avoids growing the API for the UI.
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        setSignedIn(false);
        setUser(null);
        setGroups(null);
        return;
      }

      const { data: profileRow } = await supabase
        .from("profile")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();
      const profile = toUserProfile((profileRow as ApiProfile | null) ?? null);
      setUser(profile);

      // No usable profile yet -> /api/matches would 400. Onboarding comes first.
      if (!profile) {
        setGroups(null);
        return;
      }

      const res = await fetch("/api/matches");
      if (res.status === 401) {
        setSignedIn(false);
        setGroups(null);
        return;
      }
      if (res.status === 400) {
        setGroups(null);
        return;
      }
      setGroups(toGroups(await json<ApiMatchesResponse>(res)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your matches.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Establish identity, then load. Anonymous auth only — no OAuth, no redirects.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session) {
        setSignedIn(true);
        await load();
      }
      setApplyMode(readStorage(STORAGE_KEYS.applyMode, false));
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, load]);

  const signIn = useCallback(async () => {
    setError(null);
    const { error: authError } = await supabase.auth.signInAnonymously();
    if (authError) {
      setError(authError.message);
      return;
    }
    setSignedIn(true);
    await load();
  }, [supabase, load]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSignedIn(false);
    setUser(null);
    setGroups(null);
  }, [supabase]);

  const setProfile = useCallback(
    async (profile: UserProfile) => {
      setError(null);
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fromUserProfile(profile)),
      });
      await json<ApiProfile>(res);
      setUser(profile);
      await load();
    },
    [load],
  );

  const unlockApplyMode = useCallback(() => {
    setApplyMode(true);
    writeStorage(STORAGE_KEYS.applyMode, true);
  }, []);

  const getMatch = useCallback(
    (scholarshipId: string) =>
      groups
        ? [...groups.eligible, ...groups.nearMiss, ...groups.notEligible].find(
            (m) => m.scholarship.id === scholarshipId,
          )
        : undefined,
    [groups],
  );

  const startApplication = useCallback(
    async (scholarshipId: string): Promise<ApplicationState | null> => {
      const res = await fetch("/api/application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity_id: scholarshipId }),
      });
      const data = await json<{ application: { id: string }; requirements: ApiRequirement[] }>(res);

      const items: Record<string, ItemAvailability> = {};
      for (const r of data.requirements) {
        items[r.id] = r.user_has === null ? "unanswered" : r.user_has ? "have" : "dont";
      }
      return {
        scholarshipId,
        applicationId: data.application.id,
        items,
        requirements: data.requirements.map(toRequirement),
        lastUpdated: Date.now(),
      };
    },
    [],
  );

  const setRequirement = useCallback(
    async (applicationId: string, requirementId: string, value: ItemAvailability) => {
      if (value === "unanswered") return;
      const res = await fetch(`/api/application/${applicationId}/requirement`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirement_id: requirementId, user_has: value === "have" }),
      });
      await json(res);
    },
    [],
  );

  const submitReport = useCallback(
    async (report: { scholarshipId: string; topic: ReportTopic; details: string }) => {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunity_id: report.scholarshipId,
          report_type: REPORT_TYPE[report.topic],
          note: report.details,
        }),
      });
      const saved = await json<{ id: string; created_at?: string }>(res);
      setReports((prev) => [
        {
          id: saved.id,
          scholarshipId: report.scholarshipId,
          topic: report.topic,
          details: report.details,
          createdAt: Date.now(),
        },
        ...prev,
      ]);
    },
    [],
  );

  const counts = useMemo(() => (groups ? toCounts(groups) : null), [groups]);

  const value = useMemo<EligentContextValue>(
    () => ({
      hydrated,
      loading,
      error,
      user,
      signedIn,
      applyMode,
      groups,
      counts,
      reports,
      signIn,
      signOut,
      setProfile,
      unlockApplyMode,
      getMatch,
      refresh: load,
      startApplication,
      setRequirement,
      submitReport,
    }),
    [
      hydrated, loading, error, user, signedIn, applyMode, groups, counts, reports,
      signIn, signOut, setProfile, unlockApplyMode, getMatch, load,
      startApplication, setRequirement, submitReport,
    ],
  );

  return <EligentContext.Provider value={value}>{children}</EligentContext.Provider>;
}

export function useEligent(): EligentContextValue {
  const ctx = useContext(EligentContext);
  if (!ctx) throw new Error("useEligent must be used within EligentProvider");
  return ctx;
}
