import { Router, type IRouter } from "express";
import { eq, and, gte, sql, desc, lte } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  aiUsageLogTable,
  usersTable,
  subscriptionsTable,
  packagesTable,
  usageWindowsTable,
} from "@workspace/db";
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
  /** Yang benar-benar dipotong dari saldo user, dalam IDR cents. */
  costCents: number;
};

function emptyBreakdown(): UsageBreakdown {
  return { requests: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, costCents: 0 };
}

function aggregateRecords(records: Array<{
  requestType: string;
  projectId: number | null;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  costCents: number;
}>, groupByProject = false) {
  let totalRequests = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;
  let totalCostCents = 0;
  const byRequestType: Record<string, UsageBreakdown> = {};
  const byProject: Record<number, UsageBreakdown> = {};

  for (const r of records) {
    totalRequests += 1;
    totalInputTokens += r.inputTokens;
    totalOutputTokens += r.outputTokens;
    const cost = Number(r.estimatedCostUsd);
    const cents = Number(r.costCents) || 0;
    totalCostUsd += cost;
    totalCostCents += cents;

    if (!byRequestType[r.requestType]) {
      byRequestType[r.requestType] = emptyBreakdown();
    }
    byRequestType[r.requestType].requests += 1;
    byRequestType[r.requestType].inputTokens += r.inputTokens;
    byRequestType[r.requestType].outputTokens += r.outputTokens;
    byRequestType[r.requestType].costUsd += cost;
    byRequestType[r.requestType].costCents += cents;

    if (groupByProject && r.projectId !== null) {
      if (!byProject[r.projectId]) {
        byProject[r.projectId] = emptyBreakdown();
      }
      byProject[r.projectId].requests += 1;
      byProject[r.projectId].inputTokens += r.inputTokens;
      byProject[r.projectId].outputTokens += r.outputTokens;
      byProject[r.projectId].costUsd += cost;
      byProject[r.projectId].costCents += cents;
    }
  }

  return {
    totalRequests,
    totalInputTokens,
    totalOutputTokens,
    totalCostUsd: Math.round(totalCostUsd * 1_000_000) / 1_000_000,
    totalCostCents,
    byRequestType,
    byProject,
  };
}

// GET /users/me/usage — user's own usage stats with period filter
router.get("/users/me/usage", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = periodSchema.safeParse(req.query.period);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid period. Use: 7d, 30d, or all" });
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
      costCents: aiUsageLogTable.costCents,
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
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const projectId = Number(req.params.projectId);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const records = await db
    .select({
      requestType: aiUsageLogTable.requestType,
      inputTokens: aiUsageLogTable.inputTokens,
      outputTokens: aiUsageLogTable.outputTokens,
      estimatedCostUsd: aiUsageLogTable.estimatedCostUsd,
      costCents: aiUsageLogTable.costCents,
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
  let totalCostCents = 0;

  for (const r of records) {
    totalRequests += 1;
    totalInputTokens += r.inputTokens;
    totalOutputTokens += r.outputTokens;
    const cost = Number(r.estimatedCostUsd);
    const cents = Number(r.costCents) || 0;
    totalCostUsd += cost;
    totalCostCents += cents;

    if (!byRequestType[r.requestType]) {
      byRequestType[r.requestType] = emptyBreakdown();
    }
    byRequestType[r.requestType].requests += 1;
    byRequestType[r.requestType].inputTokens += r.inputTokens;
    byRequestType[r.requestType].outputTokens += r.outputTokens;
    byRequestType[r.requestType].costUsd += cost;
    byRequestType[r.requestType].costCents += cents;
  }

  res.json({
    projectId,
    totalRequests,
    totalInputTokens,
    totalOutputTokens,
    totalCostUsd: Math.round(totalCostUsd * 1_000_000) / 1_000_000,
    totalCostCents,
    byRequestType,
  });
});

// GET /admin/usage — aggregated admin stats
router.get("/admin/usage", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
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
    res.status(400).json({ error: "Invalid period. Use: 7d, 30d, or all" });
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

// GET /users/me/usage/daily — daily aggregated usage for the last N days
router.get("/users/me/usage/daily", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const days = Math.min(Math.max(Number(req.query.days ?? "7"), 1), 30);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  // Approximate token→hours: ~100 tokens/message × 5 min/message = 12 msg/hour
  const TOKENS_PER_HOUR = 12 * 100;

  const dailyRaw = await db
    .select({
      date: sql<string>`date(${aiUsageLogTable.createdAt})`,
      totalTokens: sql<number>`sum(${aiUsageLogTable.inputTokens} + ${aiUsageLogTable.outputTokens})`,
      totalCostCents: sql<number>`coalesce(sum(${aiUsageLogTable.costCents}), 0)`,
      requestCount: sql<number>`count(*)`,
    })
    .from(aiUsageLogTable)
    .where(
      and(
        eq(aiUsageLogTable.userId, req.user!.id),
        gte(aiUsageLogTable.createdAt, cutoff),
      ),
    )
    .groupBy(sql`date(${aiUsageLogTable.createdAt})`)
    .orderBy(desc(sql`date(${aiUsageLogTable.createdAt})`));

  const history = dailyRaw.map((r) => ({
    date: String(r.date),
    tokens: Number(r.totalTokens) || 0,
    hours: Math.round((Number(r.totalTokens) || 0) / TOKENS_PER_HOUR * 10) / 10,
    costCents: Number(r.totalCostCents) || 0,
    requestCount: Number(r.requestCount) || 0,
  }));

  res.json({ days, history });
});

// GET /users/me/usage/windows — current 5h/7d quota windows with hours approximation
router.get("/users/me/usage/windows", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user!.id;

  const now = new Date();
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.userId, userId),
        eq(subscriptionsTable.status, "active" as const),
        lte(subscriptionsTable.startsAt, now),
        gte(subscriptionsTable.expiresAt, now),
      ),
    )
    .limit(1);

  if (!sub) {
    res.json({ subscription: null, windows5h: null, windows7d: null });
    return;
  }

  const [pkg] = await db
    .select()
    .from(packagesTable)
    .where(eq(packagesTable.id, sub.packageId))
    .limit(1);

  const windows = await db
    .select()
    .from(usageWindowsTable)
    .where(eq(usageWindowsTable.subscriptionId, sub.id));

  // 5h window: sum all 5h windows for current period
  const windows5h = windows.filter((w) => w.windowType === "5h");
  const totalHaiku5h = windows5h.reduce((sum, w) => sum + Number(w.haikuTokensUsed), 0);
  const totalSonnet5h = windows5h.reduce((sum, w) => sum + Number(w.sonnetTokensUsed), 0);
  const capHaiku5h = pkg?.quota5hHaikuTokens ?? 0;
  const capSonnet5h = pkg?.quota5hSonnetTokens ?? 0;
  const usedTokens5h = totalHaiku5h + totalSonnet5h;
  const limitTokens5h = capHaiku5h + capSonnet5h;

  // 7d window: sum all 7d windows
  const windows7d = windows.filter((w) => w.windowType === "7d");
  const totalHaiku7d = windows7d.reduce((sum, w) => sum + Number(w.haikuTokensUsed), 0);
  const totalSonnet7d = windows7d.reduce((sum, w) => sum + Number(w.sonnetTokensUsed), 0);
  const capHaiku7d = pkg?.quota7dHaikuTokens ?? 0;
  const capSonnet7d = pkg?.quota7dSonnetTokens ?? 0;
  const usedTokens7d = totalHaiku7d + totalSonnet7d;
  const limitTokens7d = capHaiku7d + capSonnet7d;

  // Approx: 100 tokens/message × 5 min = 12 msg/h → 1h ≈ 100 tokens for quick heuristic
  // Use costCents as more reliable: avg ~Rp50/message → 12 msg/h → Rp600/h
  const RP_PER_HOUR = 600; // conservative estimate

  // Reset times: next window boundary
  const nextReset5h = windows5h[0]
    ? windows5h[0].windowEndAt
    : new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
  const nextReset7d = windows7d[0]
    ? windows7d[0].windowEndAt
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  res.json({
    subscription: sub
      ? {
          id: sub.id,
          packageName: pkg?.tierName ?? null,
          packageTier: pkg?.tier ?? null,
          expiresAt: sub.expiresAt,
          modelType: pkg?.modelType ?? null,
        }
      : null,
    windows5h: {
      usedTokens: usedTokens5h,
      limitTokens: limitTokens5h,
      usedHours: Math.round(usedTokens5h / 100 / 12 * 10) / 10,
      limitHours: Math.round(limitTokens5h / 100 / 12 * 10) / 10,
      costCents: windows5h.reduce((sum, w) => sum + Number(w.costCents), 0),
      pct: limitTokens5h > 0 ? Math.min(100, Math.round((usedTokens5h / limitTokens5h) * 100)) : 0,
      resetAt: nextReset5h,
    },
    windows7d: {
      usedTokens: usedTokens7d,
      limitTokens: limitTokens7d,
      usedHours: Math.round(usedTokens7d / 100 / 12 * 10) / 10,
      limitHours: Math.round(limitTokens7d / 100 / 12 * 10) / 10,
      costCents: windows7d.reduce((sum, w) => sum + Number(w.costCents), 0),
      pct: limitTokens7d > 0 ? Math.min(100, Math.round((usedTokens7d / limitTokens7d) * 100)) : 0,
      resetAt: nextReset7d,
    },
  });
});

export default router;
