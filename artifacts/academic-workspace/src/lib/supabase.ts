import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          // Disable SDK auto-refresh — we handle token sync via /api/auth/login
          autoRefreshToken: false,
          // Disable detectSessionInUrl — we manually handle OAuth callback in auth-callback.tsx
          detectSessionInUrl: false,
        },
      })
    : null;
