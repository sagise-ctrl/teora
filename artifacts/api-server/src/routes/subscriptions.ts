import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { eq, and, lte, gte } from "drizzle-orm";
import {
  db,
  subscriptionsTable,
  packagesTable,
  usageWindowsTable,
} from "@workspace/db";

const router: IRouter = Router();

const createSubscriptionSchema = z.object({
  packageId: z.string().min(1),
  autoRenew: z.boolean().default(false),
});

function formatPackage(pkg: {
  id: string;
  tier: string;
  tierName: string;
  tierDisplayOrder: number;
  modelType: string;
  modelTypeName: string;
  periodDays: number;
  periodName: string;
  quota7dHaikuTokens: number;
  quota5hHaikuTokens: number;
  quota7dSonnetTokens: number;
  quota5hSonnetTokens: number;
  priceCents: number;
  isHighlighted: boolean;
  isDefault: boolean;
}) {
  return {
    id: pkg.id,
    tier: pkg.tier,
    tierName: pkg.tierName,
    tierDisplayOrder: pkg.tierDisplayOrder,
    modelType: pkg.modelType,
    modelTypeName: pkg.modelTypeName,
    periodDays: pkg.periodDays,
    periodName: pkg.periodName,
    quota7dHaikuTokens: pkg.quota7dHaikuTokens,
    quota5hHaikuTokens: pkg.quota5hHaikuTokens,
    quota7dSonnetTokens: pkg.quota7dSonnetTokens,
    quota5hSonnetTokens: pkg.quota5hSonnetTokens,
    priceCents: pkg.priceCents,
    priceDisplay: pkg.priceCents.toLocaleString("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }),
    isHighlighted: pkg.isHighlighted,
    isDefault: pkg.isDefault,
  };
}

// GET /users/me/subscription — Get current user's active subscription with usage windows
router.get("/users/me/subscription", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user!.id;

  // Find active subscription
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
    res.json({ subscription: null, usageWindows: [], maxWindows: 0 });
    return;
  }

  // Load package
  const [pkg] = await db
    .select()
    .from(packagesTable)
    .where(eq(packagesTable.id, sub.packageId))
    .limit(1);

  // Load usage windows
  const windows = await db
    .select()
    .from(usageWindowsTable)
    .where(eq(usageWindowsTable.subscriptionId, sub.id));

  // Compute max windows from periodDays
  const maxWindows = pkg ? Math.floor(pkg.periodDays / 7) : 0;

  const formattedWindows = windows.map((w) => {
    const is5h = w.windowType === "5h";
    const quotaHaiku = is5h
      ? pkg?.quota5hHaikuTokens ?? 0
      : pkg?.quota7dHaikuTokens ?? 0;
    const quotaSonnet = is5h
      ? pkg?.quota5hSonnetTokens ?? 0
      : pkg?.quota7dSonnetTokens ?? 0;

    const pctHaiku =
      quotaHaiku > 0
        ? Math.round((w.haikuTokensUsed / quotaHaiku) * 100)
        : 0;
    const pctSonnet =
      quotaSonnet > 0
        ? Math.round((w.sonnetTokensUsed / quotaSonnet) * 100)
        : 0;

    const isActive =
      new Date(w.windowStartAt) <= now && new Date(w.windowEndAt) >= now;

    return {
      id: w.id,
      modelType: w.modelType,
      windowType: w.windowType,
      windowNumber: w.windowNumber,
      windowStartAt: w.windowStartAt,
      windowEndAt: w.windowEndAt,
      haikuTokensUsed: w.haikuTokensUsed,
      sonnetTokensUsed: w.sonnetTokensUsed,
      quotaHaikuTokens: quotaHaiku,
      quotaSonnetTokens: quotaSonnet,
      pctHaiku: Math.min(pctHaiku, 100),
      pctSonnet: Math.min(pctSonnet, 100),
      isExhausted: w.isExhausted,
      isActive,
    };
  });

  res.json({
    subscription: {
      id: sub.id,
      package: pkg ? formatPackage(pkg) : null,
      status: sub.status,
      startsAt: sub.startsAt,
      expiresAt: sub.expiresAt,
      autoRenew: sub.autoRenew,
      usageAnchorAt: sub.usageAnchorAt,
    },
    usageWindows: formattedWindows,
    maxWindows,
  });
});

// POST /users/me/subscription — Create a new subscription (payment stub)
router.post("/users/me/subscription", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user!.id;

  const parsed = createSubscriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.format() });
    return;
  }
  const { packageId, autoRenew } = parsed.data;

  // Validate package exists and is active
  const [pkg] = await db
    .select()
    .from(packagesTable)
    .where(and(eq(packagesTable.id, packageId), eq(packagesTable.isActive, true)))
    .limit(1);

  if (!pkg) {
    res.status(400).json({ error: "Invalid or inactive packageId" });
    return;
  }

  // Check for existing active subscription
  const now = new Date();
  const [existing] = await db
    .select({ id: subscriptionsTable.id })
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

  if (existing) {
    res
      .status(409)
      .json({
        error: "Active subscription already exists. Only one active subscription per user is allowed.",
      });
    return;
  }

  // Payment stub: gateway not implemented yet
  res.status(402).json({
    error: "Payment gateway not configured yet. Please contact support to subscribe.",
  });
});

export default router;
