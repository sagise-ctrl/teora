import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// vi.hoisted creates the mock before vi.mock hoisting — allows sharing
// the same mock instance between vi.mock factory and test code
const mockCustomFetch = vi.hoisted(() => vi.fn());

vi.mock("../lib/api-client-react", () => ({
  customFetch: mockCustomFetch,
}));
vi.mock("@/lib/supabase", () => ({ supabase: null }));

import { AuthProvider, useAuth, type AuthUser } from "@/hooks/use-auth";

const fakeUser: AuthUser = {
  id: "user-123",
  email: "test@example.com",
  displayName: "Test User",
  avatarUrl: null,
  isOwner: false,
  referralCode: "ABC123",
};

describe("useAuth hook", () => {
  beforeEach(() => {
    mockCustomFetch.mockReset();
    mockCustomFetch.mockImplementation(() => Promise.resolve(null));
  });

  it("throws when useAuth is used outside AuthProvider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(
      /useAuth must be used within AuthProvider/
    );
    consoleError.mockRestore();
  });

  it("sets user from /auth/me after initial refresh", async () => {
    mockCustomFetch.mockImplementation((url: unknown) => {
      if (url === "/api/auth/me") return Promise.resolve(fakeUser);
      if (url === "/auth/refresh") return Promise.resolve({ message: "ok" });
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.isLoading).toBe(false);
    expect(mockCustomFetch).toHaveBeenCalledWith("/api/auth/me");
  });

  it("clears user when /auth/me fails with 401", async () => {
    mockCustomFetch.mockImplementation((url: unknown) => {
      if (url === "/api/auth/me") return Promise.reject(new Error("401 Unauthorized"));
      if (url === "/auth/refresh") return Promise.resolve({ message: "ok" });
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("clears user on logout", async () => {
    mockCustomFetch.mockImplementation((url: unknown) => {
      if (url === "/api/auth/me") return Promise.resolve(fakeUser);
      if (url === "/auth/refresh") return Promise.resolve({ message: "ok" });
      if (url === "/auth/logout") return Promise.resolve({ message: "Logged out" });
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.user).toEqual(fakeUser);

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(mockCustomFetch).toHaveBeenCalledWith("/auth/logout", { method: "POST" });
  });

  it("logout continues even if backend call fails", async () => {
    mockCustomFetch.mockImplementation((url: unknown) => {
      if (url === "/api/auth/me") return Promise.resolve(fakeUser);
      if (url === "/auth/refresh") return Promise.resolve({ message: "ok" });
      if (url === "/auth/logout") return Promise.reject(new Error("Network"));
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
  });

  it("refresh updates user after token refresh", async () => {
    const updatedUser = { ...fakeUser, displayName: "Updated Name" };
    mockCustomFetch.mockImplementation((url: unknown) => {
      if (url === "/api/auth/me") return Promise.resolve(fakeUser);
      if (url === "/auth/refresh") return Promise.resolve({ message: "ok" });
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.user?.displayName).toBe("Test User");

    mockCustomFetch.mockImplementation((url: unknown) => {
      if (url === "/api/auth/me") return Promise.resolve(updatedUser);
      if (url === "/auth/refresh") return Promise.resolve({ message: "ok" });
      return Promise.resolve(null);
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.user?.displayName).toBe("Updated Name");
  });

  it("refresh clears user if token refresh fails", async () => {
    mockCustomFetch.mockImplementation((url: unknown) => {
      if (url === "/api/auth/me") return Promise.resolve(fakeUser);
      if (url === "/auth/refresh") return Promise.resolve({ message: "ok" });
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.user).toEqual(fakeUser);

    mockCustomFetch.mockImplementation((url: unknown) => {
      if (url === "/auth/refresh") return Promise.reject(new Error("Token expired"));
      return Promise.resolve(null);
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.user).toBeNull();
  });
});
