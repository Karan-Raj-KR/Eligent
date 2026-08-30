/// <reference lib="dom" />
/// <reference types="chrome" />
// The popup: three tabs, nothing more.
//   HOME  — is the setup done, and what does Eligent hold about you
//   SCAN  — the one action, and one of four unmistakable result states
//   SETUP — API base, BYOK mapping key, demo mode, forget everything

import type { Session } from "./background";
import {
  DEFAULTS,
  forgetEverything,
  loadLabelMap,
  loadSettings,
  mergeLabelMap,
  saveSettings,
  type DemoCase,
  type Settings,
} from "./config";
import { mapLabels } from "./llm";
import type { DocDiff, FillOutcome } from "./form-scan";
import { BROWSER_PAGE_MESSAGE, blockedView, errorView, resultView } from "./scan-view";

// ------------------------------------------------------------------ helpers ---

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const show = (el: HTMLElement, on: boolean) => el.classList.toggle("hidden", !on);
const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const CHECK_SVG =
  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>';
const CHEV_SVG =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';

// The eight fields Eligent fills to identify + qualify you. gender/category are
// eligibility-only and shown below when present, but the checklist counts these.
const CORE_FIELDS: Array<{ key: string; label: string }> = [
  { key: "full_name", label: "Full name" },
  { key: "cgpa", label: "CGPA" },
  { key: "percentage", label: "Percentage" },
  { key: "year_of_study", label: "Year of study" },
  { key: "branch", label: "Branch" },
  { key: "state", label: "State" },
  { key: "annual_family_income", label: "Family income" },
  { key: "institution_type", label: "Institution type" },
];
const EXTRA_FIELDS: Array<{ key: string; label: string }> = [
  { key: "gender", label: "Gender" },
  { key: "category", label: "Category" },
];

type ProfileRow = Record<string, unknown>;

interface Store {
  settings: Settings;
  session: Session | null;
  /** Last profile Eligent saw, from GET /api/fill. */
  profile: ProfileRow | null;
  profileSyncedAt: number | null;
  /** Values you typed into Eligent here, in this browser. Overlaid on `profile`. */
  localProfile: Record<string, string>;
}

const store: Store = {
  settings: { ...DEFAULTS },
  session: null,
  profile: null,
  profileSyncedAt: null,
  localProfile: {},
};

function mergedProfile(): ProfileRow {
  return { ...(store.profile ?? {}), ...store.localProfile };
}

function fmtValue(key: string, raw: unknown): string {
  if (raw === null || raw === undefined || raw === "") return "";
  if (key === "annual_family_income" && !Number.isNaN(Number(raw))) {
    const n = Number(raw);
    if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 ? 1 : 0)} L`;
    return `₹${n.toLocaleString("en-IN")}`;
  }
  if (key === "percentage" && !Number.isNaN(Number(raw))) return `${raw}%`;
  return String(raw);
}

// ------------------------------------------------------------------- tabs -----

function selectTab(name: string) {
  for (const tab of document.querySelectorAll<HTMLElement>(".tab")) {
    tab.setAttribute("aria-selected", String(tab.dataset.tab === name));
  }
  for (const p of ["home", "scan", "setup"]) show($(`panel-${p}`), p === name);
}

// ------------------------------------------------------------------- home -----

function renderHome() {
  const signedIn = Boolean(store.session?.token);
  const profile = mergedProfile();
  const filledCore = CORE_FIELDS.filter((f) => {
    const v = profile[f.key];
    return v !== null && v !== undefined && v !== "";
  }).length;
  const hasApplication = Boolean(store.session?.applicationId);

  $("active-app").textContent = store.settings.demo
    ? "Demo fixture"
    : store.session?.applicationName ?? "";

  setCheck("signin", signedIn, signedIn ? "Anonymous session active" : "Not connected — open Eligent");
  setCheck("profile", filledCore === CORE_FIELDS.length, `${filledCore} of ${CORE_FIELDS.length} fields`);
  $<HTMLElement>("chk-profile-bar").style.width = `${(filledCore / CORE_FIELDS.length) * 100}%`;
  setCheck(
    "application",
    hasApplication,
    hasApplication ? store.session?.applicationName ?? "Application open" : "Pick one from your matches",
  );

  renderProfileKV(($("profile-search") as HTMLInputElement).value.trim().toLowerCase());
}

function setCheck(id: string, done: boolean, meta: string) {
  const mark = $(`chk-${id}-mark`);
  mark.classList.toggle("done", done);
  mark.innerHTML = done ? CHECK_SVG : "";
  $(`chk-${id}-meta`).textContent = meta;
  $(`chk-${id}-chev`).innerHTML = CHEV_SVG;
}

function renderProfileKV(filter: string) {
  const profile = mergedProfile();
  const rows = [...CORE_FIELDS, ...EXTRA_FIELDS]
    .filter((f) => !filter || f.label.toLowerCase().includes(filter) || f.key.includes(filter))
    .map((f) => {
      const synced = store.profile?.[f.key];
      const local = store.localProfile[f.key];
      const value = local ?? synced;
      const has = value !== null && value !== undefined && value !== "";
      const source = store.settings.demo
        ? "from the demo fixture"
        : local !== undefined
          ? "you entered it"
          : has
            ? "from your profile"
            : "";
      return `<div class="row" data-key="${f.key}">
        <span class="k">${esc(f.label)}</span>
        <span class="v ${has ? "" : "empty"}">${has ? esc(fmtValue(f.key, value)) : "not set — tap to add"}</span>
        <span class="src">${source}</span>
      </div>`;
    });

  $("profile-kv").innerHTML =
    rows.length > 0 ? rows.join("") : `<p class="footnote">No field matches "${esc(filter)}".</p>`;

  for (const row of document.querySelectorAll<HTMLElement>("#profile-kv .row")) {
    row.addEventListener("click", () => editField(row.dataset.key!));
  }
}

function editField(key: string) {
  const field = [...CORE_FIELDS, ...EXTRA_FIELDS].find((f) => f.key === key);
  if (!field) return;
  const current = store.localProfile[key] ?? (store.profile?.[key] as string | undefined) ?? "";
  const next = window.prompt(`${field.label} — stored in this browser only`, String(current ?? ""));
  if (next === null) return;
  const trimmed = next.trim();
  if (trimmed) store.localProfile[key] = trimmed;
  else delete store.localProfile[key];
  chrome.storage.local.set({ localProfile: store.localProfile });
  renderHome();
}

// ------------------------------------------------------------------- scan -----

interface ScanResult {
  blocked?: boolean;
  error?: string;
  fill?: FillOutcome;
  diff?: DocDiff;
}

interface FillPayload {
  blocked: false;
  fields: Record<string, { value: unknown }>;
  officialDocs: string[];
  opportunityName?: string | null;
}
interface BlockedPayload {
  blocked: true;
  reason: string;
  clauseText: string;
  sourceText?: string | null;
  sourceUrl?: string | null;
}
type Payload = FillPayload | BlockedPayload;

const CHROME_PAGE_RE = /^(chrome|edge|about|chrome-extension|devtools|view-source):/i;

async function activeTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

/** Where the eligibility answer comes from: a demo fixture, or GET /api/fill. */
async function loadPayload(): Promise<Payload | { error: string }> {
  if (store.settings.demo) {
    if (store.settings.demoCase === "error") return { error: "__demo_error__" };
    const file = { blocked: "demo-blocked", filled: "demo-filled", docdiff: "demo-docdiff" }[
      store.settings.demoCase
    ]!;
    const res = await fetch(chrome.runtime.getURL(`${file}.json`));
    const raw = (await res.json()) as Record<string, unknown>;
    return normalisePayload(raw);
  }

  const session = store.session;
  if (!session?.token) return { error: "Open Eligent and sign in, then open an application." };
  if (!session.applicationId)
    return { error: "Open an application in Eligent first, so I know which form this is." };

  let raw: Record<string, unknown>;
  try {
    const res = await fetch(
      `${store.settings.apiBase.replace(/\/+$/, "")}/api/fill/${encodeURIComponent(session.applicationId)}`,
      { headers: { authorization: `Bearer ${session.token}` } },
    );
    if (res.status === 401) return { error: "Your Eligent session expired. Open it and sign in again." };
    if (!res.ok) return { error: `Eligent could not answer (HTTP ${res.status}).` };
    raw = (await res.json()) as Record<string, unknown>;
  } catch {
    return { error: "Can't reach your Eligent app. Check the API base URL in Setup, or use Demo mode." };
  }

  if (raw.profile && typeof raw.profile === "object") {
    store.profile = raw.profile as ProfileRow;
    store.profileSyncedAt = Date.now();
    chrome.storage.local.set({ profile: store.profile, profileSyncedAt: store.profileSyncedAt });
  }
  return normalisePayload(raw);
}

function normalisePayload(raw: Record<string, unknown>): Payload {
  if (raw.blocked) {
    const clause = (raw.clause ?? null) as { displayText?: string; field?: string } | null;
    return {
      blocked: true,
      reason: String(raw.reason ?? "rejected"),
      clauseText:
        clause?.displayText ??
        (raw.reason === "no_profile"
          ? "Finish your profile in Eligent first."
          : "You don't meet a stated criterion."),
      sourceText: (raw.source_text as string | null) ?? null,
      sourceUrl: (raw.source_url as string | null) ?? null,
    };
  }
  const opp = (raw.opportunity ?? null) as { name?: string; official_documents?: string[] } | null;
  const reqs = (raw.requirements ?? []) as Array<{ document_type: string; source?: string }>;
  const officialDocs =
    Array.isArray(opp?.official_documents) && opp!.official_documents!.length
      ? opp!.official_documents!
      : reqs.filter((r) => r.source !== "community").map((r) => r.document_type);
  return {
    blocked: false,
    fields: (raw.fields ?? {}) as Record<string, { value: unknown }>,
    officialDocs,
    opportunityName: opp?.name ?? null,
  };
}

async function runScan() {
  const btn = $<HTMLButtonElement>("scan-btn");
  btn.disabled = true;
  const box = $("scan-result");
  show(box, false);
  show($("scan-hint"), false);

  try {
    const tab = await activeTab();

    const payload = await loadPayload();
    if ("error" in payload) {
      if (payload.error === "__demo_error__") return renderError(BROWSER_PAGE_MESSAGE);
      return renderError(payload.error);
    }

    if (payload.blocked) return renderBlocked(payload);

    // Only now do we touch the page.
    if (!store.settings.demo && (!tab?.url || CHROME_PAGE_RE.test(tab.url))) {
      return renderError(BROWSER_PAGE_MESSAGE);
    }
    if (!tab?.id) return renderError("There's no active tab to scan.");

    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    } catch {
      return renderError(BROWSER_PAGE_MESSAGE);
    }

    const host = tab.url ? new URL(tab.url).hostname : "demo";
    let extraMap = await loadLabelMap(host);

    let result = await sendScan(tab.id, payload, extraMap);
    if (!result) return renderError("The page didn't respond. Reload it and scan again.");
    if (result.error) return renderError(`Scan failed: ${result.error}`);

    // Dictionary miss → ask the model once, cache per host, fill the rest.
    const unmapped = result.fill?.unmappedLabels ?? [];
    if (unmapped.length && store.settings.apiKey && !store.settings.demo) {
      const { mappings } = await mapLabels(unmapped, store.settings);
      extraMap = await mergeLabelMap(host, mappings);
      if (Object.values(mappings).some(Boolean)) {
        const second = await sendScan(tab.id, payload, extraMap);
        if (second && !second.error) result = second;
      }
    }

    renderScanResult(result);
  } catch (err) {
    renderError(err instanceof Error ? err.message : "Something went wrong. Try again.");
  } finally {
    btn.disabled = false;
    renderHome();
  }
}

function sendScan(
  tabId: number,
  payload: FillPayload,
  extraMap: Record<string, string>,
): Promise<ScanResult | null> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tabId,
      {
        type: "ELIGENT_SCAN",
        blocked: false,
        fields: payload.fields,
        officialDocs: payload.officialDocs,
        extraMap,
      },
      (response) => {
        if (chrome.runtime.lastError) resolve(null);
        else resolve((response ?? null) as ScanResult | null);
      },
    );
  });
}

// --------------------------------------------------------- scan: renderers ---

function paint(view: { cls: string; html: string }) {
  const box = $("scan-result");
  box.className = `result ${view.cls}`;
  box.innerHTML = view.html;
  show(box, true);
}

function renderError(message: string) {
  paint(errorView(message));
}

function renderBlocked(p: BlockedPayload) {
  paint(blockedView(p));
  $("scan-see-matches")?.addEventListener("click", () =>
    chrome.tabs.create({ url: `${store.settings.apiBase.replace(/\/+$/, "")}/matches` }),
  );
}

function renderScanResult(result: ScanResult) {
  const fill = result.fill ?? { found: 0, filled: 0, need: [], unmappedLabels: [], declarations: [] };
  paint(resultView(fill, result.diff));
}

// ------------------------------------------------------------------ setup -----

function renderSetup() {
  const s = store.settings;
  ($("cfg-base") as HTMLInputElement).value = s.apiBase;
  ($("cfg-key") as HTMLInputElement).value = s.apiKey;
  ($("cfg-llm-base") as HTMLInputElement).value = s.llmBase;
  ($("cfg-model") as HTMLInputElement).value = s.llmModel;
  $("cfg-demo").setAttribute("aria-pressed", String(s.demo));
  show($("cfg-demo-case-wrap"), s.demo);
  ($("cfg-demo-case") as HTMLSelectElement).value = s.demoCase;
  show($("demo-banner"), s.demo);
}

async function applySettings(patch: Partial<Settings>) {
  store.settings = await saveSettings(patch);
  renderSetup();
  renderHome();
}

// -------------------------------------------------------------------- boot ----

async function boot() {
  const [settings, stored] = await Promise.all([
    loadSettings(),
    chrome.storage.local.get(["session", "profile", "profileSyncedAt", "localProfile"]),
  ]);
  store.settings = settings;
  store.session = (stored.session as Session | undefined) ?? null;
  store.profile = (stored.profile as ProfileRow | undefined) ?? null;
  store.profileSyncedAt = (stored.profileSyncedAt as number | undefined) ?? null;
  store.localProfile = (stored.localProfile as Record<string, string> | undefined) ?? {};

  // tabs
  for (const tab of document.querySelectorAll<HTMLElement>(".tab")) {
    tab.addEventListener("click", () => selectTab(tab.dataset.tab!));
  }

  // home
  $("profile-search").addEventListener("input", () =>
    renderProfileKV(($("profile-search") as HTMLInputElement).value.trim().toLowerCase()),
  );
  const openBase = () =>
    chrome.tabs.create({ url: store.settings.apiBase.replace(/\/+$/, "") || "http://localhost:3000" });
  $("chk-signin").addEventListener("click", openBase);
  $("chk-profile").addEventListener("click", () =>
    chrome.tabs.create({ url: `${store.settings.apiBase.replace(/\/+$/, "")}/onboarding` }),
  );
  $("chk-application").addEventListener("click", () =>
    chrome.tabs.create({ url: `${store.settings.apiBase.replace(/\/+$/, "")}/matches` }),
  );

  // scan
  $("scan-btn").addEventListener("click", () => void runScan());

  // setup
  $("cfg-save").addEventListener("click", async () => {
    await applySettings({
      apiBase: ($("cfg-base") as HTMLInputElement).value.trim() || DEFAULTS.apiBase,
      apiKey: ($("cfg-key") as HTMLInputElement).value.trim(),
      llmBase: ($("cfg-llm-base") as HTMLInputElement).value.trim() || DEFAULTS.llmBase,
      llmModel: ($("cfg-model") as HTMLInputElement).value.trim() || DEFAULTS.llmModel,
    });
    const flash = $("cfg-saved");
    show(flash, true);
    setTimeout(() => show(flash, false), 1500);
  });
  $("cfg-demo").addEventListener("click", () => {
    void applySettings({ demo: store.settings.demo ? false : true });
  });
  ($("cfg-demo-case") as HTMLSelectElement).addEventListener("change", (e) => {
    void applySettings({ demoCase: (e.target as HTMLSelectElement).value as DemoCase });
  });
  $("cfg-forget").addEventListener("click", async () => {
    if (!window.confirm("Forget the session, cached mappings, local values and settings from this browser?"))
      return;
    await forgetEverything();
    await chrome.storage.local.remove(["profile", "profileSyncedAt", "localProfile"]);
    store.session = null;
    store.profile = null;
    store.localProfile = {};
    store.settings = { ...DEFAULTS };
    renderSetup();
    renderHome();
    selectTab("home");
  });

  // react to the bridge capturing a session while the popup is open
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.session) store.session = (changes.session.newValue as Session | null) ?? null;
    if (changes.profile) store.profile = (changes.profile.newValue as ProfileRow | null) ?? null;
    renderHome();
  });

  renderSetup();
  renderHome();
  selectTab("home");
}

void boot();
