import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, quizzesTable, quizSubmissionsTable, projectsTable } from "@workspace/db";
import { requireProjectOwnership } from "../lib/ownership.js";
import { sanitizeInstructionText } from "../lib/prompt-injection.js";
import { callAI, type ChatMessage, getTierConfig, getTierForUser } from "../lib/ai.js";
import { logAIUsage } from "../lib/ai-usage-log.js";
import { checkCreditBalance, deductCredit } from "../lib/credit.js";
import { logActivity } from "../lib/activity.js";
import { questionSchema } from "@workspace/db";
import { quizResponseSchema } from "@workspace/db";
import { z } from "zod/v4";

const router: IRouter = Router();

// GET /projects/:projectId/quizzes
router.get("/projects/:projectId/quizzes", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  if (!projectId || isNaN(projectId)) {
    res.status(400).json({ error: "ID proyek tidak valid." });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const ok = await requireProjectOwnership(projectId, req.user.id, res);
  if (!ok) return;

  const quizzes = await db
    .select()
    .from(quizzesTable)
    .where(eq(quizzesTable.projectId, projectId))
    .orderBy(desc(quizzesTable.createdAt));

  res.json(quizzes);
});

// GET /projects/:projectId/quizzes/:quizId
router.get("/projects/:projectId/quizzes/:quizId", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  const quizId = Number(req.params.quizId);
  if (!projectId || isNaN(projectId) || !quizId || isNaN(quizId)) {
    res.status(400).json({ error: "ID proyek atau kuis tidak valid." });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const ok = await requireProjectOwnership(projectId, req.user.id, res);
  if (!ok) return;

  const [quiz] = await db
    .select()
    .from(quizzesTable)
    .where(eq(quizzesTable.id, quizId));

  if (!quiz || quiz.projectId !== projectId) {
    res.status(404).json({ error: "Quiz not found" });
    return;
  }

  res.json(quiz);
});

// POST /projects/:projectId/quizzes — AI-generate quiz
router.post("/projects/:projectId/quizzes", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  if (!projectId || isNaN(projectId)) {
    res.status(400).json({ error: "ID proyek tidak valid." });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const ok = await requireProjectOwnership(projectId, req.user.id, res);
  if (!ok) return;

  const { title, description, topic, questionCount, questionTypes, difficulty, tier: requestedTier } = req.body as {
    title?: string;
    description?: string;
    topic?: string;
    questionCount?: number;
    questionTypes?: string[];
    difficulty?: string;
    tier?: string;
  };

  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "Judul referensi wajib diisi." });
    return;
  }

  // Resolve tier from request or user's preferred
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  if (!project) {
    res.status(404).json({ error: "Proyek tidak ditemukan." });
    return;
  }
  const selectedTier = requestedTier
    ? await getTierConfig(requestedTier)
    : await getTierForUser(project.userId, null);

  if (!selectedTier) {
    res.status(400).json({ error: "Tier tidak valid" });
    return;
  }

  // Pre-check credit for paid tiers
  if (!selectedTier.isFree) {
    const estimatedCostCents = Math.max(
      100,
      selectedTier.pricePer1MInputCents + selectedTier.pricePer1MOutputCents,
    );
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

  const sanitizedTopic = topic ? sanitizeInstructionText(topic) : null;
  const sanitizedTitle = sanitizeInstructionText(title);

  // Build AI prompt for quiz generation
  const types = questionTypes ?? ["multiple_choice", "short_answer", "essay"];
  const count = questionCount ?? 10;
  const diff = difficulty ?? "medium";

  const prompt = `You are an expert Indonesian language teacher. Generate a quiz in JSON format.

Topic: ${sanitizedTopic ?? "General academic topic from the project"}
Number of questions: ${count}
Difficulty: ${diff}
Question types: ${types.join(", ")}

Generate questions that are appropriate for Indonesian SMA/university students. Include a mix of:
- Multiple choice (4 options, mark correct answer)
- Short answer (clear, concise answer)
- Essay (open-ended, point value)

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "id": "q1",
      "text": "Question text in Indonesian",
      "type": "multiple_choice|short_answer|essay",
      "options": [{"id": "a", "text": "Option A"}, ...] // only for multiple_choice
    }
  ],
  "metadata": {
    "topic": "...",
    "difficulty": "${diff}",
    "estimatedTime": "X minutes"
  }
}

IMPORTANT: Return ONLY the JSON, no markdown code blocks, no explanation.`;

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: prompt,
    },
  ];

  try {
    const aiResult = await callAI(messages, selectedTier.id);
    let questions: z.infer<typeof questionSchema>[] = [];

    try {
      const parsed = JSON.parse(aiResult.content);
      // Validate each question against the schema
      const rawQuestions = parsed.questions ?? [];
      questions = rawQuestions.map((q: unknown) => questionSchema.parse(q));
    } catch {
      res.status(500).json({ error: "Gagal memproses respons dari AI." });
      return;
    }

    const usageLog = await logAIUsage({
      userId: project.userId,
      projectId,
      requestType: "quiz",
      usage: aiResult.usage,
      tierConfig: aiResult.tierConfig,
    });

    if (!selectedTier.isFree && aiResult.usage.costCents > 0) {
      await deductCredit({
        userId: project.userId,
        costCents: aiResult.usage.costCents,
        tierIsFree: false,
        tierId: selectedTier.id,
        aiUsageLogId: usageLog?.id,
        description: `AI quiz — ${selectedTier.name} tier`,
      });
    }

    const [quiz] = await db
      .insert(quizzesTable)
      .values({
        projectId,
        title: sanitizedTitle,
        description: description ?? null,
        questions,
        metadata: {
          topic: sanitizedTopic,
          difficulty: diff,
          estimatedTime: `${count * 3} minutes`,
        },
        createdBy: req.user.id,
      })
      .returning();

    await logActivity(projectId, "quiz_generated", `Quiz "${sanitizedTitle}" dibuat dengan ${count} soal`);

    res.status(201).json(quiz);
  } catch (err) {
    console.error("Quiz generation error:", err);
    res.status(500).json({ error: "Gagal membuat kuis." });
  }
});

// GET /quizzes/:quizId/submissions
router.get("/quizzes/:quizId/submissions", async (req, res): Promise<void> => {
  const quizId = Number(req.params.quizId);
  if (!quizId || isNaN(quizId)) {
    res.status(400).json({ error: "ID kuis tidak valid." });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const submissions = await db
    .select()
    .from(quizSubmissionsTable)
    .where(eq(quizSubmissionsTable.quizId, quizId))
    .orderBy(desc(quizSubmissionsTable.submittedAt));

  res.json(submissions);
});

// POST /quizzes/:quizId/submissions
router.post("/quizzes/:quizId/submissions", async (req, res): Promise<void> => {
  const quizId = Number(req.params.quizId);
  if (!quizId || isNaN(quizId)) {
    res.status(400).json({ error: "ID kuis tidak valid." });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const [quiz] = await db
    .select()
    .from(quizzesTable)
    .where(eq(quizzesTable.id, quizId));

  if (!quiz) {
    res.status(404).json({ error: "Quiz not found" });
    return;
  }

  const { responses } = req.body as { responses?: z.infer<typeof quizResponseSchema>[] };
  if (!responses || !Array.isArray(responses)) {
    res.status(400).json({ error: "Respons wajib diisi dan harus berupa array." });
    return;
  }

  // Validate each response
  const validatedResponses = responses.map((r) => quizResponseSchema.parse(r));

  // Check for existing submission
  const [existing] = await db
    .select()
    .from(quizSubmissionsTable)
    .where(eq(quizSubmissionsTable.quizId, quizId));

  if (existing) {
    // Update existing submission
    const [updated] = await db
      .update(quizSubmissionsTable)
      .set({ responses: validatedResponses, submittedAt: new Date(), updatedAt: new Date() })
      .where(eq(quizSubmissionsTable.id, existing.id))
      .returning();
    res.json(updated);
    return;
  }

  const [submission] = await db
    .insert(quizSubmissionsTable)
    .values({
      quizId,
      studentId: req.user.id,
      responses: validatedResponses,
    })
    .returning();

  res.status(201).json(submission);
});

// GET /quizzes/:quizId/submissions/me
router.get("/quizzes/:quizId/submissions/me", async (req, res): Promise<void> => {
  const quizId = Number(req.params.quizId);
  if (!quizId || isNaN(quizId)) {
    res.status(400).json({ error: "ID kuis tidak valid." });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const [submission] = await db
    .select()
    .from(quizSubmissionsTable)
    .where(eq(quizSubmissionsTable.quizId, quizId));

  if (!submission) {
    res.status(404).json({ error: "No submission found" });
    return;
  }

  res.json(submission);
});

export default router;
