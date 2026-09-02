import { Router, type IRouter, type Request } from "express";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import {
  db,
  aiUsageLogTable,
  usersTable,
} from "@workspace/db";

const router: IRouter = Router();

function getUserId(req: Request): string {
  if (!req.user?.id) throw new Error("User not authenticated");
  return req.user.id;
}

// GET /ai-usage — list usage records
router.get("/ai-usage", async (req, res): Promise<void> => {
  const userId = getUserId(req);

  const limit = Number(req.query.limit ?? 50);
  const offset = Number(req.query.offset ?? 0);
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
  const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;

  const conditions = [eq(aiUsageLogTable.userId, userId)];

  if (projectId !== undefined) {
    conditions.push(eq(aiUsageLogTable.projectId, projectId));
  }
  if (startDate) {
    conditions.push(gte(aiUsageLogTable.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(aiUsageLogTable.createdAt, endDate));
  }

  const whereClause = conditions.length === 1
    ? conditions[0]
    : and(...conditions);

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(aiUsageLogTable)
    .where(whereClause);

  const records = await db
    .select()
    .from(aiUsageLogTable)
    .where(whereClause)
    .orderBy(sql`created_at desc`)
    .limit(limit)
    .offset(offset);

  res.json({
    data: records.map((r) => ({
      ...r,
      estimatedCostUsd: Number(r.estimatedCostUsd),
    })),
    total: Number(totalResult?.count ?? 0),
  });
});

// GET /ai-usage/stats — aggregated stats
router.get("/ai-usage/stats", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;

  const conditions = [eq(aiUsageLogTable.userId, userId)];
  if (projectId !== undefined) {
    conditions.push(eq(aiUsageLogTable.projectId, projectId));
  }
  const whereClause = conditions.length === 1
    ? conditions[0]
    : and(...conditions);

  const records = await db
    .select({
      requestType: aiUsageLogTable.requestType,
      inputTokens: aiUsageLogTable.inputTokens,
      outputTokens: aiUsageLogTable.outputTokens,
      estimatedCostUsd: aiUsageLogTable.estimatedCostUsd,
    })
    .from(aiUsageLogTable)
    .where(whereClause);

  let totalRequests = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;
  const byRequestType: Record<string, { requests: number; inputTokens: number; outputTokens: number; costUsd: number }> = {};

  for (const r of records) {
    totalRequests += 1;
    totalInputTokens += r.inputTokens;
    totalOutputTokens += r.outputTokens;
    const cost = Number(r.estimatedCostUsd);
    totalCostUsd += cost;

    if (!byRequestType[r.requestType]) {
      byRequestType[r.requestType] = { requests: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    }
    byRequestType[r.requestType].requests += 1;
    byRequestType[r.requestType].inputTokens += r.inputTokens;
    byRequestType[r.requestType].outputTokens += r.outputTokens;
    byRequestType[r.requestType].costUsd += cost;
  }

  res.json({
    totalRequests,
    totalInputTokens,
    totalOutputTokens,
    totalCostUsd: Math.round(totalCostUsd * 1000000) / 1000000,
    byRequestType,
  });
});

export default router;
