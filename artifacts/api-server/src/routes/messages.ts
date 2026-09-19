import { Router, type IRouter } from "express";
import { eq, asc, desc, and, isNull, sql } from "drizzle-orm";
import {
  db,
  messagesTable,
  projectsTable,
  documentVersionsTable,
  documentsTable,
  projectMetadataTable,
  aiUsageLogTable,
  userBalancesTable,
} from "@workspace/db";
import {
  ListMessagesParams,
  SendMessageParams,
  SendMessageBody,
} from "@workspace/api-zod";
import { callAI, buildSystemPrompt, type ChatMode, resolveOlagonTierOrFallback } from "../lib/ai.js";
import { isOwnerEmail } from "../middlewares/owner.js";
import { logActivity } from "../lib/activity.js";
import { checkAIAccess, consumeQuotaForAIRequest } from "../lib/subscription.js";
import { sanitizeUserMessage } from "../lib/prompt-injection.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// GET /projects/:projectId/messages
router.get("/projects/:projectId/messages", async (req, res): Promise<void> => {
  const params = ListMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.projectId, params.data.projectId))
    .orderBy(asc(messagesTable.createdAt));

  res.json(messages);
});

// POST /projects/:projectId/messages
router.post("/projects/:projectId/messages", async (req, res): Promise<void> => {
  const params = SendMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { content: messageContent, mode = "revise", tier: tierId } = parsed.data;

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Ownership check — was missing in pre-DECISION 019 implementation.
  // Other AI routes (analyze, outline, documents/generate) use
  // requireProjectOwnership. Messages route was the odd one out — a logged-in
  // user could send chat messages on someone else's project if they knew
  // the projectId.
  if (!req.user?.id || project.userId !== req.user.id) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  // DECISION 019: Resolve tier via Olagon-aware path so owner's `aiProvider=olagon`
  // preference is honored. Non-owner `checkTierAccess` still gates explicit
  // tierId requests to their subscription package tier (sonnet-5 / haiku-4.5).
  const userEmail = req.user.email;

  const selectedTier = await resolveOlagonTierOrFallback(
    project.userId,
    tierId ?? null,
    userEmail,
  );

  if (!selectedTier) {
    // Show the requested tier name in the error so it's clear what was rejected
    const requestedTierName = tierId ?? "unknown";
    const ownerBypass = isOwnerEmail(userEmail);
    res.status(tierId ? 403 : 400).json({
      error: tierId ? `Tier "${requestedTierName}" tidak diizinkan untuk paket Anda` : "Tier tidak valid",
      tierName: requestedTierName,
      // DIAGNOSTIC: reveal bypass state so we can see OWNER_EMAIL env var status in production
      _diag: { userEmail, ownerBypass, OWNER_EMAIL_set: !!process.env.OWNER_EMAIL },
    });
    return;
  }

  // Pre-check: estimate cost and verify quota (subscription OR saldo)
  // No side effects — just verify user has access.
  const estimatedCostCents = selectedTier.pricePer1MInputCents > 0 || selectedTier.pricePer1MOutputCents > 0
    ? Math.max(100, selectedTier.pricePer1MInputCents + selectedTier.pricePer1MOutputCents)
    : 0;

  if (!selectedTier.isFree) {
    const accessCheck = await checkAIAccess({
      userId: project.userId,
      tierId: selectedTier.id,
      estimatedCostCents,
      userEmail,
    });
    if (!accessCheck.allowed) {
      if (accessCheck.reason === "saldo_insufficient") {
        res.status(402).json({
          error: "Saldo tidak mencukupi. Silakan topup terlebih dahulu.",
          balanceCents: accessCheck.balanceCents,
          costCents: accessCheck.requiredCents,
          tierName: selectedTier.name,
        });
      } else {
        res.status(402).json({
          error: "Quota langganan habis dan saldo tidak tersedia. Silakan topup atau perpanjang langganan.",
          tierName: selectedTier.name,
        });
      }
      return;
    }
  }

  // Sanitize user content against prompt injection
  const sanitizedContent = sanitizeUserMessage(messageContent);

  // Save user message
  const [userMessage] = await db
    .insert(messagesTable)
    .values({
      projectId: params.data.projectId,
      role: "user",
      content: sanitizedContent,
    })
    .returning();

  // Get project context
  const [metadata] = await db
    .select()
    .from(projectMetadataTable)
    .where(eq(projectMetadataTable.projectId, params.data.projectId));

  const [latestDoc] = await db
    .select()
    .from(documentVersionsTable)
    .where(eq(documentVersionsTable.projectId, params.data.projectId))
    .orderBy(desc(documentVersionsTable.versionNumber))
    .limit(1);

  // Get recent chat history (last 10 messages)
  const recentMessages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.projectId, params.data.projectId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(10);

  const systemPrompt = buildSystemPrompt({
    title: project.title,
    instructionText: project.instructionText,
    subject: metadata?.subject ?? project.subject,
    taskType: metadata?.taskType ?? project.taskType,
    citationFormat: metadata?.citationFormat ?? project.citationFormat,
    outline: metadata?.outline,
    latestDocument: latestDoc?.content,
    contextSummary: metadata?.contextSummary,
    mode,
  });

  // Build messages for AI (reversed to chronological)
  // All user content is sanitized against prompt injection
  const aiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...recentMessages
      .reverse()
      .slice(0, -1) // exclude the message we just inserted (last in list before reverse)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: sanitizeUserMessage(m.content),
      })),
    { role: "user", content: sanitizedContent },
  ];

  // Call AI with selected tier
  let usageResult: Awaited<ReturnType<typeof callAI>>;
  try {
    usageResult = await callAI(aiMessages, selectedTier.id, mode, selectedTier);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "KONTEKS_TERLALU_PANJANG") {
      logger.warn({ tierId: selectedTier.id, projectId: params.data.projectId }, "Context window exceeded — suggest truncating document");
      res.status(422).json({
        error: "Konteks terlalu panjang.",
        detail: "Dokumen atau percakapan terlalu panjang untuk diproses. Coba singkatkan dokumen atau hapus beberapa pesan chat terakhir.",
        code: "KONTEKS_TERLALU_PANJANG",
      });
      return;
    }
    logger.error({ err, tierId: selectedTier.id }, "AI call failed");
    res.status(500).json({ error: "AI request failed. Silakan coba lagi." });
    return;
  }

  const { content: aiContent, usage } = usageResult!;

  // Log AI usage to DB
  const [usageLog] = await db
    .insert(aiUsageLogTable)
    .values({
      userId: project.userId,
      projectId: params.data.projectId,
      tierId: selectedTier.id,
      model: selectedTier.model,
      provider: selectedTier.provider,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCostUsd: usage.estimatedCostUsd,
      costCents: usage.costCents,
      requestType: "chat",
    })
    .returning();

  // Apply quota/saldo consumption for actual usage
  // - If subscription: quota already accumulated by consumeQuotaForAIRequest
  // - If saldo: saldo already deducted by consumeQuotaForAIRequest
  // The pre-check used estimatedCost; now we apply for real costCents.
  // Expose method + saldoUsedCents in response so frontend can show transparency.
  let finalConsume: Awaited<ReturnType<typeof consumeQuotaForAIRequest>> | null = null;
  if (!selectedTier.isFree && usage.costCents > 0) {
    finalConsume = await consumeQuotaForAIRequest({
      userId: project.userId,
      tierId: selectedTier.id,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costCents: usage.costCents,
    });
    if (!finalConsume.allowed) {
      logger.warn(
        { userId: project.userId, costCents: usage.costCents, reason: finalConsume.reason },
        "Quota/saldo exhausted mid-flight"
      );
    }
  }

  // Save AI response
  const [assistantMessage] = await db
    .insert(messagesTable)
    .values({
      projectId: params.data.projectId,
      role: "assistant",
      content: aiContent,
    })
    .returning();

  // M8: Cap chat history at 100 messages per project
  // Keep only the 100 most recent messages; delete older ones.
  const MAX_MESSAGES_PER_PROJECT = 100;
  await db
    .delete(messagesTable)
    .where(
      and(
        eq(messagesTable.projectId, params.data.projectId),
        sql`${messagesTable.id} NOT IN (
          SELECT id FROM (
            SELECT id FROM messages
            WHERE project_id = ${params.data.projectId}
            ORDER BY created_at DESC
            LIMIT ${MAX_MESSAGES_PER_PROJECT}
          ) AS recent_messages
        )`,
      ),
    );

  await logActivity(params.data.projectId, "chat_message", `User bertanya: ${sanitizedContent.substring(0, 60)}...`);

  // Check if response contains a new document version
  if (
    aiContent.includes("# ") &&
    aiContent.length > 500 &&
    (sanitizedContent.toLowerCase().includes("tulis") ||
      sanitizedContent.toLowerCase().includes("perbaiki") ||
      sanitizedContent.toLowerCase().includes("revisi"))
  ) {
    const projectId = params.data.projectId;

    // Find active document or fall back to legacy
    const [activeDoc] = await db
      .select()
      .from(documentsTable)
      .where(and(eq(documentsTable.projectId, projectId), eq(documentsTable.isActive, true)));

    const existingVersions = await db
      .select()
      .from(documentVersionsTable)
      .where(
        activeDoc
          ? eq(documentVersionsTable.documentId, activeDoc.id)
          : and(eq(documentVersionsTable.projectId, projectId), isNull(documentVersionsTable.documentId))
      );

    const newVersion = existingVersions.length + 1;
    await db.insert(documentVersionsTable).values({
      projectId,
      documentId: activeDoc?.id,
      versionNumber: newVersion,
      content: aiContent,
      changeDescription: `Revisi berdasarkan permintaan: ${sanitizedContent.substring(0, 80)}`,
    });

    await logActivity(
      projectId,
      "document_revised",
      `Versi ${newVersion} dibuat dari revisi`
    );
  }

  // Build quota info from consumption result (available after AI call completes)
  let quotaInfo: { method: string; saldoUsedCents: number } | undefined;
  if (!selectedTier.isFree && usage.costCents > 0 && finalConsume) {
    quotaInfo = {
      method: finalConsume.method ?? "subscription",
      saldoUsedCents: finalConsume.method === "saldo" ? (finalConsume.deductCents ?? 0) : 0,
    };
  }

  res.status(201).json({
    ...assistantMessage,
    usage: {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costCents: usage.costCents,
      tierId: selectedTier.id,
      tierName: selectedTier.name,
      ...(quotaInfo ?? {}),
    },
  });
});

export default router;
