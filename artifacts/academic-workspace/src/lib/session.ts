/**
 * Client-side session storage.
 * Stores the access token in localStorage so customFetch can attach it
 * as an Authorization header for cross-origin API calls to the backend.
 *
 * Cross-origin cookies (backend domain vs frontend domain) are blocked by
 * browsers by default, so we use localStorage + Authorization header instead.
 */

const SESSION_KEY = "teora_access_token";

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
