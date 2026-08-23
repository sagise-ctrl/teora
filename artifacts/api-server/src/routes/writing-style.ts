import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, writingStyleProfilesTable } from "@workspace/db";
import { callAI } from "../lib/ai";
import { styleCharacteristicsSchema } from "@workspace/db";
import { z } from "zod/v4";

const router: IRouter = Router();

// GET /users/me/writing-style
router.get("/users/me/writing-style", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const profile = await db
    .select()
    .from(writingStyleProfilesTable)
    .where(eq(writingStyleProfilesTable.userId, req.user.id))
    .orderBy(desc(writingStyleProfilesTable.analyzedAt))
    .limit(1);

  if (!profile.length) {
    res.status(404).json({ error: "No writing style profile found. Analyze your writing first." });
    return;
  }

  res.json(profile[0]);
});

// POST /users/me/writing-style/analyze — AI analyzes writing and creates style profile
router.post("/users/me/writing-style/analyze", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { documents, projectId } = req.body as {
    documents?: Array<{ title: string; content: string }>;
    projectId?: number;
  };

  if (!documents || !Array.isArray(documents) || documents.length === 0) {
    res.status(400).json({ error: "documents array is required with at least one document" });
    return;
  }

  const combinedText = documents
    .map((d) => `--- ${d.title} ---\n${d.content}`)
    .join("\n\n");

  const prompt = `Analyze the writing style of the following text and extract characteristics.
Return ONLY valid JSON (no markdown):

{
  "formality": 0.0-1.0 (0=informal chat, 1=formal academic),
  "vocabularyLevel": 0.0-1.0 (0=simple common words, 1=academic specialized),
  "avgSentenceLength": number (average words per sentence),
  "avgParagraphLength": number (average sentences per paragraph),
  "passiveVoiceRatio": 0.0-1.0 (ratio of passive voice sentences),
  "readabilityScore": 0-100 (Flesch readability score, higher = easier),
  "dominantTone": "neutral" | "persuasive" | "analytical" | "descriptive" | "critical",
  "commonPhrases": ["phrase1", "phrase2", "phrase3"],
  "structuralPatterns": ["pattern1", "pattern2", "pattern3"]
}

Text to analyze:
${combinedText.substring(0, 8000)}

IMPORTANT: Return ONLY the JSON object, no markdown code blocks.`;

  const messages = [{ role: "user" as const, content: prompt }];

  try {
    const aiResult = await callAI(messages, "analyze");
    const parsed = JSON.parse(aiResult.content);
    const characteristics = styleCharacteristicsSchema.parse(parsed);

    const [profile] = await db
      .insert(writingStyleProfilesTable)
      .values({
        userId: req.user.id,
        projectId: projectId ?? null,
        styleCharacteristics: characteristics,
        sampleSize: documents.length,
      })
      .returning();

    res.status(201).json(profile);
  } catch (err) {
    console.error("Writing style analysis error:", err);
    res.status(500).json({ error: "Failed to analyze writing style" });
  }
});

// PATCH /users/me/writing-style
router.patch("/users/me/writing-style", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [existing] = await db
    .select()
    .from(writingStyleProfilesTable)
    .where(eq(writingStyleProfilesTable.userId, req.user.id))
    .orderBy(desc(writingStyleProfilesTable.analyzedAt))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "No profile found" });
    return;
  }

  const { styleCharacteristics } = req.body as {
    styleCharacteristics?: z.infer<typeof styleCharacteristicsSchema>;
  };

  if (!styleCharacteristics) {
    res.status(400).json({ error: "styleCharacteristics is required" });
    return;
  }

  const [updated] = await db
    .update(writingStyleProfilesTable)
    .set({
      styleCharacteristics: styleCharacteristicsSchema.parse(styleCharacteristics),
      updatedAt: new Date(),
    })
    .where(eq(writingStyleProfilesTable.id, existing.id))
    .returning();

  res.json(updated);
});

export default router;
