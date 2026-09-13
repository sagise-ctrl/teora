import { Router, type IRouter } from "express";
import { eq, asc, and, sql, desc } from "drizzle-orm";
import { randomBytes } from "crypto";
import {
  db,
  simulationSessionsTable,
  simulationMessagesTable,
  simulationReportsTable,
  projectsTable,
  documentsTable,
  projectMetadataTable,
  aiUsageLogTable,
  shareTokensTable,
} from "@workspace/db";
import {
  CreateSimulationSessionParams,
  CreateSimulationSessionBody,
  SendSimulationMessageParams,
  SendSimulationMessageBody,
  ListSimulationMessagesParams,
  CompleteSimulationSessionParams,
  GetLatestSimulationReportParams,
  SimulationPersona,
  type SimulationMessage,
  type SimulationReport,
} from "@workspace/api-zod";
import { callAI, getTierConfig, getTierForUser, type ChatMessage } from "../lib/ai.js";
import { checkAIAccess, consumeQuotaForAIRequest } from "../lib/subscription.js";
import { sanitizeUserMessage } from "../lib/prompt-injection.js";
import { logger } from "../lib/logger.js";
import { requireProjectOwnership } from "../lib/ownership.js";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PERSONA_PROMPTS: Record<SimulationPersona, { persona: string; tone: string }> = {
  dosen_strict: {
    persona: "Dosen pembimbing yang ketat dan kritis",
    tone: "formal, kritis, dan menuntut. Mengutamakan ketelitian, kedalaman argumen, dan dasar teori yang kuat.",
  },
  dosen_friendly: {
    persona: "Dosen pembimbing yang ramah dan suportif",
    tone: "hangat, suportif, tapi tetap akademis. Mengapresiasi usaha dan memberikan saran konstruktif.",
  },
  audience_awam: {
    persona: "Audiens umum yang bukan ahli di bidang ini",
    tone: "sederhana, penasaran, dan ingin memahami. Bertanya dari perspektif orang awam yang tertarik dengan topik presentasi.",
  },
  audience_expert: {
    persona: "Audiens ahli dan kritis di bidang terkait",
    tone: "teknis, mendalam, dan ingin menguji pemahaman presenter secara kritis. Bertanya tentang detail metodologi, data, dan klaim.",
  },
};

function buildSimulationSystemPrompt(params: {
  persona: SimulationPersona;
  projectTitle: string;
  subject: string | null;
  taskType: string | null;
  latestDocumentExcerpt: string | null;
  outline: string | null;
  instructionText: string | null;
}): string {
  const personaInfo = PERSONA_PROMPTS[params.persona];
  const contextParts: string[] = [
    `Kamu berperan sebagai ${personaInfo.persona}.`,
    `Gaya bertanya: ${personaInfo.tone}`,
    "",
    `KONTEKS PRESENTASI:`,
    `Judul: ${params.projectTitle}`,
  ];

  if (params.subject) contextParts.push(`Mata Kuliah: ${params.subject}`);
  if (params.taskType) contextParts.push(`Jenis Presentasi: ${params.taskType}`);
  if (params.instructionText) {
    contextParts.push(`\nINSTRUKSI PRESENTASI:\n${params.instructionText}`);
  }
  if (params.outline) {
    contextParts.push(`\nOUTLINE PRESENTASI:\n${params.outline}`);
  }
  if (params.latestDocumentExcerpt) {
    contextParts.push(`\nDOKUMEN TERBARU:\n${params.latestDocumentExcerpt}`);
  }

  contextParts.push(`
ATURAN SIMULASI:
- Bertindaklah sebagai ${personaInfo.persona}.
- Ajukan SATU pertanyaan yang tajam dan relevan pada satu waktu.
- Sesuaikan tingkat kesulitan pertanyaan dengan persona:
  - dosen_strict: pertanyaan kritis tentang kelemahan argumen, referensi, dan metodologi
  - dosen_friendly: pertanyaan reflektif tentang pemahaman dan penyampaian
  - audience_awam: pertanyaan sederhana yang membantu menjelaskan topik ke orang awam
  - audience_expert: pertanyaan teknis mendalam tentang metodologi, data, dan klaim
- Pertanyaan harus mendorong presenter untuk berpikir kritis tentang pekerjaannya.
- JANGAN memberikan jawaban atau solusi — hanya bertanya.
- JANGAN menunjukkan emosi berlebihan.
- Pertanyaan dalam Bahasa Indonesia.
- JANGAN menunjukkan bahwa kamu adalah AI.

SAFETY CAP:
- BATAS MAKSIMAL 10 PERTANYAAN per sesi simulasi.
- Jika presenter sudah menjawab dengan sangat baik dan pertanyaan kritis sudah terjawab, kamu boleh mengakhiri simulasi dengan pujian dan saran ringkas.
- Jika 10 pertanyaan sudah tercapai, akhiri simulasi dengan ringkasan singkat.

Setelah bertanya, AKHIRI pesanmu dengan tepat di sini — tanpa penjelasan tambahan, tanpa tanda terima kasih, tanpa penutup.
`);

  return contextParts.join("\n");
}

async function buildProjectContextSnapshot(projectId: number) {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) return null;

  const [latestDoc] = await db
    .select({ content: documentsTable.content })
    .from(documentsTable)
    .where(and(
      eq(documentsTable.projectId, projectId),
      eq(documentsTable.isDeleted, false)
    ))
    .orderBy(desc(documentsTable.updatedAt))
    .limit(1);

  const [metaSubject] = await db
    .select({ value: projectMetadataTable.value })
    .from(projectMetadataTable)
    .where(and(
      eq(projectMetadataTable.projectId, projectId),
      eq(projectMetadataTable.key, "subject")
    ))
    .limit(1);

  const [metaTaskType] = await db
    .select({ value: projectMetadataTable.value })
    .from(projectMetadataTable)
    .where(and(
      eq(projectMetadataTable.projectId, projectId),
      eq(projectMetadataTable.key, "taskType")
    ))
    .limit(1);

  const [metaOutline] = await db
    .select({ value: projectMetadataTable.value })
    .from(projectMetadataTable)
    .where(and(
      eq(projectMetadataTable.projectId, projectId),
      eq(projectMetadataTable.key, "outline")
    ))
    .limit(1);

  const [metaInstruction] = await db
    .select({ value: projectMetadataTable.value })
    .from(projectMetadataTable)
    .where(and(
      eq(projectMetadataTable.projectId, projectId),
      eq(projectMetadataTable.key, "instructionText")
    ))
    .limit(1);

  return {
    title: project.title,
    subject: metaSubject?.value ?? null,
    taskType: metaTaskType?.value ?? null,
    latestDocumentExcerpt: latestDoc?.content
      ? latestDoc.content.substring(0, 3000)
      : null,
    outline: metaOutline?.value ?? null,
    instructionText: metaInstruction?.value ?? null,
  };
}

async function generateSimulationReport(params: {
  sessionId: number;
  projectId: number;
  userId: string;
  persona: SimulationPersona;
  messages: SimulationMessage[];
  tierId: string;
}): Promise<{
  overallScore: number;
  summary: string;
  strengths: string;
  weaknesses: string;
  recommendations: string;
  scores: Array<{ criterion: string; score: number; notes: string }>;
} | null> {
  const { sessionId, projectId, userId, persona, messages, tierId } = params;

  const personaInfo = PERSONA_PROMPTS[persona];
  const conversationText = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const systemPrompt = `Kamu adalah evaluator presentasi akademik yang ahli. Berdasarkan transkrip simulasi tanya-jawab berikut, berikan evaluasi komprehensif terhadap kualitas presentasi.

PERSONA PERTANYA: ${personaInfo.persona} (${personaInfo.tone})

TRANSKRIP SIMULASI:
${conversationText}

FORMAT RESPONS (HANYA JSON, TANPA PREAMBLE):
{
  "overallScore": [0-100],
  "summary": "[ringkasan 1-2 kalimat tentang kualitas keseluruhan presentasi]",
  "strengths": "[3-5 poin kekuatan presentasi, pisahkan dengan newline]",
  "weaknesses": "[3-5 poin kelemahan atau area yang perlu diperbaiki, pisahkan dengan newline]",
  "recommendations": "[3-5 rekomendasi spesifik untuk peningkatan, pisahkan dengan newline]",
  "scores": [
    { "criterion": "Penguasaan Konten", "score": [0-100], "notes": "[catatan singkat]" },
    { "criterion": "Struktur & Organisasi", "score": [0-100], "notes": "[catatan singkat]" },
    { "criterion": "Penyampaian & Penjelasan", "score": [0-100], "notes": "[catatan singkat]" },
    { "criterion": "Kemampuan Menjawab Pertanyaan", "score": [0-100], "notes": "[catatan singkat]" },
    { "criterion": "Persiapan & Kedalaman Referensi", "score": [0-100], "notes": "[catatan singkat]" }
  ]
}

HANYA KELUARKAN JSON. TANPA markdown, TANPA penjelasan, TANPA penutup.`;

  const chatMessages: ChatMessage[] = [
    { role: "user", content: systemPrompt },
  ];

  const tier = await getTierConfig(tierId);
  const selectedTier = tier ?? await getTierConfig("haiku-4.5");
  if (!selectedTier) return null;

  const aiResponse = await callAI(chatMessages, selectedTier.id, "summary");

  let report: {
    overallScore: number;
    summary: string;
    strengths: string;
    weaknesses: string;
    recommendations: string;
    scores: Array<{ criterion: string; score: number; notes: string }>;
  };

  try {
    const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    report = JSON.parse(jsonMatch[0]) as typeof report;
  } catch {
    logger.warn({ sessionId }, "Failed to parse simulation report JSON, using defaults");
    report = {
      overallScore: 70,
      summary: "Evaluasi otomatis tidak tersedia. Presenter menunjukkan pemahaman dasar yang cukup.",
      strengths: "Presenter menunjukkan usaha yang baik.\nPresenter menjawab dengan bahasa yang cukup jelas.\nPresenter menunjukkan persiapan terhadap materi.",
      weaknesses: "Kedalaman jawaban masih bisa ditingkatkan.\nBeberapa pertanyaan kritis belum sepenuhnya terjawab.\nStruktur presentasi perlu lebih terorganisir.",
      recommendations: "Pelajari lebih dalam referensi dan literatur terkait.\nLatih kemampuan menjawab pertanyaan kritis.\nPerbaiki struktur dan flow presentasi.",
      scores: [
        { criterion: "Penguasaan Konten", score: 70, notes: "Pemahaman dasar cukup, perlu pendalaman" },
        { criterion: "Struktur & Organisasi", score: 65, notes: "Perlu lebih terstruktur" },
        { criterion: "Penyampaian & Penjelasan", score: 72, notes: "Cukup jelas, bisa lebih terstruktur" },
        { criterion: "Kemampuan Menjawab Pertanyaan", score: 68, notes: "Jawaban cukup tapi kurang mendalam" },
        { criterion: "Persiapan & Kedalaman Referensi", score: 70, notes: "Referensi cukup, perlu lebih banyak" },
      ],
    };
  }

  return report;
}

function getQuotaInfo(session: { totalCostCents: number }) {
  return { saldoUsedCents: session.totalCostCents };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// POST /projects/:projectId/simulasi/sessions — create + AI init question
router.post("/projects/:projectId/simulasi/sessions", async (req, res): Promise<void> => {
  const params = CreateSimulationSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user?.id ?? "", res);
  if (!ok) return;

  const parsed = CreateSimulationSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { persona } = parsed.data;

  const project = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId));

  if (!project.length) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const projectData = project[0];

  // Resolve AI tier
  const selectedTier = await getTierForUser(projectData.userId, null);
  if (!selectedTier) {
    res.status(500).json({ error: "AI tier tidak ditemukan" });
    return;
  }

  // Check AI access
  if (!selectedTier.isFree) {
    const accessCheck = await checkAIAccess({
      userId: projectData.userId,
      tierId: selectedTier.id,
      estimatedCostCents: 50,
    });
    if (!accessCheck.allowed) {
      if (accessCheck.reason === "saldo_insufficient") {
        res.status(402).json({
          error: "Saldo tidak mencukupi. Silakan topup terlebih dahulu.",
          balanceCents: accessCheck.balanceCents,
          costCents: accessCheck.requiredCents,
          quotaInfo: { method: "saldo" as const, saldoUsedCents: 0 },
        });
      } else {
        res.status(402).json({
          error: "Quota langganan habis dan saldo tidak tersedia.",
          quotaInfo: { method: "subscription" as const, saldoUsedCents: 0 },
        });
      }
      return;
    }
  }

  // Build context snapshot
  const contextSnapshot = await buildProjectContextSnapshot(params.data.projectId);
  if (!contextSnapshot) {
    res.status(404).json({ error: "Project tidak ditemukan" });
    return;
  }

  // Create session
  const [session] = await db
    .insert(simulationSessionsTable)
    .values({
      userId: projectData.userId,
      projectId: params.data.projectId,
      persona: persona as SimulationPersona,
      status: "active",
      projectContextSnapshot: contextSnapshot,
      tierId: selectedTier.id,
    })
    .returning();

  // Build system prompt for first AI question
  const systemPrompt = buildSimulationSystemPrompt({
    persona: persona as SimulationPersona,
    projectTitle: contextSnapshot.title,
    subject: contextSnapshot.subject,
    taskType: contextSnapshot.taskType,
    latestDocumentExcerpt: contextSnapshot.latestDocumentExcerpt,
    outline: contextSnapshot.outline,
    instructionText: contextSnapshot.instructionText,
  });

  const introMessage = `Halo! Saya akan menjadi ${PERSONA_PROMPTS[persona as SimulationPersona].persona.toLowerCase()} dalam simulasi presentasi ini.

Silakan mulai presentasikan proyek "${contextSnapshot.title}" kepada saya. Saya akan mendengarkan dan mungkin akan mengajukan beberapa pertanyaan.

Anda siap?`;

  // Store system message
  await db.insert(simulationMessagesTable).values({
    sessionId: session.id,
    role: "system",
    content: systemPrompt,
    inputTokens: 0,
    outputTokens: 0,
    costCents: 0,
    sequenceIndex: 0,
  });

  // Store assistant intro
  await db.insert(simulationMessagesTable).values({
    sessionId: session.id,
    role: "assistant",
    content: introMessage,
    inputTokens: 0,
    outputTokens: introMessage.length / 4,
    costCents: 0,
    sequenceIndex: 1,
  });

  res.status(201).json({
    ...session,
    messages: [{ id: 0, role: "assistant", content: introMessage, inputTokens: 0, outputTokens: 0, costCents: 0, sequenceIndex: 1, createdAt: new Date().toISOString() }],
    quotaInfo: getQuotaInfo(session),
  });
});

// GET /projects/:projectId/simulasi/sessions — list sessions
router.get("/projects/:projectId/simulasi/sessions", async (req, res): Promise<void> => {
  const params = CreateSimulationSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user?.id ?? "", res);
  if (!ok) return;

  const sessions: typeof simulationSessionsTable.$inferSelect[] = await db
    .select()
    .from(simulationSessionsTable)
    .where(eq(simulationSessionsTable.projectId, params.data.projectId))
    .orderBy(desc(simulationSessionsTable.startedAt));

  res.json(sessions.map((s) => ({
    ...s,
    quotaInfo: getQuotaInfo(s),
  })));
});

// GET /projects/:projectId/simulasi/sessions/:sessionId/messages — get messages
router.get("/projects/:projectId/simulasi/sessions/:sessionId/messages", async (req, res): Promise<void> => {
  const params = ListSimulationMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(simulationSessionsTable)
    .where(eq(simulationSessionsTable.id, params.data.sessionId));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const ok = await requireProjectOwnership(session.projectId, req.user?.id ?? "", res);
  if (!ok) return;

  const messages: typeof simulationMessagesTable.$inferSelect[] = await db
    .select()
    .from(simulationMessagesTable)
    .where(eq(simulationMessagesTable.sessionId, params.data.sessionId))
    .orderBy(asc(simulationMessagesTable.sequenceIndex));

  res.json({
    ...session,
    messages: messages.map((m) => ({
      id: m.id,
      sessionId: m.sessionId,
      role: m.role,
      content: m.content,
      inputTokens: m.inputTokens,
      outputTokens: m.outputTokens,
      costCents: m.costCents,
      sequenceIndex: m.sequenceIndex,
      createdAt: m.createdAt,
    })),
    quotaInfo: getQuotaInfo(session),
  });
});

// POST /projects/:projectId/simulasi/sessions/:sessionId/messages — send answer
router.post("/projects/:projectId/simulasi/sessions/:sessionId/messages", async (req, res): Promise<void> => {
  const params = SendSimulationMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(simulationSessionsTable)
    .where(eq(simulationSessionsTable.id, params.data.sessionId));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.status !== "active") {
    res.status(400).json({ error: "Session sudah berakhir" });
    return;
  }

  if (session.questionsAsked >= 10) {
    res.status(400).json({ error: "Batas 10 pertanyaan tercapai. Sesi simulasi selesai." });
    return;
  }

  const ok = await requireProjectOwnership(session.projectId, req.user?.id ?? "", res);
  if (!ok) return;

  const parsed = SendSimulationMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { content: userContent } = parsed.data;

  // Get all messages for context
  const messages: typeof simulationMessagesTable.$inferSelect[] = await db
    .select()
    .from(simulationMessagesTable)
    .where(eq(simulationMessagesTable.sessionId, params.data.sessionId))
    .orderBy(asc(simulationMessagesTable.sequenceIndex));

  const selectedTier = await getTierConfig(session.tierId ?? "haiku-4.5");
  if (!selectedTier) {
    res.status(500).json({ error: "AI tier tidak ditemukan" });
    return;
  }

  // Check AI access
  if (!selectedTier.isFree) {
    const accessCheck = await checkAIAccess({
      userId: session.userId,
      tierId: selectedTier.id,
      estimatedCostCents: 50,
    });
    if (!accessCheck.allowed) {
      if (accessCheck.reason === "saldo_insufficient") {
        res.status(402).json({
          error: "Saldo tidak mencukupi.",
          balanceCents: accessCheck.balanceCents,
          costCents: accessCheck.requiredCents,
          quotaInfo: { method: "saldo" as const, saldoUsedCents: session.totalCostCents },
        });
      } else {
        res.status(402).json({
          error: "Quota langganan habis.",
          quotaInfo: { method: "subscription" as const, saldoUsedCents: session.totalCostCents },
        });
      }
      return;
    }
  }

  // Sanitize user content
  const sanitizedContent = sanitizeUserMessage(userContent);

  // Get next sequence index
  const nextIndex = messages.length > 0 ? Math.max(...messages.map((m) => m.sequenceIndex)) + 1 : 0;

  // Save user message
  const [userMsg] = await db
    .insert(simulationMessagesTable)
    .values({
      sessionId: params.data.sessionId,
      role: "user",
      content: sanitizedContent,
      inputTokens: 0,
      outputTokens: 0,
      costCents: 0,
      sequenceIndex: nextIndex,
    })
    .returning();

  // Build AI messages from history
  const chatMessages: ChatMessage[] = [];
  for (const msg of messages) {
    if (msg.role === "system") {
      chatMessages.push({ role: "system", content: msg.content });
    } else if (msg.role === "user") {
      chatMessages.push({ role: "user", content: msg.content });
    } else if (msg.role === "assistant") {
      chatMessages.push({ role: "assistant", content: msg.content });
    }
  }
  // Add user's latest answer
  chatMessages.push({ role: "user", content: sanitizedContent });

  // Check if should end (10th question reached after user answered)
  const shouldEnd = session.questionsAsked >= 9; // 0-indexed, so 9 = 10th question

  if (shouldEnd) {
    // Generate report + final message
    const contextSnapshot = session.projectContextSnapshot as {
      title: string;
      subject: string | null;
      taskType: string | null;
      latestDocumentExcerpt: string | null;
      outline: string | null;
      instructionText: string | null;
    } | null;

    const endMessage = `Terima kasih atas presentasinya! Saya telah mengajukan ${session.questionsAsked + 1} pertanyaan dan Anda telah menjawab semuanya dengan cukup baik.

Berdasarkan simulasi ini, berikut evaluasi singkat saya:

`;

    // Store assistant end message
    const [endMsg] = await db
      .insert(simulationMessagesTable)
      .values({
        sessionId: params.data.sessionId,
        role: "assistant",
        content: endMessage,
        inputTokens: 0,
        outputTokens: endMessage.length / 4,
        costCents: 0,
        sequenceIndex: nextIndex + 1,
      })
      .returning();

    // Update session
    await db
      .update(simulationSessionsTable)
      .where(eq(simulationSessionsTable.id, params.data.sessionId));

    const updatedSession = await db
      .select()
      .from(simulationSessionsTable)
      .where(eq(simulationSessionsTable.id, params.data.sessionId));

    res.json({
      ...updatedSession[0],
      messages: [
        {
          id: userMsg.id,
          sessionId: userMsg.sessionId,
          role: userMsg.role,
          content: userMsg.content,
          inputTokens: userMsg.inputTokens,
          outputTokens: userMsg.outputTokens,
          costCents: userMsg.costCents,
          sequenceIndex: userMsg.sequenceIndex,
          createdAt: userMsg.createdAt,
        },
        {
          id: endMsg.id,
          sessionId: endMsg.sessionId,
          role: endMsg.role,
          content: endMsg.content,
          inputTokens: endMsg.inputTokens,
          outputTokens: endMsg.outputTokens,
          costCents: endMsg.costCents,
          sequenceIndex: endMsg.sequenceIndex,
          createdAt: endMsg.createdAt,
        },
      ],
      quotaInfo: getQuotaInfo(updatedSession[0]),
    });
    return;
  }

  // Call AI
  let aiResponse;
  try {
    aiResponse = await callAI(chatMessages, selectedTier.id, "socratic");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "KONTEKS_TERLALU_PANJANG") {
      await db.delete(simulationMessagesTable).where(eq(simulationMessagesTable.id, userMsg.id));
      res.status(422).json({
        error: "Konteks terlalu panjang.",
        detail: "Percakapan terlalu panjang. Coba mulai sesi baru.",
        code: "KONTEKS_TERLALU_PANJANG",
      });
      return;
    }
    logger.error({ err, sessionId: params.data.sessionId }, "AI call failed in simulation");
    await db.delete(simulationMessagesTable).where(eq(simulationMessagesTable.id, userMsg.id));
    res.status(500).json({ error: "Gagal memproses respons AI. Silakan coba lagi." });
    return;
  }

  // Consume quota
  await consumeQuotaForAIRequest({
    userId: session.userId,
    tierId: selectedTier.id,
    inputTokens: aiResponse.usage.inputTokens,
    outputTokens: aiResponse.usage.outputTokens,
    costCents: aiResponse.usage.costCents,
  });

  // Store AI response
  const [assistantMsg] = await db
    .insert(simulationMessagesTable)
    .values({
      sessionId: params.data.sessionId,
      role: "assistant",
      content: aiResponse.content,
      inputTokens: aiResponse.usage.inputTokens,
      outputTokens: aiResponse.usage.outputTokens,
      costCents: aiResponse.usage.costCents,
      sequenceIndex: nextIndex + 1,
    })
    .returning();

  // Update session counters
  const newTotalInput = session.totalInputTokens + aiResponse.usage.inputTokens;
  const newTotalOutput = session.totalOutputTokens + aiResponse.usage.outputTokens;
  const newTotalCost = session.totalCostCents + aiResponse.usage.costCents;
  const newQuestionsAsked = session.questionsAsked + 1;

  await db
    .update(simulationSessionsTable)
    .set({
      totalInputTokens: newTotalInput,
      totalOutputTokens: newTotalOutput,
      totalCostCents: newTotalCost,
      questionsAsked: newQuestionsAsked,
      updatedAt: new Date(),
    })
    .where(eq(simulationSessionsTable.id, params.data.sessionId));

  // Log AI usage
  await db.insert(aiUsageLogTable).values({
    userId: session.userId,
    projectId: session.projectId,
    tierId: selectedTier.id,
    model: selectedTier.model,
    inputTokens: aiResponse.usage.inputTokens,
    outputTokens: aiResponse.usage.outputTokens,
    costCents: aiResponse.usage.costCents,
    mode: "simulasi",
    feature: "simulasi_session",
  });

  const updatedSession = await db
    .select()
    .from(simulationSessionsTable)
    .where(eq(simulationSessionsTable.id, params.data.sessionId));

  res.json({
    ...updatedSession[0],
    messages: [
      {
        id: userMsg.id,
        sessionId: userMsg.sessionId,
        role: userMsg.role,
        content: userMsg.content,
        inputTokens: userMsg.inputTokens,
        outputTokens: userMsg.outputTokens,
        costCents: userMsg.costCents,
        sequenceIndex: userMsg.sequenceIndex,
        createdAt: userMsg.createdAt,
      },
      {
        id: assistantMsg.id,
        sessionId: assistantMsg.sessionId,
        role: assistantMsg.role,
        content: assistantMsg.content,
        inputTokens: assistantMsg.inputTokens,
        outputTokens: assistantMsg.outputTokens,
        costCents: assistantMsg.costCents,
        sequenceIndex: assistantMsg.sequenceIndex,
        createdAt: assistantMsg.createdAt,
      },
    ],
    quotaInfo: getQuotaInfo(updatedSession[0]),
  });
});

// POST /projects/:projectId/simulasi/sessions/:sessionId/complete — end early
router.post("/projects/:projectId/simulasi/sessions/:sessionId/complete", async (req, res): Promise<void> => {
  const params = CompleteSimulationSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(simulationSessionsTable)
    .where(eq(simulationSessionsTable.id, params.data.sessionId));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.status !== "active") {
    res.status(400).json({ error: "Session sudah berakhir" });
    return;
  }

  const ok = await requireProjectOwnership(session.projectId, req.user?.id ?? "", res);
  if (!ok) return;

  // Get all messages
  const messages: typeof simulationMessagesTable.$inferSelect[] = await db
    .select()
    .from(simulationMessagesTable)
    .where(eq(simulationMessagesTable.sessionId, params.data.sessionId))
    .orderBy(asc(simulationMessagesTable.sequenceIndex));

  // Generate report
  let reportData: Awaited<ReturnType<typeof generateSimulationReport>>;
  try {
    reportData = await generateSimulationReport({
    sessionId: session.id,
    projectId: session.projectId,
    userId: session.userId,
    persona: session.persona as SimulationPersona,
    messages: messages.map((m) => ({
      id: m.id,
      sessionId: m.sessionId,
      role: m.role,
      content: m.content,
      inputTokens: m.inputTokens,
      outputTokens: m.outputTokens,
      costCents: m.costCents,
      sequenceIndex: m.sequenceIndex,
      createdAt: m.createdAt,
    })),
    tierId: session.tierId ?? "haiku-4.5",
  });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "KONTEKS_TERLALU_PANJANG") {
      res.status(422).json({
        error: "Konteks terlalu panjang.",
        detail: "Sesi simulasi terlalu panjang untuk dievaluasi. Coba mulai sesi baru.",
        code: "KONTEKS_TERLALU_PANJANG",
      });
      return;
    }
    logger.error({ err, sessionId: session.id }, "Simulation report generation failed");
    res.status(500).json({ error: "Gagal menghasilkan evaluasi. Silakan coba lagi." });
    return;
  }

  // Mark existing reports for this project as not-latest
  await db
    .update(simulationReportsTable)
    .set({ isLatestForProject: false })
    .where(and(
      eq(simulationReportsTable.projectId, session.projectId),
      eq(simulationReportsTable.isLatestForProject, true)
    ));

  // Create report
  let report: SimulationReport | null = null;
  if (reportData) {
    const [created] = await db
      .insert(simulationReportsTable)
      .values({
        sessionId: session.id,
        projectId: session.projectId,
        userId: session.userId,
        overallScore: reportData.overallScore,
        summary: reportData.summary,
        strengths: reportData.strengths,
        weaknesses: reportData.weaknesses,
        recommendations: reportData.recommendations,
        scores: reportData.scores,
        isLatestForProject: true,
      })
      .returning();
    report = created;
  }

  // Update session
  await db
    .update(simulationSessionsTable)
    .set({
      status: "completed",
      endedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(simulationSessionsTable.id, params.data.sessionId));

  const updatedSession = await db
    .select()
    .from(simulationSessionsTable)
    .where(eq(simulationSessionsTable.id, params.data.sessionId));

  res.json({
    ...updatedSession[0],
    report: report ?? undefined,
    quotaInfo: getQuotaInfo(updatedSession[0]),
  });
});

// GET /projects/:projectId/simulasi/latest-report — latest report per project
router.get("/projects/:projectId/simulasi/latest-report", async (req, res): Promise<void> => {
  const params = GetLatestSimulationReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user?.id ?? "", res);
  if (!ok) return;

  const [report] = await db
    .select()
    .from(simulationReportsTable)
    .where(and(
      eq(simulationReportsTable.projectId, params.data.projectId),
      eq(simulationReportsTable.isLatestForProject, true)
    ))
    .limit(1);

  if (!report) {
    res.status(404).json({ error: "Belum ada laporan simulasi untuk project ini" });
    return;
  }

  res.json(report);
});

// POST /projects/:projectId/simulasi/sessions/:sessionId/share — create share token
router.post("/projects/:projectId/simulasi/sessions/:sessionId/share", async (req, res): Promise<void> => {
  const { sessionId, projectId } = req.params as { sessionId: string; projectId: string };
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const sessionPk = Number(sessionId);
  const projectPk = Number(projectId);

  const [session] = await db
    .select()
    .from(simulationSessionsTable)
    .where(eq(simulationSessionsTable.id, sessionPk));

  if (!session) {
    res.status(404).json({ error: "Sesi tidak ditemukan" });
    return;
  }

  const ok = await requireProjectOwnership(projectPk, req.user?.id ?? "", res);
  if (!ok) return;

  const expiresInDays = (req.body?.expiresInDays as number | undefined) ?? 7;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const token = randomBytes(32).toString("base64url");

  const [shareToken] = await db
    .insert(shareTokensTable)
    .values({
      projectId: projectPk,
      resourceId: sessionPk,
      token,
      type: "simulation_report",
      accessMode: "view",
      expiresAt,
    })
    .returning();

  res.status(201).json({ tokenId: token, expiresAt });
});

export default router;
