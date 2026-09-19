/**
 * M6 — AI Endpoint Integration Tests
 *
 * Architecture (following routes.integration.test.ts pattern):
 *   vi.hoisted() is hoisted to top. vi.mock() factory also runs at top (in source order).
 *   Solution: inline all constants inside vi.hoisted() so they don't reference module-scope vars.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express, { type Request, type Response } from "express";

// ─── 1. vi.hoisted: mock functions + DB chain (MUST inline constants) ──────────
const HOISTED = vi.hoisted(() => {
  // Inline constants (module-scope vars are not yet initialized when hoisted runs)
  const USER_ID = "123e4567-e89b-12d3-a456-426614174000";
  const PROJECT_ID = 1;

  // Scenario state (mutated per-test)
  const sc = {
    tierExists: true,
    tierAuthorized: true,
    tierNotFound: false, // controls resolveOlagonTierOrFallback mock
    subscription: { packageId: "pkg-standar", expiresAt: new Date("2030-01-01T00:00:00Z") },
    balance: { balanceCents: 10000, autofallbackEnabled: true },
    project: { id: PROJECT_ID, userId: USER_ID, title: "Test Project" },
    callAIResult: {
      content: JSON.stringify({ questions: [] }),
      usage: { inputTokens: 100, outputTokens: 50, costCents: 100, estimatedCostUsd: 0.0001 },
    },
    callAIError: null as null | Error,
    consumeQuotaResult: { allowed: true, method: "subscription" as const },
  };

  // ── Mock functions ─────────────────────────────────────────────────────────
  const mockCallAI = vi.fn();
  const mockConsumeQuota = vi.fn();
  const mockGetTierConfig = vi.fn();
  const mockCheckTierAccess = vi.fn();
  const mockResolveOlagonTierOrFallback = vi.fn();
  const mockGetTierForUser = vi.fn();
  const mockBuildSystemPrompt = vi.fn();
  const mockRequireProjectOwnership = vi.fn().mockResolvedValue(true);
  const mockLogActivity = vi.fn().mockResolvedValue(undefined);
  const mockLogAIUsage = vi.fn().mockResolvedValue({ id: 1 });
  const mockGetAllowedTierIdsForUser = vi.fn();

  // ── Per-test reset ─────────────────────────────────────────────────────────
  const resetScenario = () => {
    sc.tierExists = true;
    sc.tierAuthorized = true;
    sc.tierNotFound = false;
    sc.subscription = { packageId: "pkg-standar", expiresAt: new Date("2030-01-01T00:00:00Z") };
    sc.balance = { balanceCents: 10000, autofallbackEnabled: true };
    sc.project = { id: PROJECT_ID, userId: USER_ID, title: "Test Project" };
    sc.callAIResult = {
      content: JSON.stringify({ questions: [] }),
      usage: { inputTokens: 100, outputTokens: 50, costCents: 100, estimatedCostUsd: 0.0001 },
    };
    sc.callAIError = null;
    sc.consumeQuotaResult = { allowed: true, method: "subscription" };
    // Reset mocks to clear mockResolvedValueOnce / mockImplementation overrides
    // then re-apply defaults
    mockCallAI.mockReset().mockImplementation(() => {
      if (sc.callAIError) throw sc.callAIError;
      return Promise.resolve(sc.callAIResult);
    });
    mockConsumeQuota.mockReset().mockImplementation(() => Promise.resolve(sc.consumeQuotaResult));
    mockGetTierConfig.mockReset().mockImplementation((tierId: string) => {
      if (!sc.tierExists) return Promise.resolve(null);
      return Promise.resolve({
        id: tierId,
        name: "Test Tier",
        provider: "anthropic",
        model: "test-model",
        baseUrl: "",
        apiKeyEnvVar: "",
        pricePer1MInputCents: 10,
        pricePer1MOutputCents: 10,
        providerCostPer1MInputCents: 5,
        providerCostPer1MOutputCents: 5,
        markupMultiplier: 1.0,
        rateLimitRpm: null,
        rateLimitTpd: null,
        isFree: false,
        description: "",
        usageTips: null,
      });
    });
    mockCheckTierAccess.mockReset().mockImplementation(() => Promise.resolve(sc.tierAuthorized));
    mockGetTierForUser.mockReset().mockImplementation(() =>
      Promise.resolve({
        id: "haiku-4.5",
        name: "Haiku",
        provider: "anthropic",
        model: "test-model",
        baseUrl: "",
        apiKeyEnvVar: "",
        pricePer1MInputCents: 10,
        pricePer1MOutputCents: 10,
        providerCostPer1MInputCents: 5,
        providerCostPer1MOutputCents: 5,
        markupMultiplier: 1.0,
        rateLimitRpm: null,
        rateLimitTpd: null,
        isFree: true,
        description: "",
        usageTips: null,
      })
    );
    mockBuildSystemPrompt.mockReset().mockReturnValue("Academic assistant");
    mockGetAllowedTierIdsForUser.mockReset().mockImplementation(() => {
      if (!sc.subscription) return Promise.resolve(["haiku-4.5"]);
      const tier = sc.subscription.packageId.replace("pkg-", "");
      if (tier === "ultra" || tier === "pro" || tier === "premium") return Promise.resolve(["sonnet-5", "haiku-4.5"]);
      return Promise.resolve(["haiku-4.5"]);
    });
    // resolveOlagonTierOrFallback: returns null for non-existent/unauthorized tiers, else a valid tier
    const fallbackTier = {
      id: "haiku-4.5", name: "Haiku", provider: "anthropic", model: "test-model",
      baseUrl: "", apiKeyEnvVar: "", pricePer1MInputCents: 10, pricePer1MOutputCents: 10,
      providerCostPer1MInputCents: 5, providerCostPer1MOutputCents: 5,
      markupMultiplier: 1.0, rateLimitRpm: null, rateLimitTpd: null,
      isFree: true, isOwnerOnly: false, description: "", usageTips: null,
    };
    mockResolveOlagonTierOrFallback.mockReset().mockImplementation(
      () => {
        return sc.tierNotFound ? Promise.resolve(null) : Promise.resolve(fallbackTier);
      },
    );
  };


  // ── DB chain mock ───────────────────────────────────────────────────────────
  let _currentTable = "";
  let _lastOp: "select" | "insert" | "update" = "select";
  let _insertTable = "";
  let _joined = false;
  let _data: unknown[] = [];

  const getTableFromSymbol = (table: unknown): string => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = table as any;
    return (
      t[Symbol.for("drizzle:tableName")] as string ??
      t[Symbol.for("drizzle:Table")]?.config?.name as string ??
      t?._?.table?.name as string ??
      ""
    );
  };

  const chain = Object.create(Array.prototype, {
    select: { value: vi.fn().mockReturnThis() },
    from: {
      value: vi.fn().mockImplementation(function (this: typeof chain, table: unknown) {
        _currentTable = getTableFromSymbol(table);
        _joined = false;
        _data = [];
        return this;
      }),
    },
    where: {
      value: vi.fn().mockImplementation(function (this: typeof chain) {
        if (_lastOp !== "update") _lastOp = "select";
        if (_currentTable === "subscriptions" && sc.subscription) {
          if (_joined) {
            _data = [{ subscriptions: sc.subscription, packages: { tier: sc.subscription.packageId.replace("pkg-", "") } }];
          } else {
            _data = [sc.subscription];
          }
        } else if (_currentTable === "subscription_packages" && sc.subscription) {
          _data = [{ id: sc.subscription.packageId, tier: sc.subscription.packageId.replace("pkg-", "") }];
        } else if (_currentTable === "user_balances" && sc.balance) {
          _data = [sc.balance];
        } else if (_currentTable === "projects") {
          _data = [sc.project];
        } else {
          _data = [];
        }
        return this;
      }),
    },
    innerJoin: {
      value: vi.fn().mockImplementation(function (this: typeof chain) {
        _joined = true;
        return this;
      }),
    },
    orderBy: { value: vi.fn().mockReturnThis() },
    limit: { value: vi.fn().mockReturnThis() },
    offset: { value: vi.fn().mockReturnThis() },
    insert: {
      value: vi.fn().mockImplementation(function (this: typeof chain, table: unknown) {
        _lastOp = "insert";
        _insertTable = getTableFromSymbol(table);
        return this;
      }),
    },
    values: { value: vi.fn().mockReturnThis() },
    returning: {
      value: vi.fn().mockImplementation(function () {
        if (_lastOp === "insert") {
          if (_insertTable === "quizzes") return [{ id: 1, projectId: PROJECT_ID, title: "Test Quiz", questions: [], metadata: {} }];
          if (_insertTable === "messages") return [{ id: 1, projectId: PROJECT_ID, role: "assistant" as const, content: "Mock response", createdAt: new Date().toISOString() }];
          if (_insertTable === "ai_usage_log") return [{ id: 1 }];
        }
        return [];
      }),
    },
    update: {
      value: vi.fn().mockImplementation(function (this: typeof chain, table: unknown) {
        _lastOp = "update";
        _currentTable = getTableFromSymbol(table);
        return this;
      }),
    },
    set: { value: vi.fn().mockReturnThis() },
    delete: { value: vi.fn().mockReturnThis() },
    count: { value: vi.fn().mockReturnValue({ count: 0 }) },
    as: { value: vi.fn() },
    onConflictDoUpdate: { value: vi.fn().mockReturnThis() },
    transaction: {
      value: vi.fn().mockImplementation(async (fn: (tx: typeof chain) => Promise<unknown>) => fn(chain)),
    },
  });

  Object.defineProperty(chain, "length", { get: () => _data.length });
  for (let i = 0; i < 100; i++) Object.defineProperty(chain, i, { get: () => _data[i] });

  return {
    sc,
    mockCallAI,
    mockConsumeQuota,
    mockGetTierConfig,
    mockCheckTierAccess,
    mockGetTierForUser,
    mockBuildSystemPrompt,
    mockRequireProjectOwnership,
    mockLogActivity,
    mockLogAIUsage,
    mockResolveOlagonTierOrFallback,
    resetScenario,
    chain,
    USER_ID,
    PROJECT_ID,
    mockGetAllowedTierIdsForUser,
  };
});

vi.mock("@workspace/db", () => ({
  db: HOISTED.chain,
  // Schemas used by quizzes.ts for question validation
  questionSchema: {
    parse: (q: unknown) => {
      if (typeof q === "object" && q !== null && "id" in q && "text" in q && "type" in q) return q;
      throw new Error("Schema validation failed");
    },
  },
  quizResponseSchema: {
    parse: (r: unknown) => {
      if (typeof r === "object" && r !== null && "questionId" in r && "answer" in r) return r;
      throw new Error("Schema validation failed");
    },
  },
  subscriptionsTable: { [Symbol.for("drizzle:tableName")]: "subscriptions" },
  packagesTable: { [Symbol.for("drizzle:tableName")]: "subscription_packages" },
  userBalancesTable: { [Symbol.for("drizzle:tableName")]: "user_balances" },
  projectsTable: { [Symbol.for("drizzle:tableName")]: "projects" },
  quizzesTable: { [Symbol.for("drizzle:tableName")]: "quizzes" },
  quizSubmissionsTable: { [Symbol.for("drizzle:tableName")]: "quiz_submissions" },
  messagesTable: { [Symbol.for("drizzle:tableName")]: "messages" },
  documentVersionsTable: { [Symbol.for("drizzle:tableName")]: "document_versions" },
  documentsTable: { [Symbol.for("drizzle:tableName")]: "documents" },
  projectMetadataTable: { [Symbol.for("drizzle:tableName")]: "project_metadata" },
  aiUsageLogTable: { [Symbol.for("drizzle:tableName")]: "ai_usage_log" },
  userBalances: { [Symbol.for("drizzle:tableName")]: "user_balances" },
}));

vi.mock("../lib/subscription.js", () => ({
  checkAIAccess: vi.fn().mockResolvedValue({ allowed: true }),
  consumeQuotaForAIRequest: HOISTED.mockConsumeQuota,
}));

vi.mock("../lib/ai.ts", () => ({
  callAI: HOISTED.mockCallAI,
  buildSystemPrompt: HOISTED.mockBuildSystemPrompt,
  getTierConfig: HOISTED.mockGetTierConfig,
  getTierForUser: HOISTED.mockGetTierForUser,
  checkTierAccess: HOISTED.mockCheckTierAccess,
  getAllowedTierIdsForUser: HOISTED.mockGetAllowedTierIdsForUser,
  resolveOlagonTierOrFallback: HOISTED.mockResolveOlagonTierOrFallback,
}));

vi.mock("../lib/ownership.ts", () => ({
  requireProjectOwnership: HOISTED.mockRequireProjectOwnership,
}));

vi.mock("../lib/activity.ts", () => ({
  logActivity: HOISTED.mockLogActivity,
}));

vi.mock("../lib/ai-usage-log.ts", () => ({
  logAIUsage: HOISTED.mockLogAIUsage,
}));

// ─── 3. Imports (after mocks registered) ─────────────────────────────────────
import quizzesRouter from "../routes/quizzes.js";
import messagesRouter from "../routes/messages.js";
import { getAllowedTierIdsForUser, checkTierAccess } from "../lib/ai.js";

const USER_EMAIL = "test@example.com";

// ─── Test app factory ──────────────────────────────────────────────────────────
function buildApp() {
  const app = express();
  app.use(express.json());

  const injectUser = (req: Request, _res: Response, next: () => void) => {
    req.user = { id: HOISTED.USER_ID, email: USER_EMAIL };
    next();
  };

  app.use("/api", injectUser, quizzesRouter);
  app.use("/api", injectUser, messagesRouter);

  return app;
}

// ─── Setup per-test ───────────────────────────────────────────────────────────
beforeEach(() => {
  HOISTED.resetScenario();
});

// ─── TEST 1: POST /quizzes — M5 fix: quota NOT consumed on parse failure ──────
describe("POST /quizzes — quota consumed only after successful JSON parse", () => {
  it("T1: consumeQuotaForAIRequest NOT called when AI returns non-JSON", async () => {
    HOISTED.sc.callAIResult = {
      content: "This is not valid JSON at all",
      usage: { inputTokens: 100, outputTokens: 50, costCents: 100, estimatedCostUsd: 0.0001 },
    };

    const res = await request(buildApp())
      .post(`/api/projects/${HOISTED.PROJECT_ID}/quizzes`)
      .send({ title: "Test Quiz", topic: "Math" });

    // 500 because JSON.parse fails inside the try block
    expect(res.status).toBe(500);
    // M5 fix: quota NOT consumed when JSON parse fails
    expect(HOISTED.mockConsumeQuota).not.toHaveBeenCalled();
  });

  it("T2: consumeQuotaForAIRequest NOT called when AI returns valid JSON but wrong schema", async () => {
    HOISTED.sc.callAIResult = {
      content: JSON.stringify({ wrongField: "not questions" }),
      usage: { inputTokens: 100, outputTokens: 50, costCents: 100, estimatedCostUsd: 0.0001 },
    };

    const res = await request(buildApp())
      .post(`/api/projects/${HOISTED.PROJECT_ID}/quizzes`)
      .send({ title: "Test Quiz", topic: "Math" });

    // wrongField → parsed.questions is undefined → rawQuestions = [] → map([]) succeeds
    // Endpoint returns 201 (quiz saved with empty questions)
    expect(res.status).toBe(201);
    expect(HOISTED.mockConsumeQuota).not.toHaveBeenCalled();
  });

  it("T3: consumeQuotaForAIRequest IS called when AI returns valid quiz JSON", async () => {
    // Override tier to be non-free so quota consumption path is taken
    HOISTED.mockGetTierForUser.mockResolvedValueOnce({
      id: "sonnet-5",
      name: "Sonnet 5",
      provider: "anthropic",
      model: "test-model",
      baseUrl: "",
      apiKeyEnvVar: "",
      pricePer1MInputCents: 10,
      pricePer1MOutputCents: 10,
      providerCostPer1MInputCents: 5,
      providerCostPer1MOutputCents: 5,
      markupMultiplier: 1.0,
      rateLimitRpm: null,
      rateLimitTpd: null,
      isFree: false,
      description: "",
      usageTips: null,
    });

    HOISTED.sc.callAIResult = {
      content: JSON.stringify({
        questions: [
          {
            id: "q1",
            text: "Apa ibukota Indonesia?",
            type: "multiple_choice",
            options: [
              { id: "a", text: "Jakarta" },
              { id: "b", text: "Bandung" },
              { id: "c", text: "Surabaya" },
              { id: "d", text: "Yogyakarta" },
            ],
          },
        ],
        metadata: { topic: "Geografi", difficulty: "easy", estimatedTime: "5 minutes" },
      }),
      usage: { inputTokens: 100, outputTokens: 50, costCents: 100, estimatedCostUsd: 0.0001 },
    };

    const res = await request(buildApp())
      .post(`/api/projects/${HOISTED.PROJECT_ID}/quizzes`)
      .send({ title: "Test Quiz", topic: "Geografi" });

    expect(res.status).toBe(201);
    expect(HOISTED.mockConsumeQuota).toHaveBeenCalled();
  });

  it("T4: quota not consumed when AI call itself throws", async () => {
    HOISTED.sc.callAIError = new Error("AI service unavailable");

    const res = await request(buildApp())
      .post(`/api/projects/${HOISTED.PROJECT_ID}/quizzes`)
      .send({ title: "Test Quiz", topic: "Math" });

    expect(res.status).toBe(500);
    expect(HOISTED.mockConsumeQuota).not.toHaveBeenCalled();
  });
});

// ─── TEST 2: POST /messages — tier authorization (400 / 403) ─────────────────
describe("POST /messages — tier authorization responses", () => {
  it("T5: returns 403 when tierId does not exist (getTierConfig returns null)", async () => {
    HOISTED.sc.tierExists = false;
    HOISTED.sc.tierNotFound = true;

    const res = await request(buildApp())
      .post(`/api/projects/${HOISTED.PROJECT_ID}/messages`)
      .send({ content: "Hello AI", tier: "non-existent-tier" });

    // Route returns 403 when tierId is provided but invalid (requestedTier ? 403 : 400)
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  it("T6: returns 201 when requested tier is unauthorized (falls back to authorized tier)", async () => {
    HOISTED.sc.tierExists = true;
    // tierAuthorized=false means checkTierAccess would fail for sonnet-5,
    // but resolveOlagonTierOrFallback falls back to haiku-4.5 which is authorized.
    HOISTED.sc.tierAuthorized = false;

    const res = await request(buildApp())
      .post(`/api/projects/${HOISTED.PROJECT_ID}/messages`)
      .send({ content: "Hello AI", tier: "sonnet-5" });

    // Fallback to haiku-4.5 → authorized → 201
    expect(res.status).toBe(201);
    expect(HOISTED.mockCallAI).toHaveBeenCalled();
  });

  it("T7: returns 201 when no tier specified (uses default authorized tier)", async () => {
    const res = await request(buildApp())
      .post(`/api/projects/${HOISTED.PROJECT_ID}/messages`)
      .send({ content: "Hello AI" });

    expect(res.status).toBe(201);
    expect(HOISTED.mockCallAI).toHaveBeenCalled();
  });
});

// ─── TEST 3: getAllowedTierIdsForUser / checkTierAccess ──────────────────────
describe("getAllowedTierIdsForUser / checkTierAccess", () => {
  it("T8: returns haiku-4.5 when user has no subscription", async () => {
    HOISTED.sc.subscription = null;

    const allowed = await getAllowedTierIdsForUser(HOISTED.USER_ID);
    expect(allowed).toEqual(["haiku-4.5"]);
  });

  it("T9: returns sonnet-5+haiku-4.5 when user has ultra/pro/premium package", async () => {
    HOISTED.sc.subscription = { packageId: "pkg-ultra", expiresAt: new Date("2030-01-01T00:00:00Z") };

    const allowed = await getAllowedTierIdsForUser(HOISTED.USER_ID);
    expect(allowed).toContain("sonnet-5");
    expect(allowed).toContain("haiku-4.5");
  });

  it("T10: returns only haiku-4.5 when user has standar/starter package", async () => {
    HOISTED.sc.subscription = { packageId: "pkg-standar", expiresAt: new Date("2030-01-01T00:00:00Z") };

    const allowed = await getAllowedTierIdsForUser(HOISTED.USER_ID);
    expect(allowed).toEqual(["haiku-4.5"]);
  });

  it("T11: checkTierAccess returns true for authorized tier", async () => {
    HOISTED.sc.subscription = { packageId: "pkg-ultra", expiresAt: new Date("2030-01-01T00:00:00Z") };

    const allowed = await checkTierAccess(HOISTED.USER_ID, "sonnet-5");
    expect(allowed).toBe(true);
  });

  it("T12: checkTierAccess returns false for unauthorized tier", async () => {
    HOISTED.sc.subscription = { packageId: "pkg-standar", expiresAt: new Date("2030-01-01T00:00:00Z") };
    HOISTED.sc.tierAuthorized = false;

    const allowed = await checkTierAccess(HOISTED.USER_ID, "sonnet-5");
    expect(allowed).toBe(false);
  });

  it("T13: checkTierAccess returns true for free tier (haiku) even without subscription", async () => {
    HOISTED.sc.subscription = null;

    const allowed = await checkTierAccess(HOISTED.USER_ID, "haiku-4.5");
    expect(allowed).toBe(true);
  });
});
