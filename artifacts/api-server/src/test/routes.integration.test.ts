import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";

// ─── Test fixtures (hoisted — must be self-contained, no module-scope refs to unsynced state) ─
const TABLE_NAME_KEY = Symbol.for("drizzle:tableName"); // accessible globally via Symbol.for()

const { DB_MOCK, resetState, USER_ID, USER_EMAIL } = vi.hoisted(() => {
  // Inline these so the factory has access (hoisted runs at module scope, before other consts)
  const USER_ID = "123e4567-e89b-12d3-a456-426614174000";
  const USER_EMAIL = "test@example.com";

  const mockProject = {
    id: 1, userId: USER_ID, title: "Test Project", status: "draft" as const,
    progress: 0, instructionText: "Write a report", subject: "Computer Science",
    taskType: "essay", citationFormat: "APA", outputFormat: "markdown",
    minRefYear: 2020, minRefCount: 3,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };

  const mockMessage = {
    id: 1, projectId: 1, role: "user" as const,
    content: "Hello AI", createdAt: new Date().toISOString(),
  };

  const mockReference = {
    id: 1, projectId: 1, title: "Test Reference", authors: "John Doe",
    year: 2023, journal: null, volume: null, issue: null, pages: null,
    doi: null, url: null, validationStatus: "unverified" as const,
    usedInChapters: null, createdAt: new Date().toISOString(),
  };

  const mockAttachment = {
    id: 1, projectId: 1, filename: "test.pdf", originalName: "test.pdf",
    mimeType: "application/pdf", sizeBytes: 12345,
    attachmentType: "instruction" as const, extractedText: null,
    createdAt: new Date().toISOString(),
  };

  const mockActivity = {
    id: 1, projectId: 1, type: "created" as const,
    description: "Project created", metadata: null,
    createdAt: new Date().toISOString(),
  };

  const mockJob = {
    id: 1, projectId: 1, jobType: "analyze" as const,
    status: "completed" as const, result: null, errorMessage: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };

  const mockDocVersion = {
    id: 1, projectId: 1, versionNumber: 1, content: "# Test Document",
    outline: "BAB I: Introduction", changeDescription: null,
    createdAt: new Date().toISOString(),
  };

  const mockMetadata = {
    id: 1, projectId: 1, detectedTitle: "Test",
    subject: "Computer Science", taskType: "essay", citationFormat: "APA",
    language: "English", outline: "BAB I: Introduction",
    contextSummary: "Test summary",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };

  const mockExport = {
    id: 1, projectId: 1, format: "markdown" as const,
    status: "completed" as const, filePath: "/tmp/test-exports/1.md",
    createdAt: new Date().toISOString(),
  };

  const mockAIUsage = {
    id: 1, userId: USER_ID, projectId: 1,
    model: "claude-sonnet-4", provider: "anthropic",
    inputTokens: 100, outputTokens: 200, estimatedCostUsd: 0.001,
    requestType: "chat" as const, metadata: null,
    createdAt: new Date().toISOString(),
  };

  // Shared mutable state — one closure, reset correctly between tests
  let _lastOp: "select" | "insert" | "update" = "select";
  let _insertTable = "";
  const _opStack: Array<"insert" | "update"> = [];
  let _data: unknown[] = [];

  // Reusable mock query builder
  // Use Object.create to make it inherit from Array so destructuring works:
  //   const [x] = await db.select()...  →  chain[0]
  // Add toJSON so res.json(chain) serializes correctly
   
  const chain = Object.create(Array.prototype, {
    select: { value: vi.fn().mockReturnThis() },
    from: {
      value: vi.fn().mockImplementation(function (this: typeof chain) {
        _data = [];
        return this;
      }),
    },
    where: {
      value: vi.fn().mockImplementation(function (this: typeof chain, cond: Record<string, unknown>) {
        // Only reset to select when starting a new select chain (not update/insert)
        if (_opStack.length === 0 && _lastOp !== "update") _lastOp = "select";
        _data = [];
        try {
          // Drizzle condition objects store table metadata in the _ field as a symbol-keyed property
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const internal = (cond as any)._;
          const tableName = internal?.table?.name ?? internal?._?.table?.name ?? "";
          if (tableName === "projects") _data = [mockProject];
          else if (tableName === "messages") _data = [mockMessage];
          else if (tableName === "references") _data = [mockReference];
          else if (tableName === "attachments") _data = [mockAttachment];
          else if (tableName === "activities") _data = [mockActivity];
          else if (tableName === "jobs") _data = [mockJob];
          else if (tableName === "document_versions") _data = [mockDocVersion];
          else if (tableName === "project_metadata") _data = [mockMetadata];
          else if (tableName === "exports") _data = [mockExport];
          else if (tableName === "ai_usage_log") _data = [mockAIUsage];
          else if (tableName === "referrals") _data = [];
          else if (tableName === "referral_events") _data = [];
          else _data = [mockProject];
        } catch { _data = [mockProject]; }
        return this;
      }),
    },
    orderBy: { value: vi.fn().mockReturnThis() },
    limit: { value: vi.fn().mockReturnThis() },
    offset: { value: vi.fn().mockReturnThis() },
    insert: {
      value: vi.fn().mockImplementation(function (this: typeof chain, table: unknown) {
        _lastOp = "insert";
        // Drizzle table objects store the table name via Symbol.for("drizzle:tableName")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t = table as any;
        _insertTable =
          t[Symbol.for("drizzle:tableName")] as string ??
          t[Symbol.for("drizzle:Table")]?.config?.name as string ??
          t._?.table?.name as string ??
          t?.name as string ??
          "";
        _opStack.push("insert");
        return this;
      }),
    },
    values: { value: vi.fn().mockReturnThis() },
    returning: {
      value: vi.fn().mockImplementation(function () {
        if (_lastOp === "insert" && _opStack.length > 0) {
          _opStack.pop(); // only pop if we pushed (insert matched this return)
          if (_insertTable === "messages") {
            return [{ id: 2, projectId: 1, role: "assistant" as const, content: "Mock AI response", createdAt: new Date().toISOString() }];
          }
          if (_insertTable === "references") {
            return [{ id: 2, projectId: 1, title: "New Reference", authors: "Test Author",
              year: 2023, journal: null, volume: null, issue: null, pages: null,
              doi: null, url: null, validationStatus: "unverified" as const, usedInChapters: null,
              createdAt: new Date().toISOString() }];
          }
          if (_insertTable === "exports") {
            return [{ id: 2, projectId: 1, format: "markdown" as const, status: "completed" as const,
              filePath: "/api/exports/download/export-1-v1-123.docx",
              createdAt: new Date().toISOString() }];
          }
          if (_insertTable === "document_versions") {
            return [{ id: 2, projectId: 1, versionNumber: 2, content: "# Test\n\nContent",
              outline: "BAB I", changeDescription: null,
              createdAt: new Date().toISOString() }];
          }
          if (_insertTable === "activities") {
            return [{ id: 2, projectId: 1, type: "created" as const,
              description: "Activity created", metadata: null,
              createdAt: new Date().toISOString() }];
          }
          // Default for insert: job data (for analyze endpoint)
          return [{ id: 2, projectId: 1, jobType: "analyze", status: "pending",
            result: null, errorMessage: null,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
        }
        // update flow OR stale insert on stack (don't consume stack for update)
        if (_lastOp === "update") {
          return [{ ...mockProject, title: "Updated Title" }];
        }
        return [mockJob];
      }),
    },
    set: { value: vi.fn().mockReturnThis() },
    update: {
      value: vi.fn().mockImplementation(function (this: typeof chain) {
        _lastOp = "update";
        return this;
      }),
    },
    delete: { value: vi.fn().mockReturnThis() },
    innerJoin: { value: vi.fn().mockReturnThis() },
    count: { value: vi.fn().mockReturnValue({ count: 1 }) },
    as: { value: vi.fn() },
    onConflictDoUpdate: { value: vi.fn().mockReturnThis() },
    toJSON: { value: () => _data },
  });
  // Populate array indices so destructuring works: const [x] = chain
  Object.defineProperty(chain, "length", { get: () => _data.length });
   
  for (let i = 0; i < 100; i++) Object.defineProperty(chain, i, { get: () => _data[i] });

  const resetState = () => {
    _lastOp = "select";
    _insertTable = "";
    _opStack.length = 0;
    _data = [];
  };

  return { DB_MOCK: chain, resetState, USER_ID, USER_EMAIL };
});

beforeEach(() => {
  resetState();
});

vi.mock("@workspace/db", () => ({
  db: DB_MOCK,
  usersTable: { [Symbol.for("drizzle:tableName")]: "users" },
  referralsTable: { [Symbol.for("drizzle:tableName")]: "referrals" },
  referralEventsTable: { [Symbol.for("drizzle:tableName")]: "referral_events" },
  projectsTable: { [Symbol.for("drizzle:tableName")]: "projects" },
  jobsTable: { [Symbol.for("drizzle:tableName")]: "jobs" },
  activitiesTable: { [Symbol.for("drizzle:tableName")]: "activities" },
  projectMetadataTable: { [Symbol.for("drizzle:tableName")]: "project_metadata" },
  messagesTable: { [Symbol.for("drizzle:tableName")]: "messages" },
  documentVersionsTable: { [Symbol.for("drizzle:tableName")]: "document_versions" },
  attachmentsTable: { [Symbol.for("drizzle:tableName")]: "attachments" },
  referencesTable: { [Symbol.for("drizzle:tableName")]: "references" },
  exportsTable: { [Symbol.for("drizzle:tableName")]: "exports" },
  aiUsageLogTable: { [Symbol.for("drizzle:tableName")]: "ai_usage_log" },
}));

vi.mock("../lib/activity.ts", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/ai.ts", () => ({
  callAI: vi.fn().mockResolvedValue({
    content: JSON.stringify({ outline: "BAB I: Introduction\nBAB II: Literature Review\nBAB III: Methodology" }),
    usage: { inputTokens: 200, outputTokens: 150, estimatedCostUsd: 0.0001 },
  }),
  buildSystemPrompt: vi.fn(() => "Academic assistant prompt"),
}));

vi.mock("../lib/ownership.ts", () => ({
  requireProjectOwnership: vi.fn().mockResolvedValue(true),
}));

vi.mock("fs/promises", () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(""),
    unlink: vi.fn().mockResolvedValue(undefined),
  },
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(""),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
  },
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: USER_ID, email: USER_EMAIL } },
        error: null,
      })),
    },
  })),
}));

// ─── Import routes ─────────────────────────────────────────────────────────────
import projectsRouter from "../routes/projects.js";
import messagesRouter from "../routes/messages.js";
import documentsRouter from "../routes/documents.js";
import referencesRouter from "../routes/references.js";
import attachmentsRouter from "../routes/attachments.js";
import activitiesRouter from "../routes/activities.js";
import jobsRouter from "../routes/jobs.js";
import metadataRouter from "../routes/metadata.js";
import exportsRouter from "../routes/exports.js";
import aiUsageRouter from "../routes/ai-usage.js";
import webhooksRouter from "../routes/webhooks.js";

// ─── Test app factory ──────────────────────────────────────────────────────────
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const injectUser = (req: Request, _res: Response, next: () => void) => {
    req.user = { id: USER_ID, email: USER_EMAIL };
    next();
  };

  app.use("/api", injectUser, projectsRouter);
  app.use("/api", injectUser, messagesRouter);
  app.use("/api", injectUser, documentsRouter);
  app.use("/api", injectUser, referencesRouter);
  app.use("/api", injectUser, attachmentsRouter);
  app.use("/api", injectUser, activitiesRouter);
  app.use("/api", injectUser, jobsRouter);
  app.use("/api", injectUser, metadataRouter);
  app.use("/api", injectUser, exportsRouter);
  app.use("/api", injectUser, aiUsageRouter);
  app.use("/api", webhooksRouter);

  return app;
}

// ─── Tests: Messages ────────────────────────────────────────────────────────────
describe("Messages: GET /api/projects/:projectId/messages", () => {
  it("returns 200 with valid auth and projectId", async () => {
    const res = await request(buildApp()).get("/api/projects/1/messages");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 400 for non-numeric projectId", async () => {
    const res = await request(buildApp()).get("/api/projects/abc/messages");
    expect(res.status).toBe(400);
  });
});

describe("Messages: POST /api/projects/:projectId/messages", () => {
  it("returns 201 with valid message body", async () => {
    const res = await request(buildApp())
      .post("/api/projects/1/messages")
      .send({ content: "Hello AI" });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("content");
  });

  it("returns 400 when content is missing", async () => {
    const res = await request(buildApp())
      .post("/api/projects/1/messages")
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-numeric projectId", async () => {
    const res = await request(buildApp())
      .post("/api/projects/abc/messages")
      .send({ content: "test" });
    expect(res.status).toBe(400);
  });
});

// ─── Tests: Documents ──────────────────────────────────────────────────────────
describe("Documents: GET /api/projects/:projectId/documents", () => {
  it("returns 200 with valid auth", async () => {
    const res = await request(buildApp()).get("/api/projects/1/documents");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 400 for non-numeric projectId", async () => {
    const res = await request(buildApp()).get("/api/projects/xyz/documents");
    expect(res.status).toBe(400);
  });
});

describe("Documents: GET /api/projects/:projectId/documents/latest", () => {
  it("returns 200 when latest doc exists", async () => {
    const res = await request(buildApp()).get("/api/projects/1/documents/latest");
    expect(res.status).toBe(200);
  });

  it("returns 400 for non-numeric projectId", async () => {
    const res = await request(buildApp()).get("/api/projects/abc/documents/latest");
    expect(res.status).toBe(400);
  });
});

// ─── Tests: References ─────────────────────────────────────────────────────────
describe("References: GET /api/projects/:projectId/references", () => {
  it("returns 200 with valid auth", async () => {
    const res = await request(buildApp()).get("/api/projects/1/references");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 400 for non-numeric projectId", async () => {
    const res = await request(buildApp()).get("/api/projects/abc/references");
    expect(res.status).toBe(400);
  });
});

describe("References: POST /api/projects/:projectId/references", () => {
  it("returns 201 with valid reference", async () => {
    const res = await request(buildApp())
      .post("/api/projects/1/references")
      .send({ title: "New Reference" });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("title");
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(buildApp())
      .post("/api/projects/1/references")
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("References: POST /api/projects/:projectId/references/regenerate", () => {
  it("returns 200 after regenerating bibliography", async () => {
    const res = await request(buildApp())
      .post("/api/projects/1/references/regenerate");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("bibliography");
  });
});

// ─── Tests: Attachments ────────────────────────────────────────────────────────
describe("Attachments: GET /api/projects/:projectId/attachments", () => {
  it("returns 200 with valid auth", async () => {
    const res = await request(buildApp()).get("/api/projects/1/attachments");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 400 for non-numeric projectId", async () => {
    const res = await request(buildApp()).get("/api/projects/abc/attachments");
    expect(res.status).toBe(400);
  });
});

// ─── Tests: Activities ────────────────────────────────────────────────────────
describe("Activities: GET /api/projects/:projectId/activities", () => {
  it("returns 200 with valid auth", async () => {
    const res = await request(buildApp()).get("/api/projects/1/activities");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 400 for non-numeric projectId", async () => {
    const res = await request(buildApp()).get("/api/projects/abc/activities");
    expect(res.status).toBe(400);
  });
});

// ─── Tests: Jobs ───────────────────────────────────────────────────────────────
describe("Jobs: GET /api/projects/:projectId/jobs", () => {
  it("returns 200 with valid auth", async () => {
    const res = await request(buildApp()).get("/api/projects/1/jobs");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 400 for non-numeric projectId", async () => {
    const res = await request(buildApp()).get("/api/projects/abc/jobs");
    expect(res.status).toBe(400);
  });
});

// ─── Tests: Metadata ───────────────────────────────────────────────────────────
describe("Metadata: GET /api/projects/:projectId/metadata", () => {
  it("returns 200 when metadata exists", async () => {
    const res = await request(buildApp()).get("/api/projects/1/metadata");
    expect(res.status).toBe(200);
  });

  it("returns 400 for non-numeric projectId", async () => {
    const res = await request(buildApp()).get("/api/projects/abc/metadata");
    expect(res.status).toBe(400);
  });
});

// ─── Tests: Exports ────────────────────────────────────────────────────────────
describe("Exports: GET /api/projects/:projectId/exports", () => {
  it("returns 200 with valid auth", async () => {
    const res = await request(buildApp()).get("/api/projects/1/exports");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 400 for non-numeric projectId", async () => {
    const res = await request(buildApp()).get("/api/projects/abc/exports");
    expect(res.status).toBe(400);
  });
});

describe("Exports: POST /api/projects/:projectId/exports", () => {
  it("returns 201 with valid format", async () => {
    const res = await request(buildApp())
      .post("/api/projects/1/exports")
      .send({ format: "markdown" });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("format");
  });

  it("returns 400 when format is missing", async () => {
    const res = await request(buildApp())
      .post("/api/projects/1/exports")
      .send({});
    expect(res.status).toBe(400);
  });
});

// ─── Tests: AI Usage ──────────────────────────────────────────────────────────
describe("AI Usage: GET /api/ai-usage", () => {
  it("returns 200 with valid auth", async () => {
    const res = await request(buildApp()).get("/api/ai-usage");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("total");
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("accepts pagination params", async () => {
    const res = await request(buildApp()).get("/api/ai-usage?limit=10&offset=5");
    expect(res.status).toBe(200);
  });

  it("accepts projectId filter", async () => {
    const res = await request(buildApp()).get("/api/ai-usage?projectId=1");
    expect(res.status).toBe(200);
  });
});

describe("AI Usage: GET /api/ai-usage/stats", () => {
  it("returns 200 with valid auth", async () => {
    const res = await request(buildApp()).get("/api/ai-usage/stats");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalRequests");
    expect(res.body).toHaveProperty("totalInputTokens");
    expect(res.body).toHaveProperty("totalOutputTokens");
    expect(res.body).toHaveProperty("totalCostUsd");
    expect(res.body).toHaveProperty("byRequestType");
  });
});

// ─── Tests: Webhooks ───────────────────────────────────────────────────────────
describe("Webhooks: POST /api/webhooks/email-verified", () => {
  const validPayload = {
    type: "INSERT",
    table: "auth.users",
    record: { id: "123", email: "test@example.com", email_confirmed_at: new Date().toISOString() },
    old_record: null,
  };

  it("returns 401 when X-Webhook-Secret is missing", async () => {
    const res = await request(buildApp())
      .post("/api/webhooks/email-verified")
      .send(validPayload);
    expect(res.status).toBe(401);
  });

  it("returns 401 when X-Webhook-Secret is wrong", async () => {
    const res = await request(buildApp())
      .post("/api/webhooks/email-verified")
      .set("x-webhook-secret", "wrong-secret")
      .send(validPayload);
    expect(res.status).toBe(401);
  });

  it("returns 400 when record has no id", async () => {
    const res = await request(buildApp())
      .post("/api/webhooks/email-verified")
      .set("x-webhook-secret", "test-webhook-secret")
      .send({ type: "INSERT", table: "auth.users", record: { email: "test@example.com" }, old_record: null });
    expect(res.status).toBe(400);
  });
});

// ─── Tests: Projects (extended) ───────────────────────────────────────────────
describe("Projects: POST /api/projects/:projectId/analyze", () => {
  it("returns 202 when analysis starts", async () => {
    const res = await request(buildApp()).post("/api/projects/1/analyze");
    expect(res.status).toBe(202);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("jobType", "analyze");
  });

  it("returns 400 for non-numeric projectId", async () => {
    const res = await request(buildApp()).post("/api/projects/abc/analyze");
    expect(res.status).toBe(400);
  });
});

describe("Projects: PATCH /api/projects/:projectId", () => {
  it("returns 200 when updating title", async () => {
    const res = await request(buildApp())
      .patch("/api/projects/1")
      .send({ title: "Updated Title" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("title", "Updated Title");
  });

  it("returns 400 for non-numeric projectId", async () => {
    const res = await request(buildApp())
      .patch("/api/projects/abc")
      .send({ title: "Test" });
    expect(res.status).toBe(400);
  });
});
