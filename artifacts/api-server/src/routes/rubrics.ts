import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, rubricsTable, quizzesTable, projectsTable } from "@workspace/db";
import { requireProjectOwnership } from "../lib/ownership.js";
import { rubricCriterionSchema } from "@workspace/db";
import { callAI, getTierConfig, getTierForUser } from "../lib/ai.js";
import { logAIUsage } from "../lib/ai-usage-log.js";
import { checkCreditBalance, deductCredit } from "../lib/credit.js";
import { z } from "zod/v4";

const router: IRouter = Router();

// GET /projects/:projectId/quizzes/:quizId/rubric
router.get("/projects/:projectId/quizzes/:quizId/rubric", async (req, res): Promise<void> => {
  const quizId = Number(req.params.quizId);
  if (!quizId || isNaN(quizId)) {
    res.status(400).json({ error: "Invalid quizId" });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rubric = await db
    .select()
    .from(rubricsTable)
    .where(eq(rubricsTable.quizId, quizId))
    .orderBy(desc(rubricsTable.createdAt))
    .limit(1);

  if (!rubric.length) {
    res.status(404).json({ error: "Rubric not found for this quiz" });
    return;
  }

  res.json(rubric[0]);
});

// POST /projects/:projectId/quizzes/:quizId/rubric — AI-generate rubric
router.post("/projects/:projectId/quizzes/:quizId/rubric", async (req, res): Promise<void> => {
  const quizId = Number(req.params.quizId);
  if (!quizId || isNaN(quizId)) {
    res.status(400).json({ error: "Invalid quizId" });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Verify quiz belongs to a project owned by this user
  const [quiz] = await db
    .select()
    .from(quizzesTable)
    .where(eq(quizzesTable.id, quizId));

  if (!quiz) {
    res.status(404).json({ error: "Quiz not found" });
    return;
  }

  const ok = await requireProjectOwnership(quiz.projectId, req.user.id, res);
  if (!ok) return;

  const { manualNotes, tier: requestedTier } = req.body as { manualNotes?: string; tier?: string };

  // Resolve tier from request or user's preferred
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, quiz.projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
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

  // Build AI prompt to generate rubric criteria from quiz questions
  const questions = quiz.questions as Array<{ id: string; text: string; type: string; points?: number }>;
  const prompt = `You are an expert Indonesian educator creating a grading rubric.

Quiz Title: ${quiz.title}
Questions:
${questions.map((q) => `ID: ${q.id}, Text: ${q.text}, Type: ${q.type}, Points: ${q.points ?? 1}`).join("\n")}

Generate a grading rubric in JSON format. For each question, provide:
- questionId: matching the question ID above
- maxPoints: the point value from the quiz
- correctAnswer: for multiple choice questions only
- keywords: important terms students should mention (for short answer/essay)
- keywordThreshold: 0.5 (50% keyword match for partial credit)

Return ONLY valid JSON:
{
  "criteria": [
    {
      "questionId": "q1",
      "maxPoints": 1,
      "correctAnswer": "a",
      "keywords": [],
      "keywordThreshold": 0.5
    }
  ]
}

IMPORTANT: Return ONLY the JSON, no markdown code blocks.`;

  try {
    const aiResult = await callAI([{ role: "user", content: prompt }], selectedTier.id);
    const parsed = JSON.parse(aiResult.content);
    const criteria = (parsed.criteria ?? []).map((c: unknown) => rubricCriterionSchema.parse(c));

    const usageLog = await logAIUsage({
      userId: project.userId,
      projectId: quiz.projectId,
      requestType: "rubric",
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
        description: `AI rubric — ${selectedTier.name} tier`,
      });
    }

    const [rubric] = await db
      .insert(rubricsTable)
      .values({
        quizId,
        criteria,
        manualNotes: manualNotes ?? null,
        createdBy: req.user.id,
      })
      .returning();

    res.status(201).json(rubric);
  } catch (err) {
    console.error("Rubric generation error:", err);
    res.status(500).json({ error: "Failed to generate rubric" });
  }
});

// PATCH /projects/:projectId/quizzes/:quizId/rubric
router.patch("/projects/:projectId/quizzes/:quizId/rubric", async (req, res): Promise<void> => {
  const quizId = Number(req.params.quizId);
  if (!quizId || isNaN(quizId)) {
    res.status(400).json({ error: "Invalid quizId" });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [rubric] = await db
    .select()
    .from(rubricsTable)
    .where(eq(rubricsTable.quizId, quizId));

  if (!rubric) {
    res.status(404).json({ error: "Rubric not found" });
    return;
  }

  const { criteria, manualNotes } = req.body as {
    criteria?: z.infer<typeof rubricCriterionSchema>[];
    manualNotes?: string;
  };

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (criteria) {
    updateData.criteria = criteria.map((c) => rubricCriterionSchema.parse(c));
  }
  if (manualNotes !== undefined) {
    updateData.manualNotes = manualNotes;
  }

  const [updated] = await db
    .update(rubricsTable)
    .set(updateData)
    .where(eq(rubricsTable.id, rubric.id))
    .returning();

  res.json(updated);
});

// DELETE /projects/:projectId/quizzes/:quizId/rubric
router.delete("/projects/:projectId/quizzes/:quizId/rubric", async (req, res): Promise<void> => {
  const quizId = Number(req.params.quizId);
  if (!quizId || isNaN(quizId)) {
    res.status(400).json({ error: "Invalid quizId" });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [rubric] = await db
    .select()
    .from(rubricsTable)
    .where(eq(rubricsTable.quizId, quizId));

  if (!rubric) {
    res.status(404).json({ error: "Rubric not found" });
    return;
  }

  await db.delete(rubricsTable).where(eq(rubricsTable.id, rubric.id));
  res.status(204).send();
});

export default router;
