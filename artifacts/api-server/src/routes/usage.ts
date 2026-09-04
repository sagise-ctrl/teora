import { Router, type IRouter } from "express";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { db, aiUsageLogTable, usersTable } from "@workspace/db";
import { authMiddleware } from "../middlewares/auth.js";

const router: IRouter = Router();

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

// Zod schemas
const periodSchema = z.enum(["7d", "30d", "all"]).default("all");

function buildPeriodCondition(period: z.infer<typeof periodSchema>) {
  if (period === "all") return undefined;
  const days = period === "7d" ? 7 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return gte(aiUsageLogTable.createdAt, cutoff);
}

type UsageBreakdown = {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

function aggregateRecords(records: Array<{
  requestType: string;
  projectId: number | null;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}>, groupByProject = false) {
  let totalRequests = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;
  const byRequestType: Record<string, UsageBreakdown> = {};
  const byProject: Record<number, UsageBreakdown> = {};

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

    if (groupByProject && r.projectId !== null) {
      if (!byProject[r.projectId]) {
        byProject[r.projectId] = { requests: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
      }
      byProject[r.projectId].requests += 1;
      byProject[r.projectId].inputTokens += r.inputTokens;
      byProject[r.projectId].outputTokens += r.outputTokens;
      byProject[r.projectId].costUsd += cost;
    }
  }

  return {
    totalRequests,
    totalInputTokens,
    totalOutputTokens,
    totalCostUsd: Math.round(totalCostUsd * 1_000_000) / 1_000_000,
    byRequestType,
    byProject,
  };
}

// GET /users/me/usage — user's own usage stats with period filter
router.get("/users/me/usage", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const parsed = periodSchema.safeParse(req.query.period);
  if (!parsed.success) {
    res.status(400).json({ error: "Periode tidak valid. Gunakan: 7d, 30d, atau all." });
    return;
  }
  const period = parsed.data;

  const conditions = [eq(aiUsageLogTable.userId, req.user.id)];
  const periodCond = buildPeriodCondition(period);
  if (periodCond) conditions.push(periodCond);

  const records = await db
    .select({
      requestType: aiUsageLogTable.requestType,
      projectId: aiUsageLogTable.projectId,
      inputTokens: aiUsageLogTable.inputTokens,
      outputTokens: aiUsageLogTable.outputTokens,
      estimatedCostUsd: aiUsageLogTable.estimatedCostUsd,
    })
    .from(aiUsageLogTable)
    .where(and(...conditions));

  const aggregated = aggregateRecords(records, true);

  res.json({
    ...aggregated,
    period,
  });
});

// GET /users/me/usage/projects/:projectId — per-project token breakdown
router.get("/users/me/usage/projects/:projectId", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const projectId = Number(req.params.projectId);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "ID proyek tidak valid." });
    return;
  }

  const records = await db
    .select({
      requestType: aiUsageLogTable.requestType,
      inputTokens: aiUsageLogTable.inputTokens,
      outputTokens: aiUsageLogTable.outputTokens,
      estimatedCostUsd: aiUsageLogTable.estimatedCostUsd,
    })
    .from(aiUsageLogTable)
    .where(
      and(
        eq(aiUsageLogTable.userId, req.user.id),
        eq(aiUsageLogTable.projectId, projectId)
      )
    );

  const byRequestType: Record<string, UsageBreakdown> = {};
  let totalRequests = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;

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
    projectId,
    totalRequests,
    totalInputTokens,
    totalOutputTokens,
    totalCostUsd: Math.round(totalCostUsd * 1_000_000) / 1_000_000,
    byRequestType,
  });
});

// GET /admin/usage — aggregated admin stats
router.get("/admin/usage", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  // Admin check: user must have admin role
  const [userRecord] = await db
    .select({ isOwner: usersTable.isOwner })
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id))
    .limit(1);

  if (!userRecord?.isOwner) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const parsed = periodSchema.safeParse(req.query.period);
  if (!parsed.success) {
    res.status(400).json({ error: "Periode tidak valid. Gunakan: 7d, 30d, atau all." });
    return;
  }
  const period = parsed.data;

  const conditions: ReturnType<typeof gte>[] = [];
  const periodCond = buildPeriodCondition(period);
  if (periodCond) conditions.push(periodCond);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Per-user stats
  const perUserRaw = await db
    .select({
      userId: aiUsageLogTable.userId,
      email: usersTable.email,
      totalRequests: sql<number>`count(*)`,
      totalInputTokens: sql<number>`sum(${aiUsageLogTable.inputTokens})`,
      totalOutputTokens: sql<number>`sum(${aiUsageLogTable.outputTokens})`,
      totalCostUsd: sql<number>`sum(${aiUsageLogTable.estimatedCostUsd})`,
    })
    .from(aiUsageLogTable)
    .leftJoin(usersTable, eq(aiUsageLogTable.userId, usersTable.id))
    .where(whereClause)
    .groupBy(aiUsageLogTable.userId, usersTable.email)
    .orderBy(desc(sql`sum(${aiUsageLogTable.estimatedCostUsd})`));

  const perUser = perUserRaw.map((r) => ({
    userId: r.userId,
    email: r.email ?? "unknown",
    totalRequests: Number(r.totalRequests),
    totalInputTokens: Number(r.totalInputTokens) || 0,
    totalOutputTokens: Number(r.totalOutputTokens) || 0,
    totalCostUsd: Math.round(Number(r.totalCostUsd) * 1_000_000) / 1_000_000,
  }));

  // Per-provider stats
  const perProviderRaw = await db
    .select({
      provider: aiUsageLogTable.provider,
      totalRequests: sql<number>`count(*)`,
      totalInputTokens: sql<number>`sum(${aiUsageLogTable.inputTokens})`,
      totalOutputTokens: sql<number>`sum(${aiUsageLogTable.outputTokens})`,
      totalCostUsd: sql<number>`sum(${aiUsageLogTable.estimatedCostUsd})`,
    })
    .from(aiUsageLogTable)
    .where(whereClause)
    .groupBy(aiUsageLogTable.provider);

  const perProvider = perProviderRaw.map((r) => ({
    provider: r.provider,
    totalRequests: Number(r.totalRequests),
    totalInputTokens: Number(r.totalInputTokens) || 0,
    totalOutputTokens: Number(r.totalOutputTokens) || 0,
    totalCostUsd: Math.round(Number(r.totalCostUsd) * 1_000_000) / 1_000_000,
  }));

  // Top users by spend
  const topUsersBySpend = [...perUser]
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd)
    .slice(0, 10)
    .map((r) => ({ userId: r.userId, email: r.email, totalCostUsd: r.totalCostUsd }));

  // Daily totals
  const dailyTotalsRaw = await db
    .select({
      date: sql<string>`date(${aiUsageLogTable.createdAt})`,
      totalRequests: sql<number>`count(*)`,
      totalInputTokens: sql<number>`sum(${aiUsageLogTable.inputTokens})`,
      totalOutputTokens: sql<number>`sum(${aiUsageLogTable.outputTokens})`,
      totalCostUsd: sql<number>`sum(${aiUsageLogTable.estimatedCostUsd})`,
    })
    .from(aiUsageLogTable)
    .where(whereClause)
    .groupBy(sql`date(${aiUsageLogTable.createdAt})`)
    .orderBy(desc(sql`date(${aiUsageLogTable.createdAt})`));

  const dailyTotals = dailyTotalsRaw.map((r) => ({
    date: String(r.date),
    totalRequests: Number(r.totalRequests),
    totalInputTokens: Number(r.totalInputTokens) || 0,
    totalOutputTokens: Number(r.totalOutputTokens) || 0,
    totalCostUsd: Math.round(Number(r.totalCostUsd) * 1_000_000) / 1_000_000,
  }));

  // Grand totals
  const [grandTotals] = await db
    .select({
      totalRequests: sql<number>`count(*)`,
      totalInputTokens: sql<number>`sum(${aiUsageLogTable.inputTokens})`,
      totalOutputTokens: sql<number>`sum(${aiUsageLogTable.outputTokens})`,
      totalCostUsd: sql<number>`sum(${aiUsageLogTable.estimatedCostUsd})`,
    })
    .from(aiUsageLogTable)
    .where(whereClause);

  res.json({
    period,
    totalRequests: Number(grandTotals?.totalRequests ?? 0),
    totalInputTokens: Number(grandTotals?.totalInputTokens ?? 0),
    totalOutputTokens: Number(grandTotals?.totalOutputTokens ?? 0),
    totalCostUsd: Math.round(Number(grandTotals?.totalCostUsd ?? 0) * 1_000_000) / 1_000_000,
    perUser,
    perProvider,
    topUsersBySpend,
    dailyTotals,
  });
});

export default router;
