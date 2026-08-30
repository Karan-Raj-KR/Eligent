// Renders the real popup (popup.html + popup.css + popup.js) in headless
// Chromium behind a chrome.* shim, screenshots each tab and every Scan state,
// and asserts the four Scan states show what they must. Playwright only — no
// Chrome extension, no new dependency.
//
// Run: node src/verify-popup.mjs   (after `pnpm build`)

import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert";
import { chromium } from "playwright";
import { API_BASE } from "../build.mjs";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const shots = fileURLToPath(new URL("../dist/shots/", import.meta.url));
mkdirSync(shots, { recursive: true });

const html = readFileSync(dist + "popup.html", "utf8").replace(
  '<link rel="stylesheet" href="popup.css" />',
  `<style>${readFileSync(dist + "popup.css", "utf8")}</style>`,
);
const popupJs = readFileSync(dist + "popup.js", "utf8");
const fixtures = {
  "demo-docdiff.json": readFileSync(dist + "demo-docdiff.json", "utf8"),
  "demo-filled.json": readFileSync(dist + "demo-filled.json", "utf8"),
  "demo-blocked.json": readFileSync(dist + "demo-blocked.json", "utf8"),
};

const SHIM = (store) => `
  window.__store = ${JSON.stringify(store)};
  const listeners = [];
  window.chrome = {
    runtime: {
      lastError: null,
      getURL: (p) => "https://ext.invalid/" + p,
      onMessage: { addListener() {} },
      sendMessage() {},
    },
    storage: {
      local: {
        get: (keys, cb) => {
          const out = {};
          const list = keys == null ? Object.keys(window.__store)
            : Array.isArray(keys) ? keys : [keys];
          for (const k of list) if (k in window.__store) out[k] = window.__store[k];
          return cb ? cb(out) : Promise.resolve(out);
        },
        set: (obj, cb) => { Object.assign(window.__store, obj); cb && cb(); return Promise.resolve(); },
        remove: (keys, cb) => {
          for (const k of [].concat(keys)) delete window.__store[k];
          cb && cb(); return Promise.resolve();
        },
      },
      onChanged: { addListener: (fn) => listeners.push(fn) },
    },
    tabs: {
      query: async () => [{ id: 1, url: "https://portal.example.gov.in/apply" }],
      create() {},
      sendMessage: (id, msg, cb) => cb && cb(window.__scanResult ?? null),
    },
    scripting: { executeScript: async () => [{}] },
  };
`;

async function load(browser, store, { demoCase, scanResult } = {}) {
  const page = await browser.newPage({ viewport: { width: 380, height: 640 } });
  await page.route("https://ext.invalid/**", (route) => {
    const name = route.request().url().replace("https://ext.invalid/", "");
    route.fulfill({ status: 200, contentType: "application/json", body: fixtures[name] ?? "{}" });
  });
  if (demoCase) store = { ...store, settings: { ...store.settings, demo: true, demoCase } };
  // Shim runs as a classic inline script in <head>, before the deferred module.
  const shim = `<script>${SHIM(store)}${scanResult ? `window.__scanResult=${JSON.stringify(scanResult)};` : ""}</script>`;
  await page.setContent(html.replace("</head>", `${shim}</head>`), { waitUntil: "domcontentloaded" });
  await page.addScriptTag({ content: popupJs, type: "module" });
  await page.waitForTimeout(200);
  return page;
}

const SIGNED_IN_STORE = {
  session: { token: "eyJ.a.b", origin: API_BASE, applicationId: "app-1", applicationName: "Buddy4Study India Foundation Scholarship", savedAt: Date.now() },
  profile: {
    full_name: "Aarav Sharma", cgpa: 8.6, percentage: 81.4, year_of_study: "2nd Year",
    branch: "Computer Science", state: "Karnataka", annual_family_income: 220000,
    institution_type: "Private", gender: "Male", category: "General",
  },
  settings: { apiBase: API_BASE, apiKey: "", llmBase: "https://integrate.api.nvidia.com/v1", llmModel: "meta/llama-3.3-70b-instruct", demo: false, demoCase: "docdiff" },
};

const browser = await chromium.launch();

// ---- the three tabs -------------------------------------------------------
{
  const page = await load(browser, structuredClone(SIGNED_IN_STORE));
  for (const tab of ["home", "scan", "setup"]) {
    await page.click(`.tab[data-tab="${tab}"]`);
    await page.waitForTimeout(80);
    await page.screenshot({ path: `${shots}/tab-${tab}.png` });
  }
  const homeText = await page.textContent("#panel-home");
  assert.ok(homeText.includes("8 of 8 fields"), "HOME: profile complete 8/8");
  assert.ok(homeText.includes("Buddy4Study India Foundation Scholarship"), "HOME: active application shown");
  assert.ok(homeText.includes("Your details stay in your browser. We never submit for you."), "HOME footer");
  assert.ok(homeText.includes("from your profile"), "HOME: provenance label");
  await page.close();
}

// ---- the four Scan states ----------------------------------------------
async function scan(name, opts, assertFn) {
  const page = await load(browser, structuredClone(SIGNED_IN_STORE), opts);
  await page.click('.tab[data-tab="scan"]');
  await page.click("#scan-btn");
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${shots}/scan-${name}.png` });
  const box = await page.$("#scan-result");
  const cls = await box.getAttribute("class");
  const text = await box.textContent();
  await assertFn(cls, text);

  // "Rather not autofill?" link — present whenever the payload carried a URL.
  const apply = await page.$("#scan-apply");
  const applyHidden = await apply.evaluate((el) => el.classList.contains("hidden"));
  const applyHref = await apply.getAttribute("href");
  if (opts.expectApplyHost) {
    assert.ok(!applyHidden, `${name}: apply-it-yourself link is shown`);
    assert.ok(
      applyHref && applyHref.includes(opts.expectApplyHost),
      `${name}: apply link points at ${opts.expectApplyHost} (got ${applyHref})`,
    );
  } else {
    assert.ok(applyHidden, `${name}: no apply link (payload had no URL)`);
  }
  await page.close();
}

// The content-script DOM walk is proven separately (verify-dom.mjs); here we
// feed the popup the result that walk produces for TEST-PAGE and check the render.
const WALK = {
  fill: {
    found: 12,
    filled: 10,
    need: ["Mobile Number", "Email Address"],
    unmappedLabels: [],
    declarations: ["I hereby declare that all information provided above is true and correct."],
  },
};

await scan(
  "docdiff",
  { demoCase: "docdiff", expectApplyHost: "buddy4study.com",
    scanResult: {
      blocked: false,
      ...WALK,
      diff: { formDemands: 6, pageListed: 4, unlisted: ["Domicile / Residence Certificate", "Migration Certificate"], matched: [] },
    },
  },
  (cls, text) => {
    assert.ok(cls.includes("diff"), "DOC DIFF: amber state");
    assert.ok(text.includes("demands 6 documents") && text.includes("listed 4"), "DOC DIFF: 6 vs 4");
    assert.ok(text.includes("Domicile / Residence Certificate") && text.includes("Migration Certificate"), "DOC DIFF: names the 2 extras");
  },
);

await scan(
  "filled",
  { demoCase: "filled", expectApplyHost: "buddy4study.com",
    scanResult: { blocked: false, ...WALK, diff: { formDemands: 6, pageListed: 6, unlisted: [], matched: [] } },
  },
  (cls, text) => {
    assert.ok(cls.includes("filled"), "FILLED: green state");
    assert.ok(/12 fields found\. 10 filled from your profile\. 2 need you\./.test(text), "FILLED: counts");
    assert.ok(text.includes("Mobile Number") && text.includes("Email Address"), "FILLED: lists what needs the user");
  },
);

await scan("blocked", { demoCase: "blocked" }, (cls, text) => {
  assert.ok(cls.includes("blocked"), "BLOCKED: red state");
  assert.ok(text.includes("Family income exceeds ₹3L"), "BLOCKED: the clause");
  assert.ok(text.includes("does not exceed Rs. 3,00,000"), "BLOCKED: source quote");
  assert.ok(text.includes("See what you qualify for"), "BLOCKED: escape hatch");
});

await scan("error", { demoCase: "error" }, (cls, text) => {
  assert.ok(cls.includes("error"), "ERROR: plain state");
  assert.ok(text.includes("Browser pages are off limits to extensions"), "ERROR: chrome-page message");
});

// ---- the build-time origin -----------------------------------------------
// No stored settings at all, so apiBase falls back to DEFAULTS.apiBase, which is
// the injected API_BASE. Proves a fresh install calls the domain this build was
// made for — the one thing a hardcoded URL somewhere else would break.
{
  const { settings: _dropped, ...noSettings } = structuredClone(SIGNED_IN_STORE);
  const page = await load(browser, noSettings);
  let requested = null;
  await page.route("**/api/fill/**", (route) => {
    requested = route.request().url();
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ blocked: false, fields: {}, official_documents: [] }) });
  });
  await page.click('.tab[data-tab="scan"]');
  await page.click("#scan-btn");
  await page.waitForTimeout(400);
  assert.ok(requested, "ORIGIN: popup issued no /api/fill request");
  assert.ok(
    requested.startsWith(`${API_BASE}/api/fill/`),
    `ORIGIN: popup called ${requested}, expected ${API_BASE}/api/fill/…`,
  );
  await page.close();
  console.log(`verify-popup: fresh install calls ${API_BASE}/api/fill/…`);
}

await browser.close();
console.log("verify-popup: 3 tabs + 4 Scan states render correctly. Screenshots in dist/shots/");
