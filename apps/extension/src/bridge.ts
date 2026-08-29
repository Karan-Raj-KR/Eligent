// Runs only on the Cutoff web app's own pages (see manifest content_scripts).
// Its whole job is to hand the extension the signed-in session and whichever
// application the user is looking at. It never touches a scholarship portal.

function readAccessToken(): string | null {
  // supabase-js stores the session under sb-<project-ref>-auth-token.
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !/^sb-.*-auth-token$/.test(key)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const token = parsed?.access_token ?? parsed?.currentSession?.access_token;
      if (typeof token === "string" && token.length > 0) return token;
    } catch {
      // Not the shape we expected — try the next key.
    }
  }
  return null;
}

/** /application/<uuid> is the only page that identifies one. */
function readApplicationId(): string | null {
  const match = window.location.pathname.match(/^\/application\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function readApplicationName(): string | null {
  const heading = document.querySelector("h1");
  const text = heading?.textContent?.trim();
  return text && text !== "Your application" ? text : null;
}

function publish() {
  const token = readAccessToken();
  if (!token) return;
  chrome.runtime.sendMessage({
    type: "SESSION_FROM_APP",
    token,
    origin: window.location.origin,
    applicationId: readApplicationId(),
    applicationName: readApplicationName(),
  });
}

publish();
// The app is a SPA and the heading arrives after the first paint.
setTimeout(publish, 1500);
