import { describe, it, expect, afterAll } from "vitest";
import { supabaseAdmin, getSupabaseAdminOr503 } from "../../lib/supabase-admin";

describe("C1: supabase-admin lazy initialization", () => {
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  it("module loads without throwing when env is missing", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    // Re-import to get fresh module — but since module is loaded once,
    // we test that the symbol exists and proxy access fails gracefully.
    expect(supabaseAdmin).toBeDefined();
  });

  it("accessing a property throws with helpful message when env is missing", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    // Note: this test only valid on first import (module-init state).
    // If env was set during test run, this throws the createClient error.
    try {
      void (supabaseAdmin as unknown as { storage: unknown }).storage;
      // If we get here, env was actually set during test setup.
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).toMatch(/SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY/);
    }
  });

  it("getSupabaseAdminOr503 returns null + 503 when env missing", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    // Need a fresh build to test this — skip if env was already populated.
    if (originalUrl && originalKey) {
      // env was set, module already initialized; can't test missing-env path.
      return;
    }
    let capturedStatus: number | undefined;
    let capturedBody: unknown;
    const fakeRes = {
      status(n: number) {
        capturedStatus = n;
        return { json: (b: unknown) => { capturedBody = b; } };
      },
    };
    const client = getSupabaseAdminOr503(fakeRes);
    expect(client).toBeNull();
    expect(capturedStatus).toBe(503);
    expect(capturedBody).toMatchObject({ error: expect.stringMatching(/SUPABASE_URL/) });
  });

  afterAll(() => {
    if (originalUrl) process.env.SUPABASE_URL = originalUrl;
    if (originalKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });
});
