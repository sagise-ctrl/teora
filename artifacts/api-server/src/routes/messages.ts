import { Router, type IRouter } from "express";
import { eq, asc, desc, and, isNull } from "drizzle-orm";
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
import { callAI, buildSystemPrompt, type ChatMode, getTierConfig, getTierForUser } from "../lib/ai.js";
import { logActivity } from "../lib/activity.js";
import { checkCreditBalance, deductCredit } from "../lib/credit.js";
import { sanitizeUserMessage } from "../lib/prompt-injection.js";

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

  // Resolve tier: use requested tier or user's preferred
  const selectedTier = tierId
    ? await getTierConfig(tierId)
    : await getTierForUser(project.userId, null);

  if (!selectedTier) {
    res.status(400).json({ error: "Tier tidak valid" });
    return;
  }

  // Pre-check: estimate cost and verify balance (don't call AI if insufficient)
  const estimatedCostCents = selectedTier.pricePer1MInputCents > 0 || selectedTier.pricePer1MOutputCents > 0
    ? Math.max(100, selectedTier.pricePer1MInputCents + selectedTier.pricePer1MOutputCents)
    : 0;

  if (!selectedTier.isFree) {
    const creditCheck = await checkCreditBalance(project.userId, estimatedCostCents, false);
    if (!creditCheck.allowed) {
      res.status(402).json({
        error: creditCheck.reason,
        balanceCents: creditCheck.balanceCents,
        costCents: creditCheck.costCents,
        tierName: selectedTier.name,
      });
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
  let usageResult: Awaited<ReturnType<typeof callAI>> | null = null;
  try {
    usageResult = await callAI(aiMessages, selectedTier.id, mode);
  } catch (err) {
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

  // Deduct credit (non-blocking, but logged)
  if (!selectedTier.isFree && usage.costCents > 0) {
    await deductCredit({
      userId: project.userId,
      costCents: usage.costCents,
      tierIsFree: false,
      tierId: selectedTier.id,
      aiUsageLogId: usageLog.id,
      description: `AI chat — ${selectedTier.name} tier`,
    });
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

  res.status(201).json({
    ...assistantMessage,
    usage: {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costCents: usage.costCents,
      tierId: selectedTier.id,
      tierName: selectedTier.name,
    },
  });
});

export default router;
