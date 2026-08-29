/// <reference lib="dom" />
import type { Session } from "./background";

interface FieldSpec {
  value: unknown;
  hints?: string[];
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

interface Requirement {
  document_type: string;
  source?: string;
}

interface FillResponse {
  blocked: false;
  fields: Record<string, FieldSpec>;
  requirements?: Requirement[];
  opportunity?: { name?: string | null; official_documents?: string[] | null } | null;
}

type ApiResponse = BlockedResponse | FillResponse;

interface PageResult {
  blocked?: boolean;
  error?: string;
  fill?: { filled: number; skipped: Array<{ name: string; reason: string }> };
  diff?: { formDemands: number; pageListed: number; unlisted: string[]; matched: string[] };
}

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const show = (id: string, visible: boolean) => $(id).classList.toggle("hidden", !visible);

function setStatus(text: string, kind: "" | "error" | "done" = "") {
  const el = $("status");
  el.textContent = text;
  el.className = kind;
}

const SECTIONS = ["signed-out", "no-application", "ready", "filled", "docs", "blocked"];
function only(section: string) {
  for (const s of SECTIONS) show(s, s === section);
}

// --------------------------------------------------------------------- session --

let session: Session | null = null;
let demo = false;
let demoCase: "eligible" | "blocked" = "eligible";

function render() {
  $("sign-out").classList.toggle("hidden", !session);
  if (demo) {
    only("ready");
    $("application-name").textContent = "Demo fixture (offline)";
    return;
  }
  if (!session) return only("signed-out");
  if (!session.applicationId) return only("no-application");
  only("ready");
  $("application-name").textContent = session.applicationName ?? "Your application";
}

function openApp() {
  chrome.tabs.create({ url: session?.origin ?? "http://localhost:3000" });
}

// --------------------------------------------------------------------- blocked --

function renderBlocked(body: BlockedResponse) {
  const reasons: Record<string, string> = {
    near_miss: "So close — but not yet",
    rejected: "Not eligible",
    no_profile: "No profile yet",
  };
  $("blocked-reason").textContent = reasons[body.reason] ?? "Not eligible";

  const clause = body.clause ?? null;
  $("blocked-clause").textContent =
    clause?.displayText ??
    (body.reason === "no_profile" ? "Finish your profile in Eligent first." : "You do not meet a stated criterion.");

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
  only("blocked");
}

// ------------------------------------------------------------------ fill result --

function renderSkipped(listId: string, skipped: Array<{ name: string; reason: string }>) {
  const ul = $(listId);
  ul.innerHTML = "";
  for (const s of skipped) {
    const li = document.createElement("li");
    li.textContent = `${s.name} — ${s.reason}`;
    ul.appendChild(li);
  }
  show(listId, skipped.length > 0);
  const hdr = document.getElementById(`${listId}-hdr`);
  if (hdr) hdr.classList.toggle("hidden", skipped.length === 0);
}

function renderResult(result: PageResult) {
  const fill = result.fill ?? { filled: 0, skipped: [] };
  const diff = result.diff;
  const summary =
    fill.filled > 0
      ? `Filled ${fill.filled} field${fill.filled === 1 ? "" : "s"}. Check them, then submit yourself.`
      : "No fields on this page matched your profile.";

  if (diff && diff.unlisted.length > 0) {
    $("docs-summary").textContent = summary;
    $("docs-headline").textContent = `This form demands ${diff.formDemands} document${
      diff.formDemands === 1 ? "" : "s"
    }. Their page listed ${diff.pageListed}.`;
    $("docs-lede").textContent = "Here are the ones nobody told you about:";
    const ul = $("docs-list");
    ul.innerHTML = "";
    for (const name of diff.unlisted) {
      const li = document.createElement("li");
      li.textContent = name;
      ul.appendChild(li);
    }
    renderSkipped("docs-skipped", fill.skipped);
    only("docs");
    return;
  }

  $("filled-summary").textContent = summary;
  $("filled-docs").textContent = diff
    ? `${diff.formDemands} document upload${diff.formDemands === 1 ? "" : "s"} on this page, all on the official list.`
    : "";
  show("filled-docs", Boolean(diff && diff.formDemands > 0));
  renderSkipped("filled-skipped", fill.skipped);
  only("filled");
}

// ----------------------------------------------------------------------- run it --

async function loadResponse(): Promise<ApiResponse | null> {
  if (demo) {
    const file = demoCase === "blocked" ? "fixture-blocked.json" : "fixture.json";
    setStatus("Loading offline fixture…");
    const res = await fetch(chrome.runtime.getURL(file));
    return (await res.json()) as ApiResponse;
  }
  if (!session?.applicationId) return null;
  setStatus("Checking your eligibility…");
  const res = await fetch(`${session.origin}/api/fill/${encodeURIComponent(session.applicationId)}`, {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  if (res.status === 401) {
    setStatus("Your session expired. Open Eligent and sign in again.", "error");
    return null;
  }
  if (!res.ok) {
    setStatus(`Could not check eligibility (${res.status}).`, "error");
    return null;
  }
  return (await res.json()) as ApiResponse;
}

function officialDocsOf(body: FillResponse): string[] {
  const fromOpp = body.opportunity?.official_documents;
  if (Array.isArray(fromOpp) && fromOpp.length) return fromOpp;
  return (body.requirements ?? []).filter((r) => r.source !== "community").map((r) => r.document_type);
}

async function runOnPage(body: FillResponse): Promise<PageResult | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setStatus("No active tab to fill.", "error");
    return null;
  }
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
  } catch {
    setStatus("Can't run on this page. Open the scholarship form first.", "error");
    return null;
  }
  try {
    return (await chrome.tabs.sendMessage(tab.id, {
      type: "ELIGENT_FILL",
      response: { blocked: false, fields: body.fields ?? {} },
      officialDocs: officialDocsOf(body),
    })) as PageResult;
  } catch {
    setStatus("The page didn't respond. Reload it and try again.", "error");
    return null;
  }
}

async function checkAndFill() {
  const button = $("fill") as HTMLButtonElement;
  button.disabled = true;
  try {
    const body = await loadResponse();
    if (!body) return;
    setStatus("");

    // The gate. Nothing below runs when the answer is "blocked".
    if (body.blocked) {
      renderBlocked(body);
      return;
    }

    const result = await runOnPage(body);
    if (!result) return;
    if (result.error) {
      setStatus(`Fill failed: ${result.error}`, "error");
      return;
    }
    renderResult(result);
  } catch (err) {
    setStatus(`Could not reach Eligent. ${err instanceof Error ? err.message : ""}`.trim(), "error");
  } finally {
    button.disabled = false;
  }
}

// ------------------------------------------------------------------------- wire --

function wireDemo() {
  const toggle = $("demo-toggle") as HTMLInputElement;
  const select = $("demo-case") as HTMLSelectElement;
  toggle.checked = demo;
  select.value = demoCase;
  show("demo-case-wrap", demo);
  toggle.addEventListener("change", () => {
    demo = toggle.checked;
    chrome.storage.local.set({ demo });
    show("demo-case-wrap", demo);
    setStatus("");
    render();
  });
  select.addEventListener("change", () => {
    demoCase = select.value === "blocked" ? "blocked" : "eligible";
    chrome.storage.local.set({ demoCase });
  });
}

chrome.storage.local.get(["session", "demo", "demoCase"], (stored) => {
  session = (stored.session as Session | undefined) ?? null;
  demo = Boolean(stored.demo);
  demoCase = stored.demoCase === "blocked" ? "blocked" : "eligible";
  wireDemo();
  render();
});

$("open-app").addEventListener("click", openApp);
$("open-app-2").addEventListener("click", openApp);
$("fill").addEventListener("click", () => void checkAndFill());
for (const id of ["back", "back-2"]) {
  $(id).addEventListener("click", () => {
    setStatus("");
    render();
  });
}
$("sign-out").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "SIGN_OUT" }, () => {
    session = null;
    setStatus("Disconnected.");
    render();
  });
});
