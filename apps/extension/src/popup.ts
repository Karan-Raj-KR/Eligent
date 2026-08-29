/// <reference lib="dom" />
import type { Session } from "./background";

interface FieldSpec {
  value: unknown;
  hints: string[];
}

interface BlockedResponse {
  blocked: true;
  reason: string;
  clause?: {
    field: string;
    displayText?: string;
    profileValue?: unknown;
    requirement?: unknown;
    gap?: { amount: number; unit: string; direction: "short" | "over" };
  } | null;
  source_text?: string | null;
}

interface FillResponse {
  blocked: false;
  fields: Record<string, FieldSpec>;
  opportunity?: { name?: string | null } | null;
}

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const show = (id: string, visible: boolean) => $(id).classList.toggle("hidden", !visible);

function setStatus(text: string, kind: "" | "error" | "done" = "") {
  const el = $("status");
  el.textContent = text;
  el.className = kind;
}

/**
 * Injected into the scholarship form's page. Must be entirely self-contained:
 * chrome.scripting serialises it, so it cannot close over anything above.
 *
 * It fills inputs and dispatches the events a framework-backed form listens for.
 * It never calls form.submit(), never clicks a button, and never touches an
 * input of type submit — a human presses submit, always.
 */
function fillPage(fields: Record<string, FieldSpec>): { filled: number; skipped: string[] } {
  const skipped: string[] = [];
  let filled = 0;

  for (const [name, spec] of Object.entries(fields)) {
    if (spec.value === null || spec.value === undefined || spec.value === "") {
      skipped.push(name);
      continue;
    }
    const value = String(spec.value);

    let target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null = null;
    for (const selector of spec.hints ?? []) {
      let found: Element | null = null;
      try {
        found = document.querySelector(selector);
      } catch {
        continue; // A malformed hint selector must not stop the rest.
      }
      if (
        found instanceof HTMLInputElement ||
        found instanceof HTMLSelectElement ||
        found instanceof HTMLTextAreaElement
      ) {
        // Never touch a submit control, however it was matched.
        if (found instanceof HTMLInputElement && (found.type === "submit" || found.type === "button")) continue;
        target = found;
        break;
      }
    }

    if (!target) {
      skipped.push(name);
      continue;
    }

    if (target instanceof HTMLSelectElement) {
      const wanted = value.toLowerCase();
      const option = Array.from(target.options).find(
        (o) => o.value.toLowerCase() === wanted || o.text.toLowerCase().includes(wanted),
      );
      if (!option) {
        skipped.push(name);
        continue;
      }
      target.value = option.value;
    } else {
      target.value = value;
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }
    target.dispatchEvent(new Event("change", { bubbles: true }));
    filled += 1;
  }

  return { filled, skipped };
}

let session: Session | null = null;

function render() {
  show("signed-out", !session);
  show("no-application", Boolean(session) && !session?.applicationId);
  show("ready", Boolean(session?.applicationId));
  show("blocked", false);
  show("sign-out", Boolean(session));
  if (session?.applicationId) {
    $("application-name").textContent = session.applicationName ?? "Your application";
  }
}

function openApp() {
  chrome.tabs.create({ url: session?.origin ?? "http://localhost:3000" });
}

function renderBlocked(body: BlockedResponse) {
  const reasons: Record<string, string> = {
    near_miss: "So close — but not yet",
    rejected: "Not eligible",
    no_profile: "No profile yet",
  };
  $("blocked-reason").textContent = reasons[body.reason] ?? "Not eligible";

  const clause = body.clause ?? null;
  $("blocked-clause").textContent =
    clause?.displayText ?? (body.reason === "no_profile" ? "Finish your profile in Cutoff first." : "You do not meet a stated criterion.");

  const source = body.source_text?.trim();
  show("blocked-source", Boolean(source));
  if (source) $("blocked-source").textContent = `“${source}”`;

  const gap = clause?.gap;
  show("blocked-gap", Boolean(gap));
  if (gap) {
    const amount = Math.round(gap.amount * 100) / 100;
    const unit = gap.unit === "INR" ? "₹" : "";
    const trail = gap.unit === "INR" ? "" : ` ${gap.unit}`;
    $("blocked-gap").textContent =
      gap.direction === "short" ? `You are ${unit}${amount}${trail} short.` : `You are ${unit}${amount}${trail} over.`;
  }

  show("signed-out", false);
  show("no-application", false);
  show("ready", false);
  show("blocked", true);
}

async function checkAndFill() {
  if (!session?.applicationId) return;
  const button = $("fill") as HTMLButtonElement;
  button.disabled = true;
  setStatus("Checking your eligibility…");

  try {
    const res = await fetch(`${session.origin}/api/fill/${encodeURIComponent(session.applicationId)}`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });

    if (res.status === 401) {
      setStatus("Your session expired. Open Cutoff and sign in again.", "error");
      return;
    }
    if (!res.ok) {
      setStatus(`Could not check eligibility (${res.status}).`, "error");
      return;
    }

    const body = (await res.json()) as BlockedResponse | FillResponse;

    // The gate. Nothing below this line runs when the answer is "blocked".
    if (body.blocked) {
      setStatus("");
      renderBlocked(body);
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setStatus("No active tab to fill.", "error");
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fillPage,
      args: [body.fields ?? {}],
    });

    const outcome = results?.[0]?.result as { filled: number; skipped: string[] } | undefined;
    if (!outcome) {
      setStatus("Could not reach that page. Some sites block extensions.", "error");
      return;
    }
    setStatus(
      outcome.filled > 0
        ? `Filled ${outcome.filled} field${outcome.filled === 1 ? "" : "s"}. Check them, then submit yourself.`
        : "Found no matching fields on this page.",
      outcome.filled > 0 ? "done" : "error",
    );
  } catch {
    setStatus("Could not reach Cutoff. Is the app running?", "error");
  } finally {
    // Always re-enabled, on every path.
    button.disabled = false;
  }
}

chrome.storage.local.get(["session"], (stored) => {
  session = (stored.session as Session | undefined) ?? null;
  render();
});

$("open-app").addEventListener("click", openApp);
$("open-app-2").addEventListener("click", openApp);
$("back").addEventListener("click", () => {
  setStatus("");
  render();
});
$("fill").addEventListener("click", () => void checkAndFill());
$("sign-out").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "SIGN_OUT" }, () => {
    session = null;
    setStatus("Disconnected.");
    render();
  });
});
