import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { customFetch } from "@workspace/api-client-react";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  isOwner: boolean;
  referralCode: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const data = await customFetch<AuthUser>("/api/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      await customFetch("/api/auth/refresh", { method: "POST" });
      await fetchMe();
    } catch {
      setUser(null);
    }
  }, [fetchMe]);

  useEffect(() => {
    if (import.meta.env.VITE_MOCK === "true") {
      // Still call fetchMe so MSW can intercept /api/auth/me and set the user
      fetchMe().finally(() => setIsLoading(false));
      return;
    }
    refresh().finally(() => setIsLoading(false));
  }, [refresh, fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    if (import.meta.env.VITE_MOCK === "true") {
      await customFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await fetchMe();
      return;
    }

    const { supabase } = await import("../lib/supabase");
    if (!supabase) throw new Error("Supabase not configured");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data) throw error ?? new Error("Login failed");

    // signInWithPassword always returns session
    const session = (data as unknown as { session?: { access_token: string; refresh_token: string } }).session;
    if (!session) throw new Error("Login failed: no session returned");

    await customFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
    });

    await fetchMe();
  }, [fetchMe]);

  const register = useCallback(async (
    email: string,
    password: string,
    displayName?: string,
    referralCode?: string
  ) => {
    const { supabase } = await import("../lib/supabase");
    if (!supabase) throw new Error("Supabase not configured");

    // Step 1: Call backend to create Supabase user + local record + referral
    const newUser = await customFetch<AuthUser>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName, referralCode }),
    });

    // Step 2: Get the session that was set in cookies by the backend
    // Supabase SDK on frontend can read the session from cookies
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      // No session means email confirmation is required
      // The user will receive a confirmation email
      return;
    }

    // Step 3: Sync the session from cookies to frontend SDK
    await fetchMe();
  }, [fetchMe]);

  const logout = useCallback(async () => {
    try {
      const { supabase } = await import("../lib/supabase");
      if (supabase) await supabase.auth.signOut();
    } catch {
      // ignore
    }
    try {
      await customFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
