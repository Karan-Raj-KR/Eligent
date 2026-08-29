import "server-only";
import { evaluate, type Criterion, type Evaluation, type Profile } from "@opportunity/engine";
import type { SupabaseClient } from "@supabase/supabase-js";

// packages/engine has ZERO LLM calls and must never run in the browser (see CLAUDE.md).
// The "server-only" import makes any accidental client-component import a build error.

export async function loadProfile(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data } = await supabase.from("profile").select("*").eq("id", userId).maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function loadCriteria(supabase: SupabaseClient, opportunityId: string): Promise<Criterion[]> {
  const { data, error } = await supabase.from("criterion").select("*").eq("opportunity_id", opportunityId);
  if (error) throw error;
  return (data ?? []) as Criterion[];
}

export function evaluateOpportunity(profile: Profile, criteria: Criterion[]): Evaluation {
  return evaluate(profile, criteria);
}
