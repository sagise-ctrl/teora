import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { customFetch, setAuthTokenGetter } from "../lib/api-client-react";
import { getStoredToken, clearStoredToken, setStoredToken, clearStoredRefreshToken, getStoredRefreshToken } from "../lib/session";

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
  signInWithOAuth: (provider: "google") => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore token from localStorage and register as the auth getter
  // so customFetch attaches it to every API request.
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      setAuthTokenGetter(() => Promise.resolve(token));
    }
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      const data = await customFetch<AuthUser>("/api/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    const token = getStoredToken();
    const refreshToken = getStoredRefreshToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      await customFetch("/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken ?? undefined }),
      });
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

    // Call backend to validate token + create/update local user record.
    // Backend returns the user and sets a cookie. Also store the token locally
    // so customFetch can attach it as Authorization header.
    await customFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
    });

    setStoredToken(session.access_token);
    setAuthTokenGetter(() => Promise.resolve(session.access_token));

    await fetchMe();
  }, [fetchMe]);

  const register = useCallback(async (
    email: string,
    password: string,
    displayName?: string,
    referralCode?: string
  ) => {
    // Call backend to create Supabase user + local record + referral.
    // When email confirm is off (dev), backend returns { ..., access_token }.
    // When email confirm is on (prod), backend returns user without access_token.
    const response = await customFetch<AuthUser & { access_token?: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName, referralCode }),
    });

    if ("error" in response) {
      throw new Error((response as { error: string }).error);
    }

    // If the backend returned an access_token, store it and register as auth getter.
    // This handles dev mode where we auto-login after registration.
    // In prod (email confirm required), access_token is absent and the user logs in manually.
    if (response.access_token) {
      setStoredToken(response.access_token);
      setAuthTokenGetter(() => Promise.resolve(response.access_token!));
    }

    await fetchMe();
  }, [fetchMe]);

  const logout = useCallback(async () => {
    clearStoredToken();
    clearStoredRefreshToken();
    setAuthTokenGetter(null);
    try {
      const { supabase } = await import("../lib/supabase");
      if (supabase) await supabase.auth.signOut();
    } catch {
      // ignore
    }
    try {
      await customFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setUser(null);
  }, []);

  const signInWithOAuth = useCallback(async (provider: "google") => {
    if (import.meta.env.VITE_MOCK === "true") {
      throw new Error("Google login not available in mock mode");
    }

    const { supabase } = await import("../lib/supabase");
    if (!supabase) throw new Error("Supabase not configured");

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + "/auth/callback",
      },
    });

    if (error) throw error;
    // Browser navigates away to Google; control does not return here in practice.
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, signInWithOAuth, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
