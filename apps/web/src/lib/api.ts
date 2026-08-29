// One place where every browser -> API call is made, so the rules that break a
// live demo are enforced once instead of remembered five times:
//   - res.ok is checked before res.json()
//   - a non-JSON body (an HTML 404 page, a proxy error) never throws
//   - the caller always gets a result, never an exception
//
// Callers still own their `finally` block for clearing loading state.

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.error === "string") return body.error;
  } catch {
    // Not JSON — fall through to the status line.
  }
  return `Request failed (${res.status})`;
}

async function request<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return { ok: false, error: await readError(res) };
    try {
      return { ok: true, data: (await res.json()) as T };
    } catch {
      return { ok: false, error: "The server sent a response we could not read." };
    }
  } catch {
    // Offline, DNS failure, connection reset — the venue wifi case.
    return { ok: false, error: "Could not reach the server. Check your connection and try again." };
  }
}

export function apiGet<T>(url: string): Promise<ApiResult<T>> {
  return request<T>(url, { cache: "no-store" });
}

export function apiSend<T>(url: string, method: "POST" | "PATCH", body: unknown): Promise<ApiResult<T>> {
  return request<T>(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** The API routes answer a missing session with exactly this. */
export function isAuthError(error: string): boolean {
  return /unauthenticated/i.test(error);
}
