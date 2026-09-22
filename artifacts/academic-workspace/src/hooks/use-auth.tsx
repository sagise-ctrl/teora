import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { customFetch, setAuthTokenGetter } from "../lib/api-client-react";
import {
  getStoredToken,
  clearStoredToken,
  setStoredToken,
  clearStoredRefreshToken,
  getStoredRefreshToken,
  setStoredRefreshToken,
  getLastActivity,
  setLastActivity,
  clearLastActivity,
  setManualLogout,
  clearManualLogout,
  markLoggedIn,
  IDLE_TIMEOUT_MS,
} from "../lib/session";
import { useToast } from "./use-toast";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isOwner: boolean;
  referralCode: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string, username: string, displayName?: string, referralCode?: string) => Promise<void>;
  signInWithOAuth: (provider: "google") => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Where to send a freshly-authenticated user after login.
 * Owners get a 2-choice landing (Admin vs User Test); everyone else goes straight to dashboard.
 * See DECISION 014 in `.ai/decisions.md`.
 */
export function getPostLoginPath(user: Pick<AuthUser, "isOwner"> | null | undefined): string {
  if (user?.isOwner) return "/landing-admin";
  return "/dashboard";
}

// Sliding-session timing constants (see session.ts for IDLE_TIMEOUT_MS).
// Proactive refresh runs slightly under the access-token TTL so we always
// have a fresh token before any user-initiated request goes out.
const REFRESH_INTERVAL_MS = 50 * 60 * 1000; // 50 minutes
const IDLE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const ACTIVITY_THROTTLE_MS = 60 * 1000; // 1 minute

type ForceLogoutReason = "expired" | "idle";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Restore token from sessionStorage and register as the auth getter
  // so customFetch attaches it to every API request.
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      setAuthTokenGetter(() => Promise.resolve(token));
    }
  }, []);

  const forceLogout = useCallback((reason: ForceLogoutReason) => {
    clearStoredToken();
    clearStoredRefreshToken();
    clearLastActivity();
    setAuthTokenGetter(null);
    setUser(null);

    // Defer the redirect so React flushes state updates (setUser(null)) and
    // sessionStorage writes before the page navigates away. Without this,
    // the login page can mount in a stale state and miss the toast.
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        window.location.href = "/login";
      }, 100);
    }
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      const data = await customFetch<AuthUser>("/api/auth/me");
      setUser(data);
    } catch {
      // customFetch will dispatch `auth:expired` for non-auth endpoints, so
      // the listener below handles the actual logout + redirect + toast.
      // We still defensively clear user state in case the event was missed
      // (e.g. older customFetch without the interceptor).
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
      // Same as fetchMe — interceptor handles logout, defensive clear here.
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

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    if (import.meta.env.VITE_MOCK === "true") {
      await customFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const me = await fetchMe();
      // fetchMe updates `user` state but doesn't return it — re-fetch for the caller.
      const fresh = await customFetch<AuthUser>("/api/auth/me");
      setUser(fresh);
      markLoggedIn();
      // Successful login → reset manual-logout flag so future session
      // expiries can surface the "Sesi Anda sudah berakhir" toast.
      clearManualLogout();
      setLastActivity(Date.now());
      return fresh;
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
    setStoredRefreshToken(session.refresh_token);
    setAuthTokenGetter(() => Promise.resolve(session.access_token));
    markLoggedIn();
    clearManualLogout();
    setLastActivity(Date.now());

    await fetchMe();

    // Return the freshly-set user so the caller can branch on isOwner for redirect.
    const fresh = await customFetch<AuthUser>("/api/auth/me");
    setUser(fresh);
    return fresh;
  }, [fetchMe]);

  const register = useCallback(async (
    email: string,
    password: string,
    username: string,
    displayName?: string,
    referralCode?: string
  ) => {
    // Call backend to create Supabase user + local record + referral.
    // When email confirm is off (dev), backend returns { ..., access_token }.
    // When email confirm is on (prod), backend returns user without access_token.
    const response = await customFetch<AuthUser & { access_token?: string; refresh_token?: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, username, displayName, referralCode }),
    });

    if ("error" in response) {
      throw new Error((response as { error: string }).error);
    }

    // If the backend returned tokens, store them and register as auth getter.
    // This handles dev mode where we auto-login after registration.
    // In prod (email confirm required), tokens are absent and the user logs in manually.
    if (response.access_token) {
      setStoredToken(response.access_token);
      setAuthTokenGetter(() => Promise.resolve(response.access_token!));
      markLoggedIn();
      clearManualLogout();
      setLastActivity(Date.now());
    }
    if (response.refresh_token) {
      setStoredRefreshToken(response.refresh_token);
    }

    await fetchMe();
  }, [fetchMe]);

  const logout = useCallback(async () => {
    // Mark before clearing so the login page can detect this was deliberate
    // (and skip the "Sesi Anda sudah berakhir" toast — manual logout is
    // intentional, not a session expiry).
    setManualLogout();
    clearStoredToken();
    clearStoredRefreshToken();
    clearLastActivity();
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

  // -------------------------------------------------------------------------
  // Bug 2: activity tracking + idle timeout + proactive refresh
  // -------------------------------------------------------------------------

  // Track user activity (mousemove/keydown/click/touchstart) to:
  //   1. Update lastActivityAt for the idle-timer check.
  //   2. Implicitly extend the session for active users.
  // Throttled to once per minute — these events fire very frequently.
  useEffect(() => {
    let lastUpdate = 0;
    const updateActivity = () => {
      const now = Date.now();
      if (now - lastUpdate < ACTIVITY_THROTTLE_MS) return;
      lastUpdate = now;
      setLastActivity(now);
    };

    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);
    window.addEventListener("touchstart", updateActivity);

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("touchstart", updateActivity);
    };
  }, []);

  // Proactive refresh — keep the access token fresh while the user is active.
  // Without this, the access token (1h TTL) would expire and the next API
  // call would 401 → forceLogout. Refresh every 50min so a token is never
  // older than ~50min when used.
  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => {
      refresh().catch(() => {
        // refresh failure → customFetch dispatched auth:expired → forceLogout
        // will run via the listener below.
      });
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [user, refresh]);

  // Idle timeout — if no activity for IDLE_TIMEOUT_MS (7 days per owner
  // requirement), force logout. We re-prime lastActivity on first observe
  // (when null) so a freshly-restored session doesn't immediately expire.
  useEffect(() => {
    if (!user) return;
    if (getLastActivity() === null) {
      setLastActivity(Date.now());
    }
    const checkIdle = () => {
      const last = getLastActivity();
      if (last !== null && Date.now() - last >= IDLE_TIMEOUT_MS) {
        forceLogout("idle");
      }
    };
    const interval = window.setInterval(checkIdle, IDLE_CHECK_INTERVAL_MS);
    checkIdle(); // initial check on (re)mount
    return () => window.clearInterval(interval);
  }, [user, forceLogout]);

  // -------------------------------------------------------------------------
  // Bug 3: react to auth:expired events from customFetch
  // -------------------------------------------------------------------------
  //
  // customFetch dispatches `auth:expired` on any 401 from a non-auth endpoint
  // (login/register can 401 for wrong credentials — that must not auto-logout
  // an unauthenticated visitor). Toast + redirect happens here, once, so the
  // message is consistent regardless of which API call surfaced the 401.
  useEffect(() => {
    const handleExpired = () => {
      toast({
        title: "Sesi Anda sudah berakhir",
        description: "Silakan login ulang.",
        variant: "destructive",
      });
      forceLogout("expired");
    };
    window.addEventListener("auth:expired", handleExpired);
    return () => window.removeEventListener("auth:expired", handleExpired);
  }, [forceLogout, toast]);

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
