import { Router, type IRouter } from "express";
import { eq, asc, desc, and, isNull } from "drizzle-orm";
import {
  db,
  messagesTable,
  projectsTable,
  documentVersionsTable,
  documentsTable,
  projectMetadataTable,
} from "@workspace/db";
import {
  ListMessagesParams,
  SendMessageParams,
  SendMessageBody,
} from "@workspace/api-zod";
import { callAI, buildSystemPrompt, type ChatMode } from "../lib/ai.js";
import { logActivity } from "../lib/activity.js";
import { logAIUsage } from "../lib/ai-usage-log.js";
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

  const { content: messageContent, mode = "revise" } = parsed.data;

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
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

  // Get recent chat history (last 10 messages) — sanitize all historical user content
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

  // Call AI
  const { content: aiContent, usage } = await callAI(aiMessages);

  // Log AI usage (non-blocking)
  await logAIUsage({
    userId: project.userId,
    projectId: params.data.projectId,
    requestType: "chat",
    usage,
  });

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

  res.status(201).json(assistantMessage);
});

export default router;
