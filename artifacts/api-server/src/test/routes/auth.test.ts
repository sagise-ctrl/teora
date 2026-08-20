import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";

// ─── Mock state (hoisted so resetState is accessible at module scope) ───────────
const { DB_MOCK, resetState, USER_ID, USER_EMAIL } = vi.hoisted(() => {
  const USER_ID = "123e4567-e89b-12d3-a456-426614174000";
  const USER_EMAIL = "test@example.com";

  const mockUser = {
    id: USER_ID,
    email: USER_EMAIL,
    displayName: null,
    avatarUrl: null,
    isOwner: false,
    referralCode: "MOCKREF1",
    createdAt: new Date().toISOString(),
  };

  const mockReferral = {
    id: 1,
    referrerId: USER_ID,
    referredId: "other-user-id",
    referredEmail: "referred@example.com",
    referralCode: "REFCODE1",
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  };

  let _result: unknown[] = [mockUser];
  let _insertTable = "";
  let _referralWhereCalls = 0;
  let _usersWhereCalls = 0;
  let _queryIndex = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    then: (onFulfilled: (v: unknown[]) => unknown) => Promise.resolve(_result).then(onFulfilled),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectFn = vi.fn().mockReturnValue(chain);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromFn = vi.fn().mockReturnValue(chain);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereFn = vi.fn().mockImplementation(function (this: any, _cond: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = _cond as any;
    const tableName: string = c?._?.table?.name ?? "";
    _queryIndex++;
    if (tableName === "users") {
      _usersWhereCalls++;
      // 1st lookup = /auth/me (returns user); 2nd+ = generated-code collision check (empty)
      _result = _usersWhereCalls === 1 ? [mockUser] : [];
    } else if (tableName === "referrals") {
      _referralWhereCalls++;
      _result = _referralWhereCalls === 1 ? [mockReferral] : [];
    } else if (tableName === "referral_events") {
      _result = [];
    } else {
      // Generic query: first query = /auth/me (returns user),
      // queries 2-11 = code collision checks for nanoid=TESTCODE1 (empty)
      _result = _queryIndex === 1 ? [mockUser] : [];
    }
    return chain;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertFn = vi.fn().mockImplementation(function (this: any, table: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = table as any;
    _insertTable = t?._?.table?.name ?? t?.name ?? "";
    return chain;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const valuesFn = vi.fn().mockReturnThis();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const returningFn = vi.fn().mockImplementation(function (this: any) {
    if (_insertTable === "users") return [mockUser];
    if (_insertTable === "referrals") return [mockReferral];
    if (_insertTable === "referral_events") return [{ id: 1 }];
    return [mockUser];
  });

  chain.select = selectFn;
  chain.from = fromFn;
  chain.where = whereFn;
  chain.insert = insertFn;
  chain.values = valuesFn;
  chain.returning = returningFn;
  chain.orderBy = vi.fn().mockReturnThis();
  chain.limit = vi.fn().mockReturnThis();
  chain.offset = vi.fn().mockReturnThis();
  chain.set = vi.fn().mockReturnThis();
  chain.delete = vi.fn().mockReturnThis();
  chain.innerJoin = vi.fn().mockReturnThis();
  chain.count = vi.fn().mockReturnValue({ count: 1 });
  chain.onConflictDoUpdate = vi.fn().mockReturnThis();

  const resetState = () => {
    _queryIndex = 0;
    _referralWhereCalls = 0;
    _usersWhereCalls = 0;
    _result = [mockUser];
    _insertTable = "";
    vi.mocked(selectFn).mockClear();
    vi.mocked(fromFn).mockClear();
    vi.mocked(whereFn).mockClear();
    vi.mocked(insertFn).mockClear();
    vi.mocked(returningFn).mockClear();
  };

  return { DB_MOCK: chain, resetState, USER_ID, USER_EMAIL };
});

beforeEach(() => {
  resetState();
});

// ─── Mock @workspace/db ───────────────────────────────────────────────────────
vi.mock("@workspace/db", () => ({
  db: DB_MOCK,
  eq: vi.fn(() => ({})),
  and: vi.fn(),
  or: vi.fn(),
  usersTable: { _: { table: { name: "users" } }, [Symbol.for("drizzle:tableName")]: "users" },
  referralsTable: { _: { table: { name: "referrals" } }, [Symbol.for("drizzle:tableName")]: "referrals" },
  referralEventsTable: { _: { table: { name: "referral_events" } }, [Symbol.for("drizzle:tableName")]: "referral_events" },
  projectsTable: {},
  jobsTable: {},
  activitiesTable: {},
  projectMetadataTable: {},
  messagesTable: {},
  documentVersionsTable: {},
  attachmentsTable: {},
  referencesTable: {},
}));

// ─── Mock @supabase/supabase-js ──────────────────────────────────────────────
vi.mock("@supabase/supabase-js", () => {
  const USER_ID = "123e4567-e89b-12d3-a456-426614174000";
  const USER_EMAIL = "test@example.com";
  return {
    createClient: vi.fn(() => ({
      auth: {
        getUser: vi.fn((token: string) => {
          // Only tokens starting with "valid." are accepted by this mock
          if (!token || !String(token).startsWith("valid.")) {
            return { data: { user: null }, error: { message: "Invalid token" } };
          }
          return { data: { user: { id: USER_ID, email: USER_EMAIL } }, error: null };
        }),
        admin: {
          createUser: vi.fn(() => ({
            data: {
              user: { id: USER_ID, email: USER_EMAIL },
              session: { access_token: "mock-access-token", refresh_token: "mock-refresh-token" },
            },
            error: null,
          })),
        },
        refreshSession: vi.fn(() => ({
          data: { session: { access_token: "new-access-token", refresh_token: "new-refresh-token" } },
          error: null,
        })),
      },
    })),
  };
});

// ─── Mock nanoid ──────────────────────────────────────────────────────────────
vi.mock("nanoid", () => ({
  customAlphabet: vi.fn(() => () => "TESTCODE1"),
  nanoid: vi.fn(() => "mock-nanoid"),
}));

// ─── Import routes AFTER all mocks ───────────────────────────────────────────
import authRouter from "../../routes/auth.ts";
import healthRouter from "../../routes/health.ts";

// ─── Test app factories ───────────────────────────────────────────────────────

/** App with user injected — req.user is set on every request */
function buildAppWithAuth() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const injectUser = (req: Request, _res: Response, next: () => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).user = { id: USER_ID, email: USER_EMAIL };
    next();
  };

  app.use("/", healthRouter);
  app.use("/api", injectUser, authRouter);
  return app;
}

/** App WITHOUT user injection — simulates unauthenticated requests */
function buildAppWithoutAuth() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/", healthRouter);
  app.use("/api", authRouter);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("Auth: GET /api/auth/me", () => {
  it("returns 200 with user data when authenticated", async () => {
    const app = buildAppWithAuth();
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("email");
    expect(res.body.id).toBe(USER_ID);
    expect(res.body.email).toBe(USER_EMAIL);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await request(buildAppWithoutAuth()).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });
});

describe("Auth: POST /api/auth/register", () => {
  it("returns 400 when email is missing", async () => {
    const res = await request(buildAppWithAuth())
      .post("/api/auth/register")
      .send({ password: "password123" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("email and password are required");
  });

  it("returns 400 when password is missing", async () => {
    const res = await request(buildAppWithAuth())
      .post("/api/auth/register")
      .send({ email: "test@example.com" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("email and password are required");
  });

  it("returns 400 when password is too short", async () => {
    const res = await request(buildAppWithAuth())
      .post("/api/auth/register")
      .send({ email: "test@example.com", password: "12345" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Password must be at least 6 characters");
  });

  it("returns 201 with valid payload", async () => {
    const res = await request(buildAppWithAuth())
      .post("/api/auth/register")
      .send({ email: "newuser@example.com", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("email");
    expect(res.headers["set-cookie"]).toBeDefined();
    const cookies = Array.isArray(res.headers["set-cookie"])
      ? res.headers["set-cookie"].join(" ")
      : res.headers["set-cookie"] ?? "";
    expect(cookies).toContain("sb_access_token");
  });

  it("returns 201 with displayName and referralCode", async () => {
    const res = await request(buildAppWithAuth())
      .post("/api/auth/register")
      .send({
        email: "newuser@example.com",
        password: "password123",
        displayName: "Test User",
        referralCode: "REFCODE1",
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
  });
});

describe("Auth: POST /api/auth/login", () => {
  it("returns 400 when access_token is missing", async () => {
    const res = await request(buildAppWithAuth())
      .post("/api/auth/login")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("access_token is required");
  });

  it("returns 401 when access_token is invalid", async () => {
    const res = await request(buildAppWithAuth())
      .post("/api/auth/login")
      .send({ access_token: "not.a.valid.token" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid token");
  });

  it("returns 200 with user data and sets cookies on valid token", async () => {
    const res = await request(buildAppWithAuth())
      .post("/api/auth/login")
      .send({ access_token: "valid.mock.token" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("email");
    expect(res.headers["set-cookie"]).toBeDefined();
    const cookies = Array.isArray(res.headers["set-cookie"])
      ? res.headers["set-cookie"].join(" ")
      : res.headers["set-cookie"] ?? "";
    expect(cookies).toContain("sb_access_token");
  });

  it("also sets refresh cookie when refresh_token is provided", async () => {
    const res = await request(buildAppWithAuth())
      .post("/api/auth/login")
      .send({ access_token: "valid.mock.token", refresh_token: "refresh-token-123" });
    expect(res.status).toBe(200);
    const cookies = Array.isArray(res.headers["set-cookie"])
      ? res.headers["set-cookie"].join(" ")
      : res.headers["set-cookie"] ?? "";
    expect(cookies).toContain("sb_refresh_token");
  });
});

describe("Auth: POST /api/auth/logout", () => {
  it("returns 200 and clears cookies", async () => {
    const res = await request(buildAppWithAuth())
      .post("/api/auth/logout")
      .send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Logged out" });
    const cookies = Array.isArray(res.headers["set-cookie"])
      ? res.headers["set-cookie"].join(" ")
      : res.headers["set-cookie"] ?? "";
    expect(cookies).toContain("sb_access_token");
    expect(cookies).toContain("sb_refresh_token");
  });
});

describe("Auth: POST /api/auth/refresh", () => {
  it("returns 401 when no refresh token in cookies", async () => {
    const res = await request(buildAppWithAuth())
      .post("/api/auth/refresh")
      .send({});
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("No refresh token");
  });

  it("returns 200 when refresh token is valid and sets new access cookie", async () => {
    const app = buildAppWithAuth();
    const agent = request.agent(app);
    // First log in to get cookies
    await agent
      .post("/api/auth/login")
      .send({ access_token: "valid.mock.token", refresh_token: "refresh-token-123" });
    // Then refresh
    const res = await agent.post("/api/auth/refresh").send({});
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Token refreshed");
    const cookies = Array.isArray(res.headers["set-cookie"])
      ? res.headers["set-cookie"].join(" ")
      : res.headers["set-cookie"] ?? "";
    expect(cookies).toContain("sb_access_token");
  });
});

describe("Auth: GET /api/auth/referrals", () => {
  it("returns 200 with stats and referrals list when authenticated", async () => {
    const res = await request(buildAppWithAuth()).get("/api/auth/referrals");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("stats");
    expect(res.body).toHaveProperty("referrals");
    expect(res.body.stats).toHaveProperty("total");
    expect(res.body.stats).toHaveProperty("pending");
    expect(res.body.stats).toHaveProperty("verified");
    expect(res.body.stats).toHaveProperty("qualified");
    expect(res.body.stats).toHaveProperty("rewarded");
    expect(res.body.stats).toHaveProperty("rejected");
    expect(Array.isArray(res.body.referrals)).toBe(true);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await request(buildAppWithoutAuth()).get("/api/auth/referrals");
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });
});
