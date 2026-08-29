// Holds the session the bridge scrapes off the web app, and nothing else.
// There is deliberately no autofill path here: filling happens only from an
// explicit click in the popup.

export interface Session {
  token: string;
  origin: string;
  applicationId: string | null;
  applicationName: string | null;
  savedAt: number;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SESSION_FROM_APP") {
    const next: Session = {
      token: message.token,
      origin: message.origin,
      applicationId: message.applicationId ?? null,
      applicationName: message.applicationName ?? null,
      savedAt: Date.now(),
    };
    // Keep a previously captured application if this page didn't name one.
    chrome.storage.local.get(["session"], (stored) => {
      const previous: Session | undefined = stored.session;
      if (!next.applicationId && previous?.applicationId) {
        next.applicationId = previous.applicationId;
        next.applicationName = previous.applicationName;
      }
      chrome.storage.local.set({ session: next }, () => sendResponse({ ok: true }));
    });
    return true;
  }

  if (message?.type === "SIGN_OUT") {
    chrome.storage.local.remove("session", () => sendResponse({ ok: true }));
    return true;
  }

  return false;
});
