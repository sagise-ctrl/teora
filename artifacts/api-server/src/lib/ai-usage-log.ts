import { db } from "@workspace/db";
import { aiUsageLogTable } from "@workspace/db";
import { logger } from "./logger.js";
import type { AIUsage, AITierConfig } from "./ai.js";

export async function logAIUsage(opts: {
  userId: string;
  projectId?: number | null;
  requestType: string;
  usage: AIUsage;
  tierConfig: AITierConfig;
}): Promise<{ id: number } | null> {
  try {
    const [log] = await db
      .insert(aiUsageLogTable)
      .values({
        userId: opts.userId,
        projectId: opts.projectId ?? null,
        tierId: opts.usage.tierId,
        model: opts.tierConfig.model,
        provider: opts.tierConfig.provider,
        inputTokens: opts.usage.inputTokens,
        outputTokens: opts.usage.outputTokens,
        estimatedCostUsd: opts.usage.estimatedCostUsd,
        costCents: opts.usage.costCents,
        requestType: opts.requestType,
      })
      .returning({ id: aiUsageLogTable.id });

    return log ?? null;
  } catch (err) {
    // Non-fatal — don't break the user flow if logging fails
    logger.error({ err, userId: opts.userId, projectId: opts.projectId }, "Failed to write AI usage log");
    return null;
  }
}
