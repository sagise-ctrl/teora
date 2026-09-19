import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, writingStyleProfilesTable, usersTable } from "@workspace/db";
import { callAI, getTierConfig, getTierForUser, checkTierAccess } from "../lib/ai.js";
import { logAIUsage } from "../lib/ai-usage-log.js";
import { checkAIAccess, consumeQuotaForAIRequest } from "../lib/subscription.js";
import { logger } from "../lib/logger.js";
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

  const { documents, projectId, tier: requestedTier } = req.body as {
    documents?: Array<{ title: string; content: string }>;
    projectId?: number;
    tier?: string;
  };

  if (!documents || !Array.isArray(documents) || documents.length === 0) {
    res.status(400).json({ error: "documents array is required with at least one document" });
    return;
  }

  // Resolve tier: use authorized requested tier or user's preferred
  const selectedTier = requestedTier
    ? await (async () => {
        const tier = await getTierConfig(requestedTier);
        if (!tier) return null;
        const authorized = await checkTierAccess(req.user!.id, requestedTier);
        return authorized ? tier : null;
      })()
    : await getTierForUser(req.user!.id, null);

  if (!selectedTier) {
    res.status(requestedTier ? 403 : 400).json({ error: requestedTier ? "Tier tidak diizinkan untuk paket Anda" : "Tier tidak valid" });
    return;
  }

  // Pre-check credit for paid tiers
  if (!selectedTier.isFree) {
    const estimatedCostCents = Math.max(
      100,
      selectedTier.pricePer1MInputCents + selectedTier.pricePer1MOutputCents,
    );
    const accessCheck = await checkAIAccess({
      userId: req.user!.id,
      tierId: selectedTier.id,
      estimatedCostCents,
      userEmail: req.user?.email,
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
    const aiResult = await callAI(messages, selectedTier.id);
    const parsed = JSON.parse(aiResult.content);
    const characteristics = styleCharacteristicsSchema.parse(parsed);

    const usageLog = await logAIUsage({
      userId: req.user!.id,
      projectId: projectId ?? null,
      requestType: "analyze_style",
      usage: aiResult.usage,
      tierConfig: aiResult.tierConfig,
    });

    // Expose method + saldoUsedCents in response for UX transparency
    let quotaInfo: { method: string; saldoUsedCents: number } | undefined;
    if (!selectedTier.isFree && aiResult.usage.costCents > 0) {
      const consumeResult = await consumeQuotaForAIRequest({
        userId: req.user!.id,
        tierId: selectedTier.id,
        inputTokens: aiResult.usage.inputTokens,
        outputTokens: aiResult.usage.outputTokens,
        costCents: aiResult.usage.costCents,
      });
      if (!consumeResult.allowed) {
        logger.warn(
          { userId: req.user!.id, reason: consumeResult.reason },
          "Quota/saldo exhausted during writing style analysis"
        );
      }
      quotaInfo = {
        method: consumeResult.method ?? "subscription",
        saldoUsedCents: consumeResult.method === "saldo" ? (consumeResult.deductCents ?? 0) : 0,
      };
    }

    const [profile] = await db
      .insert(writingStyleProfilesTable)
      .values({
        userId: req.user.id,
        projectId: projectId ?? null,
        styleCharacteristics: characteristics,
        sampleSize: documents.length,
      })
      .returning();

    res.status(201).json({ ...profile, ...(quotaInfo ?? {}) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "KONTEKS_TERLALU_PANJANG") {
      res.status(422).json({
        error: "Konteks terlalu panjang.",
        detail: "Dokumen terlalu panjang untuk menganalisis gaya penulisan.",
        code: "KONTEKS_TERLALU_PANJANG",
      });
      return;
    }
    logger.error({ err }, "Writing style analysis error");
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
