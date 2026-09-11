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

  // Learning Activities
  http.get("/api/learning-activities", async () => {
    await delay(200);
    return HttpResponse.json([
      {
        id: 1,
        userId: "mock-user-001",
        sourceProjectId: 1,
        topics: ["Statistika Inferensial", "Hipotesis", "Uji-t"],
        subject: "Statistika",
        extractedFrom: "chat",
        createdAt: now(),
        updatedAt: now(),
      },
      {
        id: 2,
        userId: "mock-user-001",
        sourceProjectId: 2,
        topics: ["Metode Penelitian", "Kualitatif", "Wawancara"],
        subject: "Metode Penelitian",
        extractedFrom: "chat",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 3,
        userId: "mock-user-001",
        sourceProjectId: 1,
        topics: ["Analisis Regresi", "Korelasi", "SPSS"],
        subject: "Statistika",
        extractedFrom: "document",
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 172800000).toISOString(),
      },
    ]);
  }),

  // Practice Recommendations
  http.get("/api/learning-activities/recommendations", async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    return HttpResponse.json([
      {
        type: "recent_task",
        reason: "Berdasarkan proyek yang sedang Anda kerjakan.",
        learningActivity: {
          id: 1,
          userId: "mock-user-001",
          sourceProjectId: 1,
          topics: ["Statistika Inferensial", "Hipotesis", "Uji-t"],
          subject: "Statistika",
          extractedFrom: "chat",
          sourceProjectTitle: projectId === "1" ? "Skripsi Informatika" : "Proyek Penelitian",
          createdAt: now(),
          updatedAt: now(),
        },
      },
      {
        type: "frequent_topic",
        reason: "Topik ini sering muncul dalam aktivitas belajar Anda.",
        learningActivity: {
          id: 4,
          userId: "mock-user-001",
          sourceProjectId: 1,
          topics: ["Statistika Inferensial", "Hipotesis", "Uji-t", "ANOVA", "Regresi"],
          subject: "Statistika",
          extractedFrom: "chat",
          sourceProjectTitle: "Skripsi Informatika",
          createdAt: now(),
          updatedAt: now(),
        },
      },
      {
        type: "weak_topic",
        reason: "Area ini perlu diperkuat untuk hasil yang lebih baik.",
        learningActivity: {
          id: 5,
          userId: "mock-user-001",
          sourceProjectId: 2,
          topics: ["Metode Penelitian", "Kualitatif", "Observasi"],
          subject: "Metode Penelitian",
          extractedFrom: "document",
          sourceProjectTitle: "Proyek Penelitian",
          createdAt: now(),
          updatedAt: now(),
        },
      },
    ]);
  }),

  // Quizzes - list
  http.get("/api/projects/:projectId/quizzes", async ({ params }) => {
    await delay(200);
    const id = Number(params.projectId);
    return HttpResponse.json([
      {
        id: 1,
        projectId: id,
        title: "Kuis Statistika Inferensial",
        topic: "Statistika Inferensial",
        metadata: { difficulty: "medium", questionTypes: ["multiple_choice", "short_answer"] },
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            text: "Apa hipotesis nol (H0) dalam uji-t?",
            points: 10,
            options: [
              { id: "a", text: "Tidak ada perbedaan antar kelompok" },
              { id: "b", text: "Ada perbedaan antar kelompok" },
              { id: "c", text: "Semua mean sama" },
              { id: "d", text: "Varians homogen" },
            ],
          },
          {
            id: "q2",
            type: "short_answer",
            text: "Jelaskan perbedaan antara uji-t satu sampel dan uji-t dua sampel.",
            points: 20,
          },
          {
            id: "q3",
            type: "multiple_choice",
            text: "Apa yang dimaksud dengan p-value?",
            points: 10,
            options: [
              { id: "a", text: "Probabilitas menolak H0 padahal H0 benar" },
              { id: "b", text: "Probabilitas menerima H1 padahal H1 benar" },
              { id: "c", text: "Tingkat signifikansi" },
              { id: "d", text: "Ukuran efek" },
            ],
          },
          {
            id: "q4",
            type: "essay",
            text: "Buatlah hipotesis nol dan hipotesis alternatif untuk penelitian tentang pengaruh metode belajar terhadap nilai ujian.",
            points: 30,
          },
          {
            id: "q5",
            type: "multiple_choice",
            text: "Kapan sebaiknya menggunakan uji Mann-Whitney?",
            points: 10,
            options: [
              { id: "a", text: "Data berdistribusi normal" },
              { id: "b", text: "Data tidak berdistribusi normal" },
              { id: "c", text: "Varians homogen" },
              { id: "d", text: "Sampel besar" },
            ],
          },
        ],
        createdAt: now(),
        updatedAt: now(),
      },
      {
        id: 2,
        projectId: id,
        title: "Kuis Metode Penelitian",
        topic: "Metode Penelitian",
        metadata: { difficulty: "easy", questionTypes: ["multiple_choice"] },
        questions: [
          {
            id: "q6",
            type: "multiple_choice",
            text: "Apa perbedaan utama antara penelitian kualitatif dan kuantitatif?",
            points: 10,
            options: [
              { id: "a", text: "Kualitatif menggunakan angka, kuantitatif menggunakan kata" },
              { id: "b", text: "Kualitatif eksploratif, kuantitatif mengukur" },
              { id: "c", text: "Kualitatif lebih valid" },
              { id: "d", text: "Tidak ada perbedaan" },
            ],
          },
          {
            id: "q7",
            type: "short_answer",
            text: "Berikan contoh teknik pengumpulan data dalam penelitian kualitatif.",
            points: 20,
          },
        ],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ]);
  }),

  // Quizzes - generate
  http.post("/api/projects/:projectId/quizzes", async ({ params }) => {
    await delay(600);
    const id = Number(params.projectId);
    return HttpResponse.json({
      id: 100 + id,
      projectId: id,
      title: "Kuis AI Generated",
      topic: "Topik Umum",
      metadata: { difficulty: "medium", questionTypes: ["multiple_choice", "short_answer"] },
      questions: [
        {
          id: "gen1",
          type: "multiple_choice",
          text: "Apa konsep utama dari topik ini?",
          points: 10,
          options: [
            { id: "a", text: "Opsi A" },
            { id: "b", text: "Opsi B" },
            { id: "c", text: "Opsi C" },
            { id: "d", text: "Opsi D" },
          ],
        },
        {
          id: "gen2",
          type: "short_answer",
          text: "Jelaskan konsep utama dari topik ini dalam 3 kalimat.",
          points: 20,
        },
      ],
      createdAt: now(),
      updatedAt: now(),
    }, { status: 201 });
  }),

  // Quizzes - submit
  http.post("/api/quizzes/:quizId/submissions", async ({ params }) => {
    await delay(400);
    const quizId = Number(params.quizId);
    return HttpResponse.json({
      id: 500 + quizId,
      quizId,
      userId: "mock-user-001",
      score: null,
      maxScore: 100,
      feedback: null,
      submittedAt: now(),
      createdAt: now(),
      updatedAt: now(),
    }, { status: 201 });
  }),

  // Quizzes - get own submission
  http.get("/api/quizzes/:quizId/submissions/me", async () => {
    await delay(200);
    return HttpResponse.json({
      id: 501,
      quizId: 1,
      userId: "mock-user-001",
      score: null,
      maxScore: 100,
      feedback: null,
      submittedAt: now(),
      createdAt: now(),
      updatedAt: now(),
    });
  }),
];
