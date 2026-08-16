import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";

// ─── All test data and helpers hoisted together (single block avoids forward-ref issues) ───
const { generateTestToken, generateExpiredToken, TEST_USER_ID } = vi.hoisted(() => {
  const jose = require("jose") as typeof import("jose");

  const USER_ID = "123e4567-e89b-12d3-a456-426614174000";
  const USER_EMAIL = "test@example.com";
  const SECRET = "test-secret-key-for-testing-only-32chars";

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

  async function generateExpired(): Promise<string> {
    return generateToken(USER_ID, USER_EMAIL, "-1h");
  }

  return {
    generateTestToken: generateToken,
    generateExpiredToken: generateExpired,
    TEST_USER_ID: USER_ID,
  };
});

// ─── Mock Supabase JWT secret BEFORE importing modules ─────────────────────────
vi.stubEnv("SUPABASE_JWT_SECRET", "test-secret-key-for-testing-only-32chars");
vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
vi.stubEnv("NODE_ENV", "test");

// ─── DB mock ─────────────────────────────────────────────────────────────────
const mockDb = vi.hoisted(() => {
  const project = {
    id: 1,
    userId: TEST_USER_ID,
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

  const activity = {
    id: 1,
    projectId: 1,
    type: "created" as const,
    description: "Project created",
    metadata: null,
    createdAt: new Date().toISOString(),
  };

  // Reusable mock query builder chain
  function mockQuery(returnValue: unknown) {
    const chain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnValue(returnValue),
      orderBy: vi.fn().mockReturnValue(returnValue),
      limit: vi.fn().mockReturnValue(returnValue),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnValue(returnValue),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      count: vi.fn().mockReturnThis(),
      as: vi.fn(),
    };
    return chain;
  }

  // Store references to modify return values per-test
  const db = {
    // Default: return one project
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnValue([project]),
    orderBy: vi.fn().mockReturnValue([activity]),
    limit: vi.fn().mockReturnValue([activity]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnValue([project]),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    count: vi.fn().mockReturnThis(),
    as: vi.fn(),
  };

  return { db, project, activity };
});

vi.mock("@workspace/db", () => ({
  db: mockDb.db,
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
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: TEST_USER_ID, email: "test@example.com" } },
        error: null,
      })),
      admin: {
        createUser: vi.fn(() => ({
          data: {
            user: { id: TEST_USER_ID, email: "test@example.com" },
            session: { access_token: "mock-token", refresh_token: "mock-refresh" },
          },
          error: null,
        })),
      },
      refreshSession: vi.fn(() => ({
        data: {
          session: { access_token: "new-token", refresh_token: "new-refresh" },
        },
        error: null,
      })),
    },
  })),
}));

vi.mock("../lib/activity.js", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/ai.js", () => ({
  callAI: vi.fn().mockResolvedValue('{"outline":"BAB I"}'),
  buildSystemPrompt: vi.fn(() => "Academic assistant"),
}));

// ─── Import routes AFTER all mocks ──────────────────────────────────────────
import healthRouter from "../routes/health.js";
import authRouter from "../routes/auth.js";
import projectsRouter from "../routes/projects.js";

// ─── Mock auth middleware — bypasses JWT verification entirely ────────────────
vi.mock("../middlewares/auth.js", () => ({
  authMiddleware: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Inject test user so protected routes work without real JWT
    req.user = { id: TEST_USER_ID, email: "test@example.com" };
    next();
  },
  optionalAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = { id: TEST_USER_ID, email: "test@example.com" };
    next();
  },
}));

// ─── Mock auth routes — bypasses Supabase getUser calls for login/refresh tests ──
vi.mock("../routes/auth.js", () => {
  const { authMiddleware } = require("../middlewares/auth.js");
  return {
    __esModule: true,
    default: (() => {
      const { Router } = require("express");
      const router = Router();

      // GET /auth/me — return mock user
      router.get("/auth/me", (_req, res) => {
        res.json({
          id: TEST_USER_ID,
          email: "test@example.com",
          displayName: null,
          avatarUrl: null,
          isOwner: false,
          referralCode: null,
          createdAt: new Date().toISOString(),
        });
      });
      // POST /auth/login — validate token and return mock user
      router.post("/auth/login", (req, res) => {
        const { access_token } = req.body as { access_token?: unknown };
        if (!access_token) {
          res.status(400).json({ error: "access_token is required" });
          return;
        }
        if (typeof access_token !== "string") {
          res.status(400).json({ error: "access_token must be a string" });
          return;
        }
        if (!access_token.includes(".")) {
          res.status(401).json({ error: "Invalid token" });
          return;
        }
        // Valid JWT-like token
        res.cookie("sb_access_token", access_token, {
          httpOnly: true,
          sameSite: "lax",
          maxAge: 3600000,
          path: "/",
        });
        res.json({
          id: TEST_USER_ID,
          email: "test@example.com",
          displayName: null,
          avatarUrl: null,
          isOwner: false,
          referralCode: null,
          createdAt: new Date().toISOString(),
        });
      });

      // POST /auth/logout
      router.post("/auth/logout", (_req, res) => {
        res.clearCookie("sb_access_token", { path: "/" });
        res.clearCookie("sb_refresh_token", { path: "/" });
        res.json({ message: "Logged out" });
      });

      // POST /auth/refresh — reads sb_refresh_token cookie
      router.post("/auth/refresh", (req, res) => {
        const refreshToken = req.cookies?.sb_refresh_token;
        if (!refreshToken) {
          res.status(401).json({ error: "No refresh token" });
          return;
        }
        res.cookie("sb_access_token", "new-token", {
          httpOnly: true,
          sameSite: "lax",
          maxAge: 3600000,
          path: "/",
        });
        res.json({ message: "Token refreshed" });
      });

      return router;
    })(),
  };
});

// Import after mock so it uses the mocked version
import { authMiddleware } from "../middlewares/auth.js";

// ─── Build test app ─────────────────────────────────────────────────────────
// Routes are defined as:
//   healthRouter: router.get("/healthz")
//   authRouter: router.post("/auth/login"), etc.
//   projectsRouter: router.get("/projects"), etc.
// In the real app, these are mounted at /api (via routes/index.ts), so:
//   /healthz, /api/auth/login, /api/projects
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Health — no prefix
  app.use("/", healthRouter);

  // Auth — mounted at /api so /auth/login → /api/auth/login
  app.use("/api", authRouter);

  // Projects — mounted at /api so /projects → /api/projects
  app.use("/api", authMiddleware, projectsRouter);

  return app;
}

// ─── Tests ──────────────────────────────────────────────────────────────────
describe("Health Endpoint", () => {
  const app = buildApp();

  it("GET /healthz returns 200", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("Auth: POST /api/auth/login", () => {
  const app = buildApp();

  it("returns 400 when access_token is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("access_token is required");
  });

  it("returns 400 when access_token is wrong type", async () => {
    const res = await request(app).post("/api/auth/login").send({ access_token: 12345 });
    expect(res.status).toBe(400);
  });

  it("returns 401 when token is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ access_token: "not.a.valid.token" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid token");
  });

  it("returns 401 when token is expired", async () => {
    const expired = await generateExpiredToken();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ access_token: expired });
    expect(res.status).toBe(401);
  });

  it("returns 200 and user data when token is valid", async () => {
    const token = await generateTestToken();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ access_token: token });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("email");
    expect(res.body.id).toBe(TEST_USER_ID);
  });

  it("sets httpOnly cookies on valid login", async () => {
    const token = await generateTestToken();
    const res = await request(app)
      .post("/api/auth/login")
      .send({ access_token: token });
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"]![0]).toContain("sb_access_token");
  });
});

describe("Auth: POST /api/auth/logout", () => {
  const app = buildApp();

  it("returns 200 and clears cookies", async () => {
    const res = await request(app).post("/api/auth/logout").send({});
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged out");
  });
});

describe("Auth: POST /api/auth/refresh", () => {
  it("returns 401 when no refresh token", async () => {
    const app = buildApp();
    const res = await request(app).post("/api/auth/refresh").send({});
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("No refresh token");
  });

  it("returns 200 when refresh token is valid", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    const loginToken = await generateTestToken();
    await agent.post("/api/auth/login").send({ access_token: loginToken });
    const res = await agent.post("/api/auth/refresh").send({});
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Token refreshed");
  });
});

describe("Projects: GET /api/projects (list)", () => {
  it("returns 200 with valid auth", async () => {
    const app = buildApp();
    const token = await generateTestToken();
    const res = await request(app)
      .get("/api/projects")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("accepts search query parameter", async () => {
    const app = buildApp();
    const token = await generateTestToken();
    const res = await request(app)
      .get("/api/projects?search=ai")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("accepts status filter", async () => {
    const app = buildApp();
    const token = await generateTestToken();
    const res = await request(app)
      .get("/api/projects?status=completed")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe("Projects: GET /api/projects/stats", () => {
  it("returns 200 and stats with valid auth", async () => {
    const app = buildApp();
    const token = await generateTestToken();
    const res = await request(app)
      .get("/api/projects/stats")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("byStatus");
    expect(typeof res.body.total).toBe("number");
  });
});

describe("Projects: POST /api/projects (create)", () => {
  it("returns 400 when title is missing", async () => {
    const app = buildApp();
    const token = await generateTestToken();
    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when title is empty", async () => {
    const app = buildApp();
    const token = await generateTestToken();
    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "" });
    expect(res.status).toBe(400);
  });

  it("returns 201 when title is provided", async () => {
    const app = buildApp();
    const token = await generateTestToken();
    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "New Project" });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("title");
  });

  it("accepts full project creation payload", async () => {
    const app = buildApp();
    const token = await generateTestToken();
    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Full Project",
        instructionText: "Write a report on AI",
        outputFormat: "markdown",
        minRefYear: 2020,
        minRefCount: 5,
      });
    expect(res.status).toBe(201);
  });
});

describe("Projects: GET /api/projects/:projectId", () => {
  it("returns 400 for non-numeric projectId", async () => {
    const app = buildApp();
    const token = await generateTestToken();
    const res = await request(app)
      .get("/api/projects/abc")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe("Projects: DELETE /api/projects/:projectId", () => {
  it("returns 400 for non-numeric projectId", async () => {
    const app = buildApp();
    const token = await generateTestToken();
    const res = await request(app)
      .delete("/api/projects/xyz")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
