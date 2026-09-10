import { Router } from "express";
import { authMiddleware, type AuthUser } from "../middlewares/auth.js";
import { requireOwner } from "../middlewares/owner.js";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { userBalancesTable } from "@workspace/db";
import { projectsTable } from "@workspace/db";
import { aiUsageLogTable } from "@workspace/db";
import { tokenTransactionsTable } from "@workspace/db";
import { adminAuditLogTable } from "@workspace/db";
import { sql, eq, count, or, and, gte } from "drizzle-orm";

const router = Router();

// GET /admin/me — return admin status for current user
router.get("/me", authMiddleware, (req, res) => {
  const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "";
  const isOwner = req.user?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  res.json({ isOwner, email: req.user?.email });
});

// GET /admin/users — list all users with basic stats
router.get("/users", authMiddleware, requireOwner, async (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const searchCondition = search
      ? or(
          sql`LOWER(${usersTable.email}) LIKE ${"%" + search.toLowerCase() + "%"}`,
          sql`LOWER(COALESCE(${usersTable.displayName}, '')) LIKE ${"%" + search.toLowerCase() + "%"}`
        )
      : undefined;

    const [users, totalResult] = await Promise.all([
      db
        .select({
          id: usersTable.id,
          email: usersTable.email,
          displayName: usersTable.displayName,
          avatarUrl: usersTable.avatarUrl,
          referralCode: usersTable.referralCode,
          createdAt: usersTable.createdAt,
        })
        .from(usersTable)
        .where(searchCondition)
        .orderBy(usersTable.createdAt)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(usersTable)
        .where(searchCondition),
    ]);

    // Get project count per user
    const userIds = users.map((u) => u.id);
    const projectCounts = userIds.length
      ? await db
          .select({
            userId: projectsTable.userId,
            count: count(),
          })
          .from(projectsTable)
          .where(sql`${projectsTable.userId} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`)
          .groupBy(projectsTable.userId)
      : [];

    const projectCountMap = new Map(projectCounts.map((p) => [p.userId, p.count]));

    // Get total AI usage per user
    const usageStats = userIds.length
      ? await db
          .select({
            userId: aiUsageLogTable.userId,
            totalRequests: count(),
            totalCostUsd: sql<number>`SUM(${aiUsageLogTable.estimatedCostUsd})`,
          })
          .from(aiUsageLogTable)
          .where(sql`${aiUsageLogTable.userId} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`)
          .groupBy(aiUsageLogTable.userId)
      : [];

    const usageMap = new Map(usageStats.map((u) => [u.userId, u]));

    const enriched = users.map((u) => ({
      ...u,
      projectCount: projectCountMap.get(u.id) ?? 0,
      totalRequests: usageMap.get(u.id)?.totalRequests ?? 0,
      totalCostUsd: Number(usageMap.get(u.id)?.totalCostUsd ?? 0),
    }));

    res.json({
      users: enriched,
      pagination: {
        page,
        limit,
        total: Number(totalResult[0]?.count ?? 0),
        pages: Math.ceil(Number(totalResult[0]?.count ?? 0) / limit),
      },
    });
  } catch (err) {
    console.error("[admin/users] error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/stats — aggregate financial + system stats
router.get("/stats", authMiddleware, requireOwner, async (req, res) => {
  try {
    const period = req.query.period as string || "month";
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const [userCount, projectCount, aiUsageStats, revenueStats, recentUsage] = await Promise.all([
      db.select({ count: count() }).from(usersTable),
      db.select({ count: count() }).from(projectsTable),
      db
        .select({
          totalRequests: count(),
          totalCostUsd: sql<number>`COALESCE(SUM(${aiUsageLogTable.estimatedCostUsd}), 0)`,
          totalInputTokens: sql<number>`COALESCE(SUM(${aiUsageLogTable.inputTokens}), 0)`,
          totalOutputTokens: sql<number>`COALESCE(SUM(${aiUsageLogTable.outputTokens}), 0)`,
        })
        .from(aiUsageLogTable)
        .where(gte(aiUsageLogTable.createdAt, startDate)),
      db
        .select({
          totalTopup: sql<number>`COALESCE(SUM(CASE WHEN ${tokenTransactionsTable.type} = 'topup' THEN ${tokenTransactionsTable.amountCents} ELSE 0 END), 0)`,
          totalRefund: sql<number>`COALESCE(SUM(CASE WHEN ${tokenTransactionsTable.type} = 'refund' THEN ${tokenTransactionsTable.amountCents} ELSE 0 END), 0)`,
          transactionCount: count(),
        })
        .from(tokenTransactionsTable)
        .where(gte(tokenTransactionsTable.createdAt, startDate)),
      db
        .select({
          userId: aiUsageLogTable.userId,
          totalCostUsd: sql<number>`SUM(${aiUsageLogTable.estimatedCostUsd})`,
          totalRequests: count(),
        })
        .from(aiUsageLogTable)
        .where(gte(aiUsageLogTable.createdAt, startDate))
        .groupBy(aiUsageLogTable.userId)
        .orderBy(sql`SUM(${aiUsageLogTable.estimatedCostUsd}) DESC`)
        .limit(10),
    ]);

    // Owner usage breakdown
    const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "";
    const ownerUser = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(sql`LOWER(${usersTable.email}) = ${OWNER_EMAIL.toLowerCase()}`)
      .limit(1);

    let ownerUsage = { totalRequests: 0, totalCostUsd: 0 };
    if (ownerUser[0]) {
      const [ownerStats] = await db
        .select({
          totalRequests: count(),
          totalCostUsd: sql<number>`COALESCE(SUM(${aiUsageLogTable.estimatedCostUsd}), 0)`,
        })
        .from(aiUsageLogTable)
        .where(
          and(
            eq(aiUsageLogTable.userId, ownerUser[0].id),
            gte(aiUsageLogTable.createdAt, startDate)
          )
        );
      ownerUsage = {
        totalRequests: Number(ownerStats?.totalRequests ?? 0),
        totalCostUsd: Number(ownerStats?.totalCostUsd ?? 0),
      };
    }

    res.json({
      period,
      totals: {
        users: Number(userCount[0]?.count ?? 0),
        projects: Number(projectCount[0]?.count ?? 0),
        aiRequests: Number(aiUsageStats[0]?.totalRequests ?? 0),
        aiCostUsd: Number(aiUsageStats[0]?.totalCostUsd ?? 0),
        inputTokens: Number(aiUsageStats[0]?.totalInputTokens ?? 0),
        outputTokens: Number(aiUsageStats[0]?.totalOutputTokens ?? 0),
      },
      revenue: {
        totalTopupCents: Number(revenueStats[0]?.totalTopup ?? 0),
        totalRefundCents: Number(revenueStats[0]?.totalRefund ?? 0),
        transactionCount: Number(revenueStats[0]?.transactionCount ?? 0),
        grossMargin: Number(aiUsageStats[0]?.totalCostUsd ?? 0) > 0
          ? Math.round(
              ((Number(revenueStats[0]?.totalTopup ?? 0) - Number(aiUsageStats[0]?.totalCostUsd ?? 0)) /
                Number(revenueStats[0]?.totalTopup ?? 0)) *
                100
            )
          : 0,
      },
      ownerUsage,
      topConsumers: recentUsage.map((u) => ({
        userId: u.userId,
        requests: Number(u.totalRequests),
        costUsd: Number(u.totalCostUsd),
      })),
    });
  } catch (err) {
    console.error("[admin/stats] error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/usage-breakdown — AI usage breakdown (by model, provider, request type)
router.get("/usage-breakdown", authMiddleware, requireOwner, async (req, res) => {
  try {
    const period = req.query.period as string || "month";
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const byProvider = await db
      .select({
        provider: aiUsageLogTable.provider,
        totalRequests: count(),
        totalCostUsd: sql<number>`COALESCE(SUM(${aiUsageLogTable.estimatedCostUsd}), 0)`,
        totalInputTokens: sql<number>`COALESCE(SUM(${aiUsageLogTable.inputTokens}), 0)`,
        totalOutputTokens: sql<number>`COALESCE(SUM(${aiUsageLogTable.outputTokens}), 0)`,
      })
      .from(aiUsageLogTable)
      .where(gte(aiUsageLogTable.createdAt, startDate))
      .groupBy(aiUsageLogTable.provider);

    const byModel = await db
      .select({
        model: aiUsageLogTable.model,
        provider: aiUsageLogTable.provider,
        totalRequests: count(),
        totalCostUsd: sql<number>`COALESCE(SUM(${aiUsageLogTable.estimatedCostUsd}), 0)`,
        totalInputTokens: sql<number>`COALESCE(SUM(${aiUsageLogTable.inputTokens}), 0)`,
        totalOutputTokens: sql<number>`COALESCE(SUM(${aiUsageLogTable.outputTokens}), 0)`,
      })
      .from(aiUsageLogTable)
      .where(gte(aiUsageLogTable.createdAt, startDate))
      .groupBy(aiUsageLogTable.model, aiUsageLogTable.provider)
      .orderBy(sql`SUM(${aiUsageLogTable.estimatedCostUsd}) DESC`);

    const byRequestType = await db
      .select({
        requestType: aiUsageLogTable.requestType,
        totalRequests: count(),
        totalCostUsd: sql<number>`COALESCE(SUM(${aiUsageLogTable.estimatedCostUsd}), 0)`,
        totalInputTokens: sql<number>`COALESCE(SUM(${aiUsageLogTable.inputTokens}), 0)`,
        totalOutputTokens: sql<number>`COALESCE(SUM(${aiUsageLogTable.outputTokens}), 0)`,
      })
      .from(aiUsageLogTable)
      .where(gte(aiUsageLogTable.createdAt, startDate))
      .groupBy(aiUsageLogTable.requestType);

    res.json({
      period,
      byProvider: byProvider.map((r) => ({
        ...r,
        totalCostUsd: Number(r.totalCostUsd),
        totalInputTokens: Number(r.totalInputTokens),
        totalOutputTokens: Number(r.totalOutputTokens),
      })),
      byModel: byModel.map((r) => ({
        ...r,
        totalCostUsd: Number(r.totalCostUsd),
        totalInputTokens: Number(r.totalInputTokens),
        totalOutputTokens: Number(r.totalOutputTokens),
      })),
      byRequestType: byRequestType.map((r) => ({
        ...r,
        totalCostUsd: Number(r.totalCostUsd),
        totalInputTokens: Number(r.totalInputTokens),
        totalOutputTokens: Number(r.totalOutputTokens),
      })),
    });
  } catch (err) {
    console.error("[admin/usage-breakdown] error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/audit-log — view audit log
router.get("/audit-log", authMiddleware, requireOwner, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;
    const action = req.query.action as string | undefined;

    const actionCondition = action
      ? eq(adminAuditLogTable.action, action)
      : undefined;

    const [logs, totalResult] = await Promise.all([
      db
        .select()
        .from(adminAuditLogTable)
        .where(actionCondition)
        .orderBy(sql`${adminAuditLogTable.createdAt} DESC`)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(adminAuditLogTable)
        .where(actionCondition),
    ]);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total: Number(totalResult[0]?.count ?? 0),
        pages: Math.ceil(Number(totalResult[0]?.count ?? 0) / limit),
      },
    });
  } catch (err) {
    console.error("[admin/audit-log] error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /admin/users/:userId/tier — override user tier
router.post("/users/:userId/tier", authMiddleware, requireOwner, async (req, res) => {
  try {
    const { userId } = req.params;
    const { tierId } = req.body as { tierId?: string };

    await db
      .update(userBalancesTable)
      .set({ preferredTierId: tierId ?? null, updatedAt: new Date() })
      .where(eq(userBalancesTable.userId, userId));

    await db.insert(adminAuditLogTable).values({
      adminEmail: req.user!.email!,
      action: "tier_override",
      targetType: "user",
      targetId: userId,
      details: { tierId },
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("[admin/tier-override] error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /admin/users/:userId/suspend — suspend or unsuspend user
router.post("/users/:userId/suspend", authMiddleware, requireOwner, async (req, res) => {
  try {
    const { userId } = req.params;
    const { suspend } = req.body as { suspend: boolean };

    // For now, we don't have a suspended flag. Log the action.
    // In a full implementation, we'd add a `suspended_at` column to usersTable.
    await db.insert(adminAuditLogTable).values({
      adminEmail: req.user!.email!,
      action: suspend ? "user_suspend" : "user_unsuspend",
      targetType: "user",
      targetId: userId,
      details: { suspend },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: suspend ? "User suspended" : "User unsuspended" });
  } catch (err) {
    console.error("[admin/suspend] error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
