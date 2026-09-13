import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// C1 fix: defer client creation until first use so a missing env var doesn't
// crash the entire server at module load. Instead the first caller gets a
// clear 503-style error from the route handler (via notInitializedError()).
//
// The module still exposes the same `supabaseAdmin` symbol so existing
// callers (auth.ts, profile.ts, attachments.ts) need no change beyond
// importing this file.
let _client: SupabaseClient | null = null;
let _initialized = false;

function buildClient(): SupabaseClient {
  if (!_initialized) {
    if (!supabaseUrl || !serviceRoleKey) {
      // Throws on first use, not on import.
      throw new Error(
        "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured. " +
          "Set both environment variables in .env (see api-server/.env.example).",
      );
    }
    _client = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    _initialized = true;
  }
  return _client;
}

/**
 * Lazy proxy around the supabase admin client. Accessing any property
 * (`supabaseAdmin.storage`, `supabaseAdmin.auth`, ...) triggers
 * initialization on first use.
 */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, _receiver) {
    const client = buildClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/**
 * Helper for route handlers: catch the lazy-init error and return 503
 * with a clear message instead of a 500.
 */
export function getSupabaseAdminOr503(res: { status: (n: number) => { json: (b: unknown) => void } }): SupabaseClient | null {
  try {
    return buildClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Supabase admin client unavailable";
    res.status(503).json({ error: message });
    return null;
  }
}
