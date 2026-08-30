/// <reference lib="dom" />
/// <reference types="chrome" />
// Injected into the opportunity portal's tab by the popup (chrome.scripting +
// activeTab — no standing host permission). One message in, one result out.
// The work is in form-scan.ts; this file is only the message bridge.
//
// NOTE: injected as a classic content script, so this module must not emit an
// `export` — form-scan's exports get inlined by esbuild and disappear here.

import { documentDiff, fillForm, type FieldSpec } from "./form-scan";

interface ScanMessage {
  type: "ELIGENT_SCAN";
  blocked: boolean;
  fields: Record<string, FieldSpec>;
  officialDocs: string[];
  /** label text -> profile key, learned by the model on a past scan of this host */
  extraMap: Record<string, string>;
}

declare global {
  interface Window {
    __eligentLoaded?: boolean;
  }
}

if (!window.__eligentLoaded) {
  window.__eligentLoaded = true;
  chrome.runtime.onMessage.addListener((msg: ScanMessage, _sender, sendResponse) => {
    if (msg?.type !== "ELIGENT_SCAN") return false;
    try {
      if (msg.blocked) {
        sendResponse({ blocked: true });
        return true;
      }
      const fill = fillForm(msg.fields ?? {}, msg.extraMap ?? {});
      const diff = documentDiff(msg.officialDocs ?? []);
      sendResponse({ blocked: false, fill, diff });
    } catch (err) {
      sendResponse({ error: err instanceof Error ? err.message : String(err) });
    }
    return true;
  });
}
