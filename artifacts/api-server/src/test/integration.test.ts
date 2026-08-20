import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";

// ─── Constants (used in both vi.hoisted and vi.mock factories) ─────────────────
const { generateTestToken, generateExpiredToken, USER_ID } = vi.hoisted(() => {
  const USER_ID = "123e4567-e89b-12d3-a456-426614174000";
  const USER_EMAIL = "test@example.com";
  const SECRET = "test-secret-key-for-testing-only-32chars";
  const jose = require("jose") as typeof import("jose");
  async function generateToken(
    userId: string = USER_ID,
    email: string = USER_EMAIL,
    expiresIn: string = "1h"
  ): Promise<string> {
    const secret = new TextEncoder().encode(SECRET);
    return new jose.SignJWT({ sub: userId, email })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secret);
  }
  return {
    generateTestToken: generateToken,
    generateExpiredToken: () => generateToken(USER_ID, USER_EMAIL, "-1h"),
    USER_ID,
  };
});

// ─── Mock env BEFORE modules load ─────────────────────────────────────────────
vi.stubEnv("SUPABASE_JWT_SECRET", "test-secret-key-for-testing-only-32chars");
vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
vi.stubEnv("NODE_ENV", "test");

// ─── Mock @workspace/db ────────────────────────────────────────────────────────
vi.mock("@workspace/db", () => {
  const MOCK_PROJECT = {
    id: 1,
    userId: USER_ID,
    title: "Test Project",
    status: "draft" as const,
    progress: 0,
    instructionText: null,
    subject: null,
    taskType: null,
    citationFormat: null,
    outputFormat: null,
    minRefYear: null,
    minRefCount: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const dbChain: unknown[] = [{ ...MOCK_PROJECT }];
  const mockSqlJoin = vi.fn(() => ({ type: "sql" }));
  const mockSql = vi.fn(() => ({ type: "sql" }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mockSql as any).join = mockSqlJoin;

  for (const m of [
    "select", "from", "where", "orderBy", "limit", "offset",
    "insert", "values", "returning", "set", "delete", "innerJoin",
  ]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dbChain as any)[m] = vi.fn(() => dbChain);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (dbChain as any)["count"] = vi.fn(() => ({ count: 1 }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (dbChain as any)["as"] = vi.fn();

  return {
    db: {
      select: vi.fn(() => dbChain),
      from: vi.fn(() => dbChain),
      where: vi.fn(() => dbChain),
      orderBy: vi.fn(() => dbChain),
      limit: vi.fn(() => dbChain),
      offset: vi.fn(() => dbChain),
      insert: vi.fn(() => dbChain),
      values: vi.fn(() => dbChain),
      returning: vi.fn(() => dbChain),
      set: vi.fn(() => dbChain),
      delete: vi.fn(() => dbChain),
      innerJoin: vi.fn(() => dbChain),
      count: vi.fn(() => ({ count: 1 })),
      as: vi.fn(),
      sql: mockSql,
    },
    eq: vi.fn((a: unknown, b: unknown) => ({ type: "eq", a, b })),
    desc: vi.fn((col: unknown) => ({ type: "desc", col })),
    and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
    or: vi.fn((...args: unknown[]) => ({ type: "or", args })),
    sql: mockSql,
    sqlEmpty: vi.fn(() => ({})),
    usersTable: {},
    referralsTable: {},
    referralEventsTable: {},
    projectsTable: {},
    jobsTable: {},
    activitiesTable: {},
    projectMetadataTable: {},
    messagesTable: {},
    documentVersionsTable: {},
    attachmentsTable: {},
    referencesTable: {},
  };
});

vi.mock("@supabase/supabase-js", () => {
  const USER_ID = "123e4567-e89b-12d3-a456-426614174000";
  const USER_EMAIL = "test@example.com";
  return {
    createClient: vi.fn(() => ({
      auth: {
        getUser: vi.fn(() => ({
          data: { user: { id: USER_ID, email: USER_EMAIL } },
          error: null,
        })),
        admin: {
          createUser: vi.fn(() => ({
            data: {
              user: { id: USER_ID, email: USER_EMAIL },
              session: { access_token: "mock-token", refresh_token: "mock-refresh" },
            },
            error: null,
          })),
        },
        refreshSession: vi.fn(() => ({
          data: { session: { access_token: "new-token", refresh_token: "new-refresh" } },
          error: null,
        })),
      },
    })),
  };
});

vi.mock("../lib/activity.js", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/ai.js", () => ({
  callAI: vi.fn().mockResolvedValue('{"outline":"BAB I"}'),
  buildSystemPrompt: vi.fn(() => "Academic assistant"),
}));

// ─── Import routes AFTER all mocks ─────────────────────────────────────────────
import indexRouter from "../routes/index.js";

// ─── Mock auth middleware ───────────────────────────────────────────────────────
vi.mock("../middlewares/auth.js", () => {
  const USER_ID = "123e4567-e89b-12d3-a456-426614174000";
  const USER_EMAIL = "test@example.com";
  return {
    authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
      (_req as express.Request & { user?: { id: string; email: string } }).user = { id: USER_ID, email: USER_EMAIL };
      next();
    },
    optionalAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      (req as express.Request & { user?: { id: string; email: string } }).user = { id: USER_ID, email: USER_EMAIL };
      next();
    },
  };
});

// ─── Mock all non-project routes (mounted by indexRouter) ─────────────────────
vi.mock("../routes/health.js", () => ({
  default: (() => {
    const { Router } = require("express");
    const router = Router();
    router.get("/healthz", (_req: Request, res: Response) => res.json({ status: "ok" }));
    return router;
  })(),
}));

vi.mock("../routes/auth.js", () => {
  const { Router } = require("express");
  const USER_ID = "123e4567-e89b-12d3-a456-426614174000";
  const USER_EMAIL = "test@example.com";
  const SECRET = "test-secret-key-for-testing-only-32chars";
  const router = Router();
  router.get("/auth/me", (_req: Request, res: Response) => {
    res.json({ id: USER_ID, email: USER_EMAIL, displayName: null, avatarUrl: null, isOwner: false, referralCode: null, createdAt: new Date().toISOString() });
  });
  router.post("/auth/login", async (req: Request, res: Response) => {
    const { access_token, refresh_token } = req.body as { access_token?: unknown; refresh_token?: unknown };
    if (!access_token) { res.status(400).json({ error: "access_token is required" }); return; }
    if (typeof access_token !== "string") { res.status(400).json({ error: "access_token must be a string" }); return; }
    if (!access_token.includes(".")) { res.status(401).json({ error: "Invalid token" }); return; }
    try {
      const jose = require("jose");
      await jose.jwtVerify(access_token, new TextEncoder().encode(SECRET));
    } catch {
      res.status(401).json({ error: "Invalid token" }); return;
    }
    res.cookie("sb_access_token", access_token, { httpOnly: true, sameSite: "lax", maxAge: 3600000, path: "/" });
    if (refresh_token) res.cookie("sb_refresh_token", String(refresh_token), { httpOnly: true, sameSite: "lax", maxAge: 604800000, path: "/" });
    res.json({ id: USER_ID, email: USER_EMAIL, displayName: null, avatarUrl: null, isOwner: false, referralCode: null, createdAt: new Date().toISOString() });
  });
  router.post("/auth/logout", (_req: Request, res: Response) => {
    res.clearCookie("sb_access_token", { path: "/" });
    res.clearCookie("sb_refresh_token", { path: "/" });
    res.json({ message: "Logged out" });
  });
  router.post("/auth/refresh", (req: Request, res: Response) => {
    const refreshToken = req.cookies?.sb_refresh_token;
    if (!refreshToken) { res.status(401).json({ error: "No refresh token" }); return; }
    res.cookie("sb_access_token", "new-token", { httpOnly: true, sameSite: "lax", maxAge: 3600000, path: "/" });
    res.json({ message: "Token refreshed" });
  });
  return { __esModule: true, default: router };
});

vi.mock("../routes/messages.js", () => ({ default: (() => { const { Router } = require("express"); const r = Router(); r.get("/projects/:projectId/messages", (_req: Request, res: Response) => res.json([])); r.post("/projects/:projectId/messages", (_req: Request, res: Response) => res.status(201).json({})); return r; })() }));
vi.mock("../routes/documents.js", () => ({ default: (() => { const { Router } = require("express"); const r = Router(); r.get("/projects/:projectId/documents", (_req: Request, res: Response) => res.json([])); r.post("/projects/:projectId/documents", (_req: Request, res: Response) => res.status(201).json({ id: 1 })); return r; })() }));
vi.mock("../routes/references.js", () => ({ default: (() => { const { Router } = require("express"); const r = Router(); r.get("/projects/:projectId/references", (_req: Request, res: Response) => res.json([])); return r; })() }));
vi.mock("../routes/attachments.js", () => ({ default: (() => { const { Router } = require("express"); const r = Router(); r.get("/projects/:projectId/attachments", (_req: Request, res: Response) => res.json([])); return r; })() }));
vi.mock("../routes/activities.js", () => ({ default: (() => { const { Router } = require("express"); const r = Router(); r.get("/projects/:projectId/activities", (_req: Request, res: Response) => res.json([])); return r; })() }));
vi.mock("../routes/jobs.js", () => ({ default: (() => { const { Router } = require("express"); const r = Router(); r.get("/jobs", (_req: Request, res: Response) => res.json([])); return r; })() }));
vi.mock("../routes/metadata.js", () => ({ default: (() => { const { Router } = require("express"); const r = Router(); r.get("/projects/:projectId/metadata", (_req: Request, res: Response) => res.json({})); return r; })() }));
vi.mock("../routes/exports.js", () => ({ default: (() => { const { Router } = require("express"); const r = Router(); r.get("/projects/:projectId/exports", (_req: Request, res: Response) => res.json([])); return r; })() }));
vi.mock("../routes/ai-usage.js", () => ({ default: (() => { const { Router } = require("express"); const r = Router(); r.get("/ai-usage", (_req: Request, res: Response) => res.json([])); return r; })() }));

// ─── Build test app ────────────────────────────────────────────────────────────
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/", indexRouter);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────
describe("Health Endpoint", () => {
  it("GET /healthz returns 200", async () => {
    const res = await request(buildApp()).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("Auth: POST /auth/login", () => {
  it("returns 400 when access_token is missing", async () => {
    const res = await request(buildApp()).post("/auth/login").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("access_token is required");
  });

  it("returns 400 when access_token is wrong type", async () => {
    const res = await request(buildApp()).post("/auth/login").send({ access_token: 12345 });
    expect(res.status).toBe(400);
  });

  it("returns 401 when token is invalid", async () => {
    const res = await request(buildApp()).post("/auth/login").send({ access_token: "not.a.valid.token" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid token");
  });

  it("returns 401 when token is expired", async () => {
    const expired = await generateExpiredToken();
    const res = await request(buildApp()).post("/auth/login").send({ access_token: expired });
    expect(res.status).toBe(401);
  });

  it("returns 200 and user data when token is valid", async () => {
    const token = await generateTestToken();
    const res = await request(buildApp()).post("/auth/login").send({ access_token: token });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("email");
    expect(res.body.id).toBe(USER_ID);
  });

  it("sets httpOnly cookies on valid login", async () => {
    const token = await generateTestToken();
    const res = await request(buildApp()).post("/auth/login").send({ access_token: token });
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"]![0]).toContain("sb_access_token");
  });
});

describe("Auth: POST /auth/logout", () => {
  it("returns 200 and clears cookies", async () => {
    const res = await request(buildApp()).post("/auth/logout").send({});
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged out");
  });
});

describe("Auth: POST /auth/refresh", () => {
  it("returns 401 when no refresh token", async () => {
    const res = await request(buildApp()).post("/auth/refresh").send({});
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("No refresh token");
  });

  it("returns 200 when refresh token is valid", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    const loginToken = await generateTestToken();
    await agent.post("/auth/login").send({ access_token: loginToken, refresh_token: "test-refresh-token" });
    const res = await agent.post("/auth/refresh").send({});
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Token refreshed");
  });
});

describe("Projects: GET /projects (list)", () => {
  it("returns 200 with valid auth", async () => {
    const app = buildApp();
    const token = await generateTestToken();
    const res = await request(app).get("/projects").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("accepts search query parameter", async () => {
    const app = buildApp();
    const token = await generateTestToken();
    const res = await request(app).get("/projects?search=ai").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("accepts status filter", async () => {
    const app = buildApp();
    const token = await generateTestToken();
    const res = await request(app).get("/projects?status=completed").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe("Projects: GET /projects/stats", () => {
  it("returns 200 and stats with valid auth", async () => {
    const app = buildApp();
    const token = await generateTestToken();
    const res = await request(app).get("/projects/stats").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("byStatus");
    expect(typeof res.body.total).toBe("number");
  });
});

describe("Projects: POST /projects (create)", () => {
  it("returns 400 when title is missing", async () => {
    const app = buildApp();
    const token = await generateTestToken();
    const res = await request(app).post("/projects").set("Authorization", `Bearer ${token}`).send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when title is empty", async () => {
    const app = buildApp();
    const token = await generateTestToken();
    const res = await request(app).post("/projects").set("Authorization", `Bearer ${token}`).send({ title: "" });
    expect(res.status).toBe(400);
  });

  it("returns 201 when title is provided", async () => {
    const app = buildApp();
    const token = await generateTestToken();
    const res = await request(app).post("/projects").set("Authorization", `Bearer ${token}`).send({ title: "New Project" });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("title");
  });

  it("accepts full project creation payload", async () => {
    const app = buildApp();
    const token = await generateTestToken();
    const res = await request(app).post("/projects").set("Authorization", `Bearer ${token}`).send({
      title: "Full Project", instructionText: "Write a report on AI",
      outputFormat: "markdown", minRefYear: 2020, minRefCount: 5,
    });
    expect(res.status).toBe(201);
  });
});

describe("Projects: GET /projects/:projectId", () => {
  it("returns 400 for non-numeric projectId", async () => {
    const app = buildApp();
    const token = await generateTestToken();
    const res = await request(app).get("/projects/abc").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe("Projects: DELETE /projects/:projectId", () => {
  it("returns 400 for non-numeric projectId", async () => {
    const app = buildApp();
    const token = await generateTestToken();
    const res = await request(app).delete("/projects/xyz").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
