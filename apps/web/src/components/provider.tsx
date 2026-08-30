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
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
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
  signInWithGoogle: () => Promise<void>;
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

  // Built on first use, never during render. This provider sits in the root
  // layout so it renders during static prerendering — constructing the client
  // eagerly would crash every static page when env vars are absent.
  // createClient() now returns null when env vars are missing; every caller
  // below checks for null and degrades to "not signed in".
  const supabaseRef = useRef<SupabaseClient | null | undefined>(undefined);
  const getSupabase = useCallback((): SupabaseClient | null => {
    if (supabaseRef.current === undefined) supabaseRef.current = createClient();
    return supabaseRef.current;
  }, []);

  /** Loads the profile, and the matches if the profile is complete enough. */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sb = getSupabase();
      if (!sb) {
        // Supabase not configured — degrade to "not signed in", don't crash.
        setSignedIn(false);
        setUser(null);
        setGroups(null);
        return;
      }

      // The profile is read straight from Postgres rather than through an
      // endpoint: RLS already scopes `profile` to auth.uid(), and /api/profile
      // is write-only. Reading it here avoids growing the API for the UI.
      const {
        data: { user: authUser },
      } = await sb.auth.getUser();
      if (!authUser) {
        setSignedIn(false);
        setUser(null);
        setGroups(null);
        return;
      }

      const { data: profileRow } = await sb
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
  }, [getSupabase]);

  // Establish identity, then load. Anonymous by default; Google OAuth returns
  // here with cookies already set by /auth/callback.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = getSupabase();
        if (sb) {
          const {
            data: { session },
          } = await sb.auth.getSession();
          if (cancelled) return;
          if (session) {
            setSignedIn(true);
            await load();
          }
        }
        // If sb is null, env vars are missing — stay not-signed-in.
      } catch (err) {
        console.error("[EligentProvider] init error:", err);
      }
      setApplyMode(readStorage(STORAGE_KEYS.applyMode, false));
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [getSupabase, load]);

  const signIn = useCallback(async () => {
    setError(null);
    const sb = getSupabase();
    if (!sb) {
      setError("Supabase is not configured. Please contact support.");
      return;
    }
    const { error: authError } = await sb.auth.signInAnonymously();
    if (authError) {
      setError(authError.message);
      return;
    }
    setSignedIn(true);
    await load();
  }, [getSupabase, load]);

  // OAuth leaves this page entirely; the session is set by /auth/callback and
  // picked up by the init effect when the browser comes back.
  const signInWithGoogle = useCallback(async () => {
    setError(null);
    const sb = getSupabase();
    if (!sb) {
      setError("Supabase is not configured. Please contact support.");
      return;
    }
    const { error: authError } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
    if (authError) setError(authError.message);
  }, [getSupabase]);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    setSignedIn(false);
    setUser(null);
    setGroups(null);
  }, [getSupabase]);

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
      signInWithGoogle,
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
      signIn, signInWithGoogle, signOut, setProfile, unlockApplyMode, getMatch, load,
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
