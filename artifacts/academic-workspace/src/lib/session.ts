/**
 * Client-side session storage.
 *
 * Tokens (access + refresh), idle-tracking timestamp, and "user logged out
 * manually" flag are all stored in `localStorage`, which means:
 *   - closing the tab / browser keeps the user logged in
 *   - opening a new tab in the same browser inherits the session
 *   - the only thing that ends the session is `forceLogout()` (called by
 *     the 7-day idle timer, the 401 interceptor, or the manual logout
 *     button).
 *
 * This is per owner requirement (2026-09-21, follow-up): "ganti supaya
 * tab close tetap ingat login (tapi logout hanya kalau 7 hari diam)".
 *
 * `localStorage` is also used for the non-sensitive `teora_has_logged_in`
 * flag — the login page reads it to decide whether to show the "Sesi Anda
 * sudah berakhir" toast. First-time visitors should NOT see that toast.
 *
 * Cross-origin cookies (backend domain vs frontend domain) are blocked by
 * browsers by default, so we use the Authorization header (set by
 * customFetch from these tokens) for cross-origin API calls.
 */

const SESSION_KEY = "teora_access_token";
const REFRESH_KEY = "teora_refresh_token";
const LAST_ACTIVITY_KEY = "teora_last_activity";
const MANUAL_LOGOUT_KEY = "teora_manual_logout";

// localStorage flag (survives tab close) — used by the login page to
// decide whether to show "Sesi Anda sudah berakhir" toast.
const HAS_LOGGED_IN_KEY = "teora_has_logged_in";

// Sliding-session timing — see use-auth.tsx for usage.
// 7 days idle (per owner requirement 2026-09-21).
export const IDLE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Access / refresh tokens — localStorage
// ---------------------------------------------------------------------------

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(SESSION_KEY, token);
  } catch {
    // localStorage may be blocked in private browsing
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setStoredRefreshToken(token: string): void {
  try {
    localStorage.setItem(REFRESH_KEY, token);
  } catch {
    // ignore
  }
}

export function clearStoredRefreshToken(): void {
  try {
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Idle tracking — localStorage (so it persists across tab close/reopen)
// ---------------------------------------------------------------------------

export function getLastActivity(): number | null {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function setLastActivity(timestamp: number): void {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp));
  } catch {
    // ignore
  }
}

export function clearLastActivity(): void {
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Manual logout flag — localStorage (persists across tab close until next
// login so the toast is suppressed on EVERY page that lands on /login
// after a deliberate logout, not just the first one)
// ---------------------------------------------------------------------------

/**
 * Mark that the user explicitly logged out (clicked the logout button).
 * The login page reads this on mount and skips the "Sesi Anda sudah
 * berakhir" toast in that case — manual logout is deliberate, not a
 * session expiry. Flag persists across tab close (in localStorage) and
 * is cleared automatically by the next successful login.
 */
export function setManualLogout(): void {
  try {
    localStorage.setItem(MANUAL_LOGOUT_KEY, "true");
  } catch {
    // ignore
  }
}

export function hasManualLogout(): boolean {
  try {
    return localStorage.getItem(MANUAL_LOGOUT_KEY) === "true";
  } catch {
    return false;
  }
}

export function clearManualLogout(): void {
  try {
    localStorage.removeItem(MANUAL_LOGOUT_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Login history — localStorage (used for toast logic)
// ---------------------------------------------------------------------------

/**
 * Returns true once the user has ever logged in successfully on this device.
 * Used by the login page to decide whether to surface the "Sesi Anda sudah
 * berakhir" toast — first-time visitors should NOT see that toast (they
 * have no prior session).
 */
export function hasEverLoggedIn(): boolean {
  try {
    return localStorage.getItem(HAS_LOGGED_IN_KEY) === "true";
  } catch {
    return false;
  }
}

export function markLoggedIn(): void {
  try {
    localStorage.setItem(HAS_LOGGED_IN_KEY, "true");
  } catch {
    // ignore
  }
}
