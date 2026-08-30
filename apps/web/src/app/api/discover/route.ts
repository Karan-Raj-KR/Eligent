import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/supabase/server";
import { evaluateOpportunity, loadProfile } from "@/lib/eligibility";
import { harvestUrl } from "../../../../../../scripts/harvest";
import { classify, extractAnchors } from "../../../../../../scripts/discover";
import { SOURCES, classifyOpportunity, sourceForListing } from "../../../../../../scripts/sources";
import { fetchPageAuto } from "../../../../../../scripts/lib/fetch-cache";

// The live "Find more opportunities" action. It runs the SAME discover + harvest
// pipeline the CLI runs — the very same harvestUrl(), classify() and
// validateCriterion() — and streams its progress instead of printing it.
//
// What does NOT change here:
//   - the model only ever turns prose into candidate structure; it decides nothing
//   - a criterion ships only if validateCriterion() found its source_text verbatim
//     on the fetched page (harvestUrl does that before we ever see the row)
//   - eligibility is arithmetic, computed by packages/engine, server-side
//
// Playwright and node:fs mean this must run on the Node runtime, never edge.
export const runtime = "nodejs";
export const maxDuration = 300;

// Bounds one click: cost (OpenAI), politeness (third-party sites) and latency.
const MAX_NEW_URLS = 4;

/**
 * A single slow page (a headless render, or a very long page the model chews
 * on) must not hang the whole run and hold the lock open. harvestUrl has no
 * AbortSignal to plumb through, so losing the race does NOT cancel the work
 * still running underneath — it only stops us waiting on it. That is enough to
 * keep the stream moving and release the lock; the orphaned fetch finishes into
 * a result nobody reads.
 */
const URL_TIMEOUT_MS = 90_000;

const TIMED_OUT = Symbol("timed-out");

async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<typeof TIMED_OUT>((resolve) => {
        timer = setTimeout(() => resolve(TIMED_OUT), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** One run at a time per server process — a double-click must not double-spend. */
let inFlight = false;

type Event =
  | { type: "step"; message: string }
  | {
      type: "rejected";
      // "validator": the model proposed a criterion and validateCriterion refused it.
      // "unextractable": the model saw a rule it could not quote, so it never
      // became a criterion at all. Different failures, both worth showing.
      kind: "validator" | "unextractable";
      url: string;
      opportunity: string | null;
      field: string | null;
      reason: string;
    }
  | { type: "added"; name: string; status: string }
  | { type: "done"; added: number; eligible: number; nearMiss: number; rejected: number }
  | { type: "error"; message: string };

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export async function POST() {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // `opportunity` and `criterion` are deliberately read-only to clients (RLS has
  // SELECT policies and no INSERT), so writing new rows needs the service role.
  // It is read here, server-side only, and never sent to the browser.
  if (!serviceKey || !supabaseUrl) {
    return new Response(
      JSON.stringify({
        error:
          "SUPABASE_SERVICE_ROLE_KEY is not set for the web app. Discovery writes to opportunity/criterion, which RLS keeps read-only for clients.",
      }),
      { status: 503 },
    );
  }
  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY is not set — the harvester cannot structure page prose without it." }),
      { status: 503 },
    );
  }
  if (inFlight) {
    return new Response(JSON.stringify({ error: "A discovery run is already in progress." }), { status: 409 });
  }

  const profile = await loadProfile(supabase, user.id);
  if (!profile) return new Response(JSON.stringify({ error: "complete onboarding first" }), { status: 400 });

  inFlight = true;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Event) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      let added = 0;
      let eligible = 0;
      let nearMiss = 0;
      let rejectedCount = 0;

      try {
        // Everything already harvested — never pay the model twice for a page.
        const { data: existing } = await admin.from("opportunity").select("url");
        const known = new Set((existing ?? []).map((row: { url: string }) => row.url));

        // ---- discover: listing pages -> candidate detail URLs -------------------
        const candidates: string[] = [];
        const seen = new Set<string>();

        for (const source of SOURCES) {
          if (candidates.length >= MAX_NEW_URLS) break;

          for (const listing of source.listings) {
            if (candidates.length >= MAX_NEW_URLS) break;

            const host = hostOf(listing);
            send({ type: "step", message: `Reading ${host}…` });

            const fetched = await fetchPageAuto(listing);
            if ("error" in fetched) {
              send({ type: "step", message: `Reading ${host}… could not fetch (${fetched.error})` });
              continue;
            }

            const config = sourceForListing(listing);
            const listingUrl = new URL(listing);
            const found: string[] = [];
            for (const { href, text } of extractAnchors(fetched.html, listing)) {
              const result = classify(href, text, listingUrl, config);
              if ("skip" in result) continue;
              if (seen.has(result.url)) continue;
              seen.add(result.url);
              found.push(result.url);
            }

            const fresh = found.filter((u) => !known.has(u));
            send({
              type: "step",
              message: `Reading ${host}… found ${found.length} page${found.length === 1 ? "" : "s"}, ${fresh.length} new`,
            });
            candidates.push(...fresh.slice(0, MAX_NEW_URLS - candidates.length));
          }
        }

        if (candidates.length === 0) {
          send({ type: "step", message: "No new pages to read — everything discoverable is already in your catalog." });
          send({ type: "done", added: 0, eligible: 0, nearMiss: 0, rejected: 0 });
          return;
        }

        // ---- harvest: the same harvestUrl() the CLI runs ------------------------
        for (const url of candidates) {
          send({ type: "step", message: `Extracting criteria with the model… ${hostOf(url)}` });

          const entries = await withTimeout(harvestUrl(url), URL_TIMEOUT_MS);
          if (entries === TIMED_OUT) {
            send({
              type: "step",
              message: `Gave up on ${hostOf(url)} after ${URL_TIMEOUT_MS / 1000}s — moving on`,
            });
            continue;
          }
          for (const entry of entries) {
            if (entry.fetchStatus !== "ok" || !entry.name) {
              send({ type: "step", message: `Skipped ${hostOf(url)} — ${entry.fetchStatus}` });
              continue;
            }

            const valid = entry.accepted.length;
            const thrownOut = entry.rejectedCriteria.length;
            rejectedCount += thrownOut;
            const notQuotable = entry.unextractable.length;
            send({
              type: "step",
              message:
                `Extracting criteria with the model… ${valid} valid, ${thrownOut} rejected` +
                (thrownOut ? " (no verbatim source)" : "") +
                (notQuotable ? `, ${notQuotable} not quotable` : ""),
            });

            // The trust story, itemised: what the validator threw out and why.
            for (const rejection of entry.rejectedCriteria) {
              const raw = rejection.raw as { field?: unknown } | null;
              send({
                type: "rejected",
                kind: "validator",
                url,
                opportunity: entry.name,
                field: typeof raw?.field === "string" ? raw.field : null,
                reason: rejection.reason,
              });
            }
            if (entry.rejectedDeadline) {
              send({
                type: "rejected",
                kind: "validator",
                url,
                opportunity: entry.name,
                field: "deadline",
                reason: entry.rejectedDeadline,
              });
              rejectedCount += 1;
            }

            // Prose the model flagged as a rule but could not quote well enough to
            // become a criterion. In practice this — not validator rejection — is
            // what the discipline actually costs us, so it belongs in the log:
            // it is the difference between what a page implies and what we act on.
            for (const prose of entry.unextractable) {
              send({
                type: "rejected",
                kind: "unextractable",
                url,
                opportunity: entry.name,
                field: null,
                reason: prose,
              });
            }
            rejectedCount += entry.unextractable.length;

            if (known.has(entry.url)) continue;

            const stamp = classifyOpportunity(entry.url);
            const { data: saved, error: insertError } = await admin
              .from("opportunity")
              .upsert(
                {
                  name: entry.name,
                  provider: entry.provider,
                  url: entry.url,
                  deadline: entry.deadline,
                  amount: entry.amount,
                  category: stamp.category,
                  location_type: stamp.location_type,
                  funded: stamp.funded,
                  official_documents: entry.officialDocuments,
                },
                { onConflict: "url" },
              )
              .select("id")
              .single();

            if (insertError || !saved) {
              send({ type: "step", message: `Could not save "${entry.name}" — ${insertError?.message ?? "no row"}` });
              continue;
            }
            known.add(entry.url);

            if (entry.accepted.length > 0) {
              await admin.from("criterion").delete().eq("opportunity_id", saved.id);
              const { error: criterionError } = await admin
                .from("criterion")
                .insert(entry.accepted.map((c) => ({ ...c, opportunity_id: saved.id })));
              if (criterionError) {
                send({ type: "step", message: `Saved "${entry.name}" but its criteria failed — ${criterionError.message}` });
              }
            }
            added += 1;

            // ---- evaluate: arithmetic, in packages/engine, against this profile --
            const evaluation = evaluateOpportunity(profile, entry.accepted);
            if (evaluation.status === "eligible") eligible += 1;
            else if (evaluation.status === "near_miss") nearMiss += 1;
            send({ type: "added", name: entry.name, status: evaluation.status });
          }
        }

        send({
          type: "step",
          message: `Evaluating against your profile… ${eligible} eligible, ${nearMiss} near miss`,
        });
        send({ type: "done", added, eligible, nearMiss, rejected: rejectedCount });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        inFlight = false;
        controller.close();
      }
    },
    cancel() {
      inFlight = false;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
    },
  });
}
