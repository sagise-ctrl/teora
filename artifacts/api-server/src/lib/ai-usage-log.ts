import { db } from "@workspace/db";
import { aiUsageLogTable } from "@workspace/db";
import { logger } from "./logger.js";
import type { AIUsage } from "./ai.js";

const AI_MODEL = process.env.AI_MODEL ?? "gpt-4o-mini";
const AI_PROVIDER = process.env.AI_PROVIDER ?? "openai";

export async function logAIUsage(opts: {
  userId: string;
  projectId?: number | null;
  requestType: string;
  usage: AIUsage;
}): Promise<void> {
  try {
    await db.insert(aiUsageLogTable).values({
      userId: opts.userId,
      projectId: opts.projectId ?? null,
      model: AI_MODEL,
      provider: AI_PROVIDER,
      inputTokens: opts.usage.inputTokens,
      outputTokens: opts.usage.outputTokens,
      estimatedCostUsd: opts.usage.estimatedCostUsd,
      requestType: opts.requestType,
    });
  } catch (err) {
    // Non-fatal — don't break the user flow if logging fails
    logger.error({ err, userId: opts.userId, projectId: opts.projectId }, "Failed to write AI usage log");
  }
}
