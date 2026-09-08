/**
 * Subscription business logic — rolling window quota enforcement.
 *
 * Core concepts:
 * - Anchored rolling windows: T0 = subscription.usageAnchorAt
 *   - 5h window: resets every 5 hours from T0
 *   - 7d window: resets every 7 days from T0
 * - One usage window row per (subscription_id, model_type, window_type)
 * - Tokens accumulate from AI requests; caps come from the package
 * - When subscription quota exhausted, autofallback to saldo (if enabled)
 */

import { db } from "@workspace/db";
import {
  subscriptionsTable,
  packagesTable,
  usageWindowsTable,
  userBalancesTable,
  tokenTransactionsTable,
  type WindowType,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { addHours, addDays, isAfter } from "date-fns";
import { logger } from "./logger.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuotaResult =
  | { allowed: true; method: "subscription"; windowId: string }
  | { allowed: true; method: "saldo"; deductCents: number }
  | {
      allowed: false;
      reason: "quota_exhausted";
      subscriptionActive: boolean;
    }
  | {
      allowed: false;
      reason: "saldo_insufficient";
      balanceCents: number;
      requiredCents: number;
    };

export interface UsageWindowSummary {
  modelType: string;
  windowType: WindowType;
  windowNumber: number;
  windowStartAt: Date;
  windowEndAt: Date;
  haikuTokensUsed: number;
  sonnetTokensUsed: number;
  costCents: number;
  isExhausted: boolean;
  isOverLimit: boolean;
  capHaikuTokens: number;
  capSonnetTokens: number;
}

// ---------------------------------------------------------------------------
// Helper: calculate window start time from anchor
// ---------------------------------------------------------------------------

/**
 * Returns the start time of a given window number given the anchor.
 *
 * 5h windows: sub-windows within the 7d window. Reset every 5h from anchor.
 *   window N starts at anchor + (N-1) * 5 hours
 * 7d windows: reset every 7 days from anchor.
 *   window N starts at anchor + (N-1) * 7 days
 */
export function calculateWindowStart(
  anchorAt: Date,
  windowNumber: number,
  windowType: "5h" | "7d"
): Date {
  if (windowNumber < 1) windowNumber = 1;

  if (windowType === "5h") {
    return addHours(anchorAt, (windowNumber - 1) * 5);
  } else {
    return addDays(anchorAt, (windowNumber - 1) * 7);
  }
}

/**
 * Returns the maximum window number for a given period and window type.
 * e.g., 30-day subscription + "5h" → Math.floor(30 * 24 / 5) = 144 windows
 *       30-day subscription + "7d" → Math.floor(30 / 7) = 4 windows
 */
export function getMaxWindows(
  periodDays: number,
  windowType: "5h" | "7d"
): number {
  if (windowType === "5h") {
    return Math.floor((periodDays * 24) / 5);
  } else {
    return Math.floor(periodDays / 7);
  }
}

// ---------------------------------------------------------------------------
// 1. getUserActiveSubscription
// ---------------------------------------------------------------------------

/**
 * Returns the user's active subscription with package details, or null.
 * Only one active subscription per user is expected (enforced by business logic).
 */
export async function getUserActiveSubscription(
  userId: string
): Promise<{
  subscription: (typeof subscriptionsTable.$inferSelect & {
    package: typeof packagesTable.$inferSelect;
  }) | null;
}> {
  const rows = await db
    .select()
    .from(subscriptionsTable)
    .innerJoin(
      packagesTable,
      eq(subscriptionsTable.packageId, packagesTable.id)
    )
    .where(
      and(
        eq(subscriptionsTable.userId, userId),
        eq(subscriptionsTable.status, "active" as const)
      )
    )
    .orderBy(desc(subscriptionsTable.createdAt))
    .limit(1);

  if (rows.length === 0) {
    return { subscription: null };
  }

  const row = rows[0];
  return {
    subscription: {
      ...row.subscriptions,
      package: row.packages,
    },
  };
}

// ---------------------------------------------------------------------------
// 2. getActiveUsageWindow
// ---------------------------------------------------------------------------

/**
 * Returns the current active usage window for a user/subscription/model/window combo.
 * Creates it if it doesn't exist (initializing usageAnchorAt if needed).
 *
 * Handles window rollover: if current window is exhausted and past windowEndAt,
 * advances to the next window.
 */
export async function getActiveUsageWindow(
  userId: string,
  subscriptionId: string,
  modelType: string,
  windowType: "5h" | "7d"
): Promise<{ window: typeof usageWindowsTable.$inferSelect; wasCreated: boolean }> {
  // Load subscription to get anchor and period
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.id, subscriptionId));

  if (!sub) {
    throw new Error(`Subscription ${subscriptionId} not found`);
  }

  const anchorAt =
    sub.usageAnchorAt ?? sub.startsAt;

  // Determine current window number
  const now = new Date();
  let windowNumber = 1;

  if (windowType === "5h") {
    const elapsedMs = now.getTime() - anchorAt.getTime();
    const elapsed5hSlots = elapsedMs / (5 * 60 * 60 * 1000);
    windowNumber = Math.max(1, Math.floor(elapsed5hSlots) + 1);
  } else {
    const elapsedMs = now.getTime() - anchorAt.getTime();
    const elapsed7dSlots = elapsedMs / (7 * 24 * 60 * 60 * 1000);
    windowNumber = Math.max(1, Math.floor(elapsed7dSlots) + 1);
  }

  // Check if there's already an active window for this number
  const [existing] = await db
    .select()
    .from(usageWindowsTable)
    .where(
      and(
        eq(usageWindowsTable.subscriptionId, subscriptionId),
        eq(usageWindowsTable.modelType, modelType),
        eq(usageWindowsTable.windowType, windowType),
        eq(usageWindowsTable.windowNumber, windowNumber)
      )
    );

  if (existing && !existing.isExhausted) {
    // If window exists but is past its end, mark it exhausted and return it
    if (isAfter(now, existing.windowEndAt)) {
      await db
        .update(usageWindowsTable)
        .set({ isExhausted: true, updatedAt: now })
        .where(eq(usageWindowsTable.id, existing.id));
      return { window: { ...existing, isExhausted: true }, wasCreated: false };
    }
    return { window: existing, wasCreated: false };
  }

  // Handle rollover: exhausted + past windowEndAt → next window
  if (existing && existing.isExhausted && isAfter(now, existing.windowEndAt)) {
    windowNumber = existing.windowNumber + 1;
  }

  // Cap window number to subscription period
  const periodDays = Math.ceil(
    (sub.expiresAt.getTime() - sub.startsAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  const maxWindows = getMaxWindows(periodDays, windowType);
  if (windowNumber > maxWindows) {
    windowNumber = maxWindows;
  }

  // Compute window boundaries
  const windowStartAt = calculateWindowStart(anchorAt, windowNumber, windowType);
  const windowEndAt =
    windowType === "5h"
      ? addHours(windowStartAt, 5)
      : addHours(windowStartAt, 168); // 7d = 168 hours

  // Create the window
  const [newWindow] = await db
    .insert(usageWindowsTable)
    .values({
      subscriptionId,
      userId,
      modelType,
      windowType,
      windowNumber,
      windowStartAt,
      windowEndAt,
      haikuTokensUsed: 0,
      sonnetTokensUsed: 0,
      costCents: 0,
      isExhausted: false,
      isOverLimit: false,
    })
    .returning();

  return { window: newWindow, wasCreated: true };
}

// ---------------------------------------------------------------------------
// 3. checkQuotaAndAccumulate
// ---------------------------------------------------------------------------

/**
 * Core quota enforcement function. Called before every AI request.
 *
 * Returns:
 * - { allowed: true, method: "subscription", windowId } when subscription quota covers it
 * - { allowed: true, method: "saldo", deductCents } when autofallback to saldo
 * - { allowed: false, reason: "quota_exhausted" } when no quota available
 * - { allowed: false, reason: "saldo_insufficient" } when saldo can't cover either
 */
export async function checkQuotaAndAccumulate(params: {
  userId: string;
  subscriptionId: string;
  packageId: string;
  modelType: string;
  haikuTokensUsed: number;
  sonnetTokensUsed: number;
  costCents: number;
}): Promise<QuotaResult> {
  const { userId, subscriptionId, packageId, modelType, haikuTokensUsed, sonnetTokensUsed, costCents } = params;

  // 1. Load subscription + package
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.id, subscriptionId),
        eq(subscriptionsTable.userId, userId),
        eq(subscriptionsTable.status, "active" as const)
      )
    );

  const [pkg] = await db
    .select()
    .from(packagesTable)
    .where(eq(packagesTable.id, packageId));

  // Determine if subscription covers this request
  const subActive =
    !!sub &&
    sub.status === "active" &&
    new Date() < sub.expiresAt;

  if (subActive && pkg) {
    // Determine quota caps based on model type
    let capHaiku = 0;
    let capSonnet = 0;

    if (modelType === "lama") {
      capHaiku = pkg.quota5hHaikuTokens;
    } else if (modelType === "campuran") {
      capHaiku = pkg.quota5hHaikuTokens;
      capSonnet = pkg.quota5hSonnetTokens;
    } else if (modelType === "baru") {
      capSonnet = pkg.quota5hSonnetTokens;
    }

    // Try 5h window first (most granular)
    const { window: window5h } = await getActiveUsageWindow(
      userId,
      subscriptionId,
      modelType,
      "5h"
    );

    // Accumulate in 5h window
    let newHaiku5h = window5h.haikuTokensUsed + (haikuTokensUsed > 0 ? haikuTokensUsed : 0);
    let newSonnet5h = window5h.sonnetTokensUsed + (sonnetTokensUsed > 0 ? sonnetTokensUsed : 0);
    let newCost5h = window5h.costCents + costCents;

    let isOverLimit5h = false;
    if (modelType === "lama" && newHaiku5h > capHaiku) isOverLimit5h = true;
    if (modelType === "campuran" && (newHaiku5h > capHaiku || newSonnet5h > capSonnet)) isOverLimit5h = true;
    if (modelType === "baru" && newSonnet5h > capSonnet) isOverLimit5h = true;

    // Update 5h window
    const wasExhausted5h = window5h.isExhausted;
    const isNowExhausted5h = isOverLimit5h;

    await db
      .update(usageWindowsTable)
      .set({
        haikuTokensUsed: newHaiku5h,
        sonnetTokensUsed: newSonnet5h,
        costCents: newCost5h,
        isExhausted: isNowExhausted5h || wasExhausted5h,
        isOverLimit: window5h.isOverLimit || isOverLimit5h,
        updatedAt: new Date(),
      })
      .where(eq(usageWindowsTable.id, window5h.id));

    // If 5h window still within quota, allow
    if (!isNowExhausted5h && !wasExhausted5h) {
      return { allowed: true, method: "subscription", windowId: window5h.id };
    }

    // 5h exhausted — check 7d window
    const { window: window7d } = await getActiveUsageWindow(
      userId,
      subscriptionId,
      modelType,
      "7d"
    );

    let newHaiku7d = window7d.haikuTokensUsed + (haikuTokensUsed > 0 ? haikuTokensUsed : 0);
    let newSonnet7d = window7d.sonnetTokensUsed + (sonnetTokensUsed > 0 ? sonnetTokensUsed : 0);
    let newCost7d = window7d.costCents + costCents;

    // 7d caps
    let capHaiku7d = 0;
    let capSonnet7d = 0;
    if (modelType === "lama") {
      capHaiku7d = pkg.quota7dHaikuTokens;
    } else if (modelType === "campuran") {
      capHaiku7d = pkg.quota7dHaikuTokens;
      capSonnet7d = pkg.quota7dSonnetTokens;
    } else if (modelType === "baru") {
      capSonnet7d = pkg.quota7dSonnetTokens;
    }

    let isOverLimit7d = false;
    if (modelType === "lama" && newHaiku7d > capHaiku7d) isOverLimit7d = true;
    if (modelType === "campuran" && (newHaiku7d > capHaiku7d || newSonnet7d > capSonnet7d)) isOverLimit7d = true;
    if (modelType === "baru" && newSonnet7d > capSonnet7d) isOverLimit7d = true;

    const wasExhausted7d = window7d.isExhausted;
    const isNowExhausted7d = isOverLimit7d;

    await db
      .update(usageWindowsTable)
      .set({
        haikuTokensUsed: newHaiku7d,
        sonnetTokensUsed: newSonnet7d,
        costCents: newCost7d,
        isExhausted: isNowExhausted7d || wasExhausted7d,
        isOverLimit: window7d.isOverLimit || isOverLimit7d,
        updatedAt: new Date(),
      })
      .where(eq(usageWindowsTable.id, window7d.id));

    if (!isNowExhausted7d && !wasExhausted7d) {
      return { allowed: true, method: "subscription", windowId: window7d.id };
    }

    // Both windows exhausted — fall through to autofallback check
  }

  // 2. No subscription quota available — check autofallback
  const [balance] = await db
    .select()
    .from(userBalancesTable)
    .where(eq(userBalancesTable.userId, userId));

  const balanceCents = balance?.balanceCents ?? 0;
  const autofallbackEnabled = balance?.autofallbackEnabled ?? false;

  if (autofallbackEnabled && balanceCents >= costCents && costCents > 0) {
    // Deduct from saldo
    const newBalance = balanceCents - costCents;

    await db.transaction(async (tx) => {
      // Update balance
      await tx
        .update(userBalancesTable)
        .set({ balanceCents: newBalance, updatedAt: new Date() })
        .where(eq(userBalancesTable.userId, userId));

      // Create transaction record
      await tx.insert(tokenTransactionsTable).values({
        userId,
        type: "ai_usage",
        amountCents: -costCents,
        balanceAfterCents: newBalance,
        description: `AI usage (autofallback from subscription quota)`,
      });
    });

    return { allowed: true, method: "saldo", deductCents: costCents };
  }

  // 3. Balance insufficient
  if (balanceCents < costCents && costCents > 0) {
    return {
      allowed: false,
      reason: "saldo_insufficient",
      balanceCents,
      requiredCents: costCents,
    };
  }

  // 4. No subscription and autofallback off or zero balance
  return {
    allowed: false,
    reason: "quota_exhausted",
    subscriptionActive: false,
  };
}

// ---------------------------------------------------------------------------
// 4. getUsageWindowSummary
// ---------------------------------------------------------------------------

/**
 * Returns aggregated usage for each modelType + windowType for a subscription.
 */
export async function getUsageWindowSummary(
  userId: string,
  subscriptionId: string
): Promise<UsageWindowSummary[]> {
  // Load package for caps
  const sub = await db
    .select()
    .from(subscriptionsTable)
    .innerJoin(packagesTable, eq(subscriptionsTable.packageId, packagesTable.id))
    .where(
      and(
        eq(subscriptionsTable.id, subscriptionId),
        eq(subscriptionsTable.userId, userId)
      )
    )
    .limit(1);

  const pkg = sub[0]?.packages;

  const windows = await db
    .select()
    .from(usageWindowsTable)
    .where(
      and(
        eq(usageWindowsTable.subscriptionId, subscriptionId),
        eq(usageWindowsTable.userId, userId)
      )
    )
    .orderBy(usageWindowsTable.windowType, usageWindowsTable.windowNumber);

  return windows.map((w) => {
    let capHaiku = 0;
    let capSonnet = 0;

    if (pkg) {
      if (w.windowType === "5h") {
        if (w.modelType === "lama" || w.modelType === "campuran") {
          capHaiku = pkg.quota5hHaikuTokens;
        }
        if (w.modelType === "campuran" || w.modelType === "baru") {
          capSonnet = pkg.quota5hSonnetTokens;
        }
      } else {
        if (w.modelType === "lama" || w.modelType === "campuran") {
          capHaiku = pkg.quota7dHaikuTokens;
        }
        if (w.modelType === "campuran" || w.modelType === "baru") {
          capSonnet = pkg.quota7dSonnetTokens;
        }
      }
    }

    return {
      modelType: w.modelType,
      windowType: w.windowType,
      windowNumber: w.windowNumber,
      windowStartAt: w.windowStartAt,
      windowEndAt: w.windowEndAt,
      haikuTokensUsed: w.haikuTokensUsed,
      sonnetTokensUsed: w.sonnetTokensUsed,
      costCents: w.costCents,
      isExhausted: w.isExhausted,
      isOverLimit: w.isOverLimit,
      capHaikuTokens: capHaiku,
      capSonnetTokens: capSonnet,
    };
  });
}

// ---------------------------------------------------------------------------
// 5. resetAutofallback
// ---------------------------------------------------------------------------

/**
 * Updates autofallback setting on user_balance.
 * Creates the balance record if it doesn't exist.
 */
export async function resetAutofallback(
  userId: string,
  enabled: boolean
): Promise<void> {
  const [existing] = await db
    .select()
    .from(userBalancesTable)
    .where(eq(userBalancesTable.userId, userId));

  if (existing) {
    await db
      .update(userBalancesTable)
      .set({ autofallbackEnabled: enabled, updatedAt: new Date() })
      .where(eq(userBalancesTable.userId, userId));
  } else {
    await db.insert(userBalancesTable).values({
      userId,
      autofallbackEnabled: enabled,
      balanceCents: 0,
    });
  }
}

// ---------------------------------------------------------------------------
// 6. expireOldWindows
// ---------------------------------------------------------------------------

/**
 * Marks windows as exhausted if current time is past windowEndAt.
 * Should be called periodically (e.g., before each AI request).
 */
export async function expireOldWindows(
  subscriptionId: string,
  now: Date = new Date()
): Promise<number> {
  const result = await db
    .update(usageWindowsTable)
    .set({ isExhausted: true, updatedAt: now })
    .where(
      and(
        eq(usageWindowsTable.subscriptionId, subscriptionId),
        eq(usageWindowsTable.isExhausted, false)
      )
    )
    .returning();

  // Use SQL to filter by windowEndAt < now
  const expiredRows = await db
    .select()
    .from(usageWindowsTable)
    .where(
      and(
        eq(usageWindowsTable.subscriptionId, subscriptionId),
        eq(usageWindowsTable.isExhausted, false)
      )
    );

  let count = 0;
  for (const row of expiredRows) {
    if (isAfter(now, row.windowEndAt)) {
      await db
        .update(usageWindowsTable)
        .set({ isExhausted: true, updatedAt: now })
        .where(eq(usageWindowsTable.id, row.id));
      count++;
    }
  }

  return count;
}
