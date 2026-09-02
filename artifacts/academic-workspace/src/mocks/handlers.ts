import { http, HttpResponse, delay } from "msw";
import {
  mockProjects,
  mockMessages,
  mockDocuments,
  mockReferences,
  mockAttachments,
  mockActivities,
  mockJobs,
  mockMetadata,
} from "./data";

let messageIdCounter = 100;
let refIdCounter = 100;
let attachIdCounter = 100;

const now = () => new Date().toISOString();

export const handlers = [
  // Auth mock
  http.get("/api/auth/me", async () => {
    await delay(100);
    return HttpResponse.json({
      id: "mock-user-001",
      email: "demo@teora.app",
      displayName: "Demo User",
      avatarUrl: null,
      isOwner: true,
      referralCode: "DEMO1234",
    });
  }),

  http.post("/api/auth/login", async () => {
    await delay(300);
    return HttpResponse.json({
      id: "mock-user-001",
      email: "demo@teora.app",
      displayName: "Demo User",
      avatarUrl: null,
      isOwner: true,
      referralCode: "DEMO1234",
    });
  }),

  http.post("/api/auth/register", async ({ request }) => {
    await delay(300);
    const body = await request.json() as { email?: string; referralCode?: string };
    return HttpResponse.json({
      id: "mock-user-002",
      email: body.email ?? "new@teora.app",
      displayName: null,
      avatarUrl: null,
      isOwner: false,
      referralCode: "NEWU5678",
    }, { status: 201 });
  }),

  http.post("/api/auth/logout", async () => {
    await delay(100);
    return HttpResponse.json({ message: "Logged out" });
  }),

  http.post("/api/auth/refresh", async () => {
    await delay(100);
    return HttpResponse.json({ message: "Token refreshed" });
  }),

  http.get("/api/auth/referrals", async () => {
    await delay(200);
    return HttpResponse.json({
      stats: { total: 2, pending: 1, verified: 1, qualified: 0, rewarded: 0, rejected: 0 },
      referrals: [
        { id: 1, referrerId: "mock-user-001", referredId: "ref-user-001", referredEmail: "alice@example.com", referralCode: "DEMO1234", status: "pending", createdAt: now(), updatedAt: now() },
        { id: 2, referrerId: "mock-user-001", referredId: "ref-user-002", referredEmail: "bob@example.com", referralCode: "DEMO1234", status: "verified", createdAt: now(), updatedAt: now() },
      ],
    });
  }),

  // Health
  http.get("/api/healthz", async () => {
    await delay(100);
    return HttpResponse.json({ status: "ok" });
  }),

  // List projects
  http.get("/api/projects", async ({ request }) => {
    await delay(200);
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.toLowerCase();
    const status = url.searchParams.get("status");

    let projects = [...mockProjects];
    if (search) {
      projects = projects.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          p.subject?.toLowerCase().includes(search)
      );
    }
    if (status) {
      projects = projects.filter((p) => p.status === status);
    }
    return HttpResponse.json(projects);
  }),

  // Project stats
  http.get("/api/projects/stats", async () => {
    await delay(200);
    const byStatus: Record<string, number> = {};
    for (const p of mockProjects) {
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    }
    return HttpResponse.json({
      total: mockProjects.length,
      byStatus,
      recentActivity: mockActivities.slice(0, 5),
    });
  }),

  // Get single project
  http.get("/api/projects/:projectId", async ({ params }) => {
    await delay(150);
    const id = Number(params.projectId);
    const project = mockProjects.find((p) => p.id === id);
    if (!project) {
      return HttpResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return HttpResponse.json(project);
  }),

  // Create project
  http.post("/api/projects", async ({ request }) => {
    await delay(300);
    const body = await request.json() as { title: string; instructionText?: string };
    const newProject = {
      id: mockProjects.length + 1,
      title: body.title,
      status: "draft" as const,
      progress: 0,
      instructionText: body.instructionText ?? null,
      subject: null,
      taskType: null,
      citationFormat: null,
      outputFormat: null,
      minRefYear: null,
      minRefCount: null,
      createdAt: now(),
      updatedAt: now(),
    };
    mockProjects.push(newProject);
    return HttpResponse.json(newProject, { status: 201 });
  }),

  // Update project
  http.patch("/api/projects/:projectId", async ({ params, request }) => {
    await delay(200);
    const id = Number(params.projectId);
    const body = await request.json() as Record<string, unknown>;
    const project = mockProjects.find((p) => p.id === id);
    if (!project) {
      return HttpResponse.json({ error: "Project not found" }, { status: 404 });
    }
    Object.assign(project, body, { updatedAt: now() });
    return HttpResponse.json(project);
  }),

  // Delete project
  http.delete("/api/projects/:projectId", async ({ params }) => {
    await delay(200);
    const id = Number(params.projectId);
    const index = mockProjects.findIndex((p) => p.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: "Project not found" }, { status: 404 });
    }
    mockProjects.splice(index, 1);
    return HttpResponse.json(null, { status: 204 });
  }),

  // Analyze project
  http.post("/api/projects/:projectId/analyze", async ({ params }) => {
    await delay(100);
    const id = Number(params.projectId);
    const project = mockProjects.find((p) => p.id === id);
    if (!project) {
      return HttpResponse.json({ error: "Project not found" }, { status: 404 });
    }
    project.status = "analyzing";
    project.updatedAt = now();
    const job = {
      id: 999,
      projectId: id,
      jobType: "analyze" as const,
      status: "pending" as const,
      result: null,
      errorMessage: null,
      createdAt: now(),
      updatedAt: now(),
    };
    return HttpResponse.json(job, { status: 202 });
  }),

  // Messages
  http.get("/api/projects/:projectId/messages", async ({ params }) => {
    await delay(200);
    const id = Number(params.projectId);
    return HttpResponse.json(mockMessages[id] ?? []);
  }),

  http.post("/api/projects/:projectId/messages", async ({ params, request }) => {
    await delay(800);
    const id = Number(params.projectId);
    const body = await request.json() as { content: string };

    const userMsg = {
      id: messageIdCounter++,
      projectId: id,
      role: "user" as const,
      content: body.content,
      createdAt: now(),
    };
    if (!mockMessages[id]) mockMessages[id] = [];
    mockMessages[id].push(userMsg);

    const aiResponses = [
      "Baik, saya pahami. Saya akan membantu menyelesaikan bagian ini dengan mempertimbangkan konteks proyek Anda. Apakah ada bagian tertentu yang ingin difokuskan lebih dulu?",
      "Terima kasih atas masukannya. Berdasarkan instruksi awal, saya akan menyesuaikan penulisan agar lebih sesuai dengan format yang diminta. Mohon tunggu sebentar.",
      "Saya telah memahami permintaan Anda. Berikut beberapa opsi yang bisa saya tawarkan untuk melanjutkan penulisan. Silakan pilih yang paling sesuai dengan kebutuhan Anda.",
      "Revisi sedang diproses. Saya akan memperbarui bagian terkait dengan mempertimbangkan semua feedback yang diberikan. Hasilnya akan segera tersedia.",
    ];
    const aiMsg = {
      id: messageIdCounter++,
      projectId: id,
      role: "assistant" as const,
      content: aiResponses[Math.floor(Math.random() * aiResponses.length)],
      createdAt: now(),
    };
    mockMessages[id].push(aiMsg);

    return HttpResponse.json(aiMsg, { status: 201 });
  }),

  // Documents
  http.get("/api/projects/:projectId/documents", async ({ params }) => {
    await delay(200);
    const id = Number(params.projectId);
    return HttpResponse.json(mockDocuments[id] ?? []);
  }),

  http.get("/api/projects/:projectId/documents/latest", async ({ params }) => {
    await delay(150);
    const id = Number(params.projectId);
    const docs = mockDocuments[id];
    if (!docs || docs.length === 0) {
      return HttpResponse.json({ error: "No document yet" }, { status: 404 });
    }
    return HttpResponse.json(docs[docs.length - 1]);
  }),

  // References
  http.get("/api/projects/:projectId/references", async ({ params }) => {
    await delay(200);
    const id = Number(params.projectId);
    return HttpResponse.json(mockReferences[id] ?? []);
  }),

  http.post("/api/projects/:projectId/references", async ({ params, request }) => {
    await delay(300);
    const id = Number(params.projectId);
    const body = await request.json() as {
      title: string; authors?: string; year?: number;
      journal?: string; doi?: string;
    };
    const newRef = {
      id: refIdCounter++,
      projectId: id,
      title: body.title,
      authors: body.authors ?? null,
      year: body.year ?? null,
      journal: body.journal ?? null,
      volume: null,
      issue: null,
      doi: body.doi ?? null,
      url: null,
      validationStatus: "unverified" as const,
      usedInChapters: null,
      createdAt: now(),
    };
    if (!mockReferences[id]) mockReferences[id] = [];
    mockReferences[id].push(newRef);
    return HttpResponse.json(newRef, { status: 201 });
  }),

  http.delete("/api/projects/:projectId/references/:referenceId", async ({ params }) => {
    await delay(200);
    const id = Number(params.projectId);
    const refId = Number(params.referenceId);
    const refs = mockReferences[id] ?? [];
    const idx = refs.findIndex((r) => r.id === refId);
    if (idx !== -1) refs.splice(idx, 1);
    return HttpResponse.json(null, { status: 204 });
  }),

  http.post("/api/projects/:projectId/references/regenerate", async () => {
    await delay(500);
    return HttpResponse.json({
      bibliography: "Keles, B., McCrae, N., & Gruber, A. (2020). Social Media Use and Mental Health...\n(Regenerated bibliography)",
    });
  }),

  // Attachments
  http.get("/api/projects/:projectId/attachments", async ({ params }) => {
    await delay(200);
    const id = Number(params.projectId);
    return HttpResponse.json(mockAttachments[id] ?? []);
  }),

  http.post("/api/projects/:projectId/attachments", async ({ params }) => {
    await delay(400);
    const id = Number(params.projectId);
    const newAttach = {
      id: attachIdCounter++,
      projectId: id,
      filename: `upload_${attachIdCounter}.pdf`,
      originalName: "uploaded_file.pdf",
      mimeType: "application/pdf",
      sizeBytes: 512000,
      attachmentType: "supplement" as const,
      extractedText: null,
      createdAt: now(),
    };
    if (!mockAttachments[id]) mockAttachments[id] = [];
    mockAttachments[id].push(newAttach);
    return HttpResponse.json(newAttach, { status: 201 });
  }),

  http.delete("/api/projects/:projectId/attachments/:attachmentId", async ({ params }) => {
    await delay(200);
    const id = Number(params.projectId);
    const attachId = Number(params.attachmentId);
    const attaches = mockAttachments[id] ?? [];
    const idx = attaches.findIndex((a) => a.id === attachId);
    if (idx !== -1) attaches.splice(idx, 1);
    return HttpResponse.json(null, { status: 204 });
  }),

  // Activities
  http.get("/api/projects/:projectId/activities", async ({ params }) => {
    await delay(200);
    const id = Number(params.projectId);
    return HttpResponse.json(
      mockActivities.filter((a) => a.projectId === id)
    );
  }),

  // Jobs
  http.get("/api/projects/:projectId/jobs", async ({ params }) => {
    await delay(200);
    const id = Number(params.projectId);
    return HttpResponse.json(mockJobs[id] ?? []);
  }),

  // Metadata
  http.get("/api/projects/:projectId/metadata", async ({ params }) => {
    await delay(200);
    const id = Number(params.projectId);
    const meta = mockMetadata[id];
    if (!meta) {
      return HttpResponse.json({ error: "No metadata yet" }, { status: 404 });
    }
    return HttpResponse.json(meta);
  }),

  // AI Usage - Stats
  http.get("/api/ai-usage/stats", async () => {
    await delay(200);
    return HttpResponse.json({
      totalRequests: 42,
      totalInputTokens: 125000,
      totalOutputTokens: 87500,
      totalCostUsd: 0.1842,
      byRequestType: {
        chat: { requests: 20, inputTokens: 50000, outputTokens: 30000, costUsd: 0.082 },
        analyze: { requests: 15, inputTokens: 40000, outputTokens: 25000, costUsd: 0.056 },
        write: { requests: 7, inputTokens: 35000, outputTokens: 32500, costUsd: 0.0462 },
      },
    });
  }),

  // AI Usage - List
  http.get("/api/ai-usage", async () => {
    await delay(200);
    return HttpResponse.json({
      data: [
        {
          id: 1,
          userId: "mock-user-001",
          projectId: 1,
          model: "claude-3-5-sonnet-20241022",
          provider: "anthropic",
          inputTokens: 2500,
          outputTokens: 1500,
          estimatedCostUsd: 0.0041,
          requestType: "chat",
          createdAt: now(),
        },
        {
          id: 2,
          userId: "mock-user-001",
          projectId: 1,
          model: "claude-3-5-sonnet-20241022",
          provider: "anthropic",
          inputTokens: 4200,
          outputTokens: 2100,
          estimatedCostUsd: 0.0063,
          requestType: "analyze",
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 3,
          userId: "mock-user-001",
          projectId: null,
          model: "claude-3-5-sonnet-20241022",
          provider: "anthropic",
          inputTokens: 800,
          outputTokens: 320,
          estimatedCostUsd: 0.00112,
          requestType: "write",
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ],
      total: 3,
    });
  }),

  // Exports
  http.get("/api/projects/:projectId/exports", async () => {
    await delay(200);
    return HttpResponse.json([]);
  }),

  http.post("/api/projects/:projectId/exports", async ({ params }) => {
    await delay(500);
    const id = Number(params.projectId);
    return HttpResponse.json({
      id: 1,
      projectId: id,
      format: "pdf",
      status: "completed",
      filePath: null,
      createdAt: now(),
    }, { status: 201 });
  }),
];
