// Every Supabase client in this app reads its config through here — one place
// to fail loudly instead of four places that could each quietly go wrong.
// No fallback default of any kind: a missing or placeholder value throws at
// the moment it would have been used, not somewhere downstream as a cryptic
// network error against a domain nobody configured.
//
// IMPORTANT: Next.js inlines NEXT_PUBLIC_* vars into the client bundle only
// for a *static* `process.env.NEXT_PUBLIC_X` reference — never for a computed
// one like `process.env[name]`. Both reads below must stay written out by hand
// for that reason; a shared `required(name)` helper looks cleaner but silently
// breaks in the browser, where `process.env` isn't actually populated.

const PLACEHOLDER_HOSTS = ["dummy.supabase.co"];

function assertReal(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not set`);
  if (PLACEHOLDER_HOSTS.some((host) => value.includes(host))) {
    throw new Error(`${name} is still the placeholder (${value}) — point it at a real Supabase project`);
  }
  return value;
}

export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = assertReal("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = assertReal("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return { url, anonKey };
}
