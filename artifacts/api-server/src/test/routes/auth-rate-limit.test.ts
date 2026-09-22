/**
 * Per-route rate-limit tests for /auth/login and /auth/register.
 *
 * Verifies the 2026-09-21 fix that removed the blanket
 * `app.use('/api/auth', authLimiter)` from `src/app.ts` and replaced it
 * with per-route limiters. Google OAuth flow consumes 4–5 auth calls per
 * attempt, so a blanket 5/min cap would lock users out — see
 * `.ai/lessons-learned.md` ERR-007.
 *
 * This file is intentionally separate from `routes/auth.test.ts` because
 * that file is currently excluded from CI due to pre-existing mock-chain
 * issues (see `vitest.config.ts`). This file uses a self-contained setup
 * (own mocks for DB / Supabase / nanoid) so it runs in CI regardless.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";

// ─── Mock state ──────────────────────────────────────────────────────────

const { DB_MOCK } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    then: (onFulfilled: (v: unknown[]) => unknown) =>
      Promise.resolve([]).then(onFulfilled),
  };
  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.values = vi.fn().mockReturnThis();
  chain.returning = vi.fn().mockReturnValue([]);
  chain.orderBy = vi.fn().mockReturnThis();
  chain.limit = vi.fn().mockReturnThis();
  chain.offset = vi.fn().mockReturnThis();
  chain.set = vi.fn().mockReturnThis();
  chain.delete = vi.fn().mockReturnThis();
  chain.innerJoin = vi.fn().mockReturnThis();
  chain.count = vi.fn().mockReturnValue({ count: 0 });
  chain.onConflictDoUpdate = vi.fn().mockReturnThis();
  return { DB_MOCK: chain };
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Mock @workspace/db ──────────────────────────────────────────────────

vi.mock("@workspace/db", () => ({
  db: DB_MOCK,
  eq: vi.fn(() => ({})),
  and: vi.fn(),
  or: vi.fn(),
  usersTable: { _: { table: { name: "users" } } },
  referralsTable: { _: { table: { name: "referrals" } } },
  referralEventsTable: { _: { table: { name: "referral_events" } } },
  projectsTable: {},
  jobsTable: {},
  activitiesTable: {},
  projectMetadataTable: {},
  messagesTable: {},
  documentVersionsTable: {},
  attachmentsTable: {},
  referencesTable: {},
}));

// ─── Mock @supabase/supabase-js ───────────────────────────────────────────

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn((token: string) => {
        if (!token || !String(token).startsWith("valid.")) {
          return { data: { user: null }, error: { message: "Invalid token" } };
        }
        return {
          data: { user: { id: "test-user-id", email: "test@example.com" } },
          error: null,
        };
      }),
      admin: { createUser: vi.fn(() => ({ data: null, error: null })) },
      refreshSession: vi.fn(() => ({
        data: { session: { access_token: "x", refresh_token: "y" } },
        error: null,
      })),
    },
  })),
}));

vi.mock("nanoid", () => ({
  customAlphabet: vi.fn(() => () => "TESTCODE1"),
  nanoid: vi.fn(() => "mock-nanoid"),
}));

// ─── Import routes AFTER all mocks ───────────────────────────────────────

import authRouter from "../../routes/auth.ts";

// ─── Test app factory ────────────────────────────────────────────────────

function buildApp() {
  const app = express();
  app.set("trust proxy", 1); // Vercel uses proxy 1
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api", authRouter);
  return app;
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe("Per-route rate limiting (auth.ts loginLimiter / registerLimiter)", () => {
  it("POST /auth/login returns 429 after 5 rapid attempts from same IP", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    let lastStatus = 0;
    for (let i = 0; i < 6; i++) {
      const res = await agent
        .post("/api/auth/login")
        .set("X-Forwarded-For", "10.0.0.1")
        .send({ access_token: "valid.mock.token" });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });

  it("POST /auth/register returns 429 after 5 rapid attempts from same IP", async () => {
    const app = buildApp();
    let lastStatus = 0;
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post("/api/auth/register")
        .set("X-Forwarded-For", "10.0.0.2")
        .send({
          email: `newuser${i}@example.com`,
          username: `newuser${i}`,
          password: "password123",
        });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });

  it("GET /auth/me is NOT rate-limited (no 429 after many calls)", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    agent.set("X-Forwarded-For", "10.0.0.3");
    for (let i = 0; i < 10; i++) {
      const res = await agent.get("/api/auth/me");
      // /auth/me uses authMiddleware and may return 401 without JWT —
      // the assertion is "not 429" since 429 means rate-limited.
      expect(res.status).not.toBe(429);
    }
  });

  it("POST /auth/refresh is NOT rate-limited (no 429 after many calls)", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    agent.set("X-Forwarded-For", "10.0.0.4");
    for (let i = 0; i < 10; i++) {
      const res = await agent.post("/api/auth/refresh").send({});
      expect(res.status).not.toBe(429);
    }
  });

  it("GET /auth/check-username is NOT rate-limited (no 429 after many calls)", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    agent.set("X-Forwarded-For", "10.0.0.5");
    for (let i = 0; i < 10; i++) {
      const res = await agent.get("/api/auth/check-username?u=test");
      expect(res.status).not.toBe(429);
    }
  });
});

// Reference unused import to satisfy strict mode linting.
void (null as unknown as Request);
void (null as unknown as Response);
