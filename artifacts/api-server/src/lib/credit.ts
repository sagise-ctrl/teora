import { db } from "@workspace/db";
import { userBalancesTable, tokenTransactionsTable, aiUsageLogTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger.js";

const MINIMUM_BALANCE_CENTS = 0; // Free tier can go to 0

export interface CreditCheckResult {
  allowed: boolean;
  reason?: string;
  balanceCents?: number;
  costCents?: number;
}

/**
 * Check if user has sufficient balance for an AI request.
 * Free tier requests always allowed (cost = 0).
 */
export async function checkCreditBalance(
  userId: string,
  costCents: number,
  tierIsFree: boolean
): Promise<CreditCheckResult> {
  if (tierIsFree || costCents === 0) {
    return { allowed: true, balanceCents: 0, costCents: 0 };
  }

  const [balance] = await db
    .select()
    .from(userBalancesTable)
    .where(eq(userBalancesTable.userId, userId));

  const balanceCents = balance?.balanceCents ?? 0;

  if (balanceCents < costCents) {
    return {
      allowed: false,
      reason: "Saldo tidak mencukupi. Silakan topup terlebih dahulu.",
      balanceCents,
      costCents,
    };
  }

  return { allowed: true, balanceCents, costCents };
}

/**
 * Deduct credit after AI request completes.
 * Creates audit trail in token_transactions.
 */
export async function deductCredit(opts: {
  userId: string;
  costCents: number;
  tierIsFree: boolean;
  tierId: string;
  aiUsageLogId?: number;
  description: string;
}): Promise<{ success: boolean; balanceAfterCents: number; transactionId?: string }> {
  if (opts.tierIsFree || opts.costCents === 0) {
    return { success: true, balanceAfterCents: 0 };
  }

  const [balance] = await db
    .select()
    .from(userBalancesTable)
    .where(eq(userBalancesTable.userId, opts.userId));

  const balanceCents = balance?.balanceCents ?? 0;
  const newBalance = Math.max(0, balanceCents - opts.costCents);

  try {
    // Update balance
    if (balance) {
      await db
        .update(userBalancesTable)
        .set({
          balanceCents: newBalance,
          updatedAt: new Date(),
        })
        .where(eq(userBalancesTable.userId, opts.userId));
    } else {
      // Create balance record if doesn't exist
      await db.insert(userBalancesTable).values({
        userId: opts.userId,
        balanceCents: newBalance,
      });
    }

    // Create transaction record
    const [transaction] = await db
      .insert(tokenTransactionsTable)
      .values({
        userId: opts.userId,
        type: "ai_usage",
        amountCents: -opts.costCents,
        balanceAfterCents: newBalance,
        aiUsageLogId: opts.aiUsageLogId,
        description: opts.description,
      })
      .returning();

    return { success: true, balanceAfterCents: newBalance, transactionId: transaction.id };
  } catch (err) {
    logger.error({ err, userId: opts.userId, costCents: opts.costCents }, "Failed to deduct credit");
    return { success: false, balanceAfterCents: balanceCents };
  }
}

/**
 * Add credit to user balance (from topup).
 * Creates audit trail in token_transactions.
 */
export async function addCredit(opts: {
  userId: string;
  amountCents: number;
  paidAmountCents: number;
  stripePaymentIntentId: string;
  description: string;
}): Promise<{ success: boolean; balanceAfterCents: number; transactionId?: string }> {
  const [existing] = await db
    .select()
    .from(userBalancesTable)
    .where(eq(userBalancesTable.userId, opts.userId));

  const currentBalance = existing?.balanceCents ?? 0;
  const newBalance = currentBalance + opts.amountCents;

  try {
    if (existing) {
      await db
        .update(userBalancesTable)
        .set({
          balanceCents: newBalance,
          updatedAt: new Date(),
        })
        .where(eq(userBalancesTable.userId, opts.userId));
    } else {
      await db.insert(userBalancesTable).values({
        userId: opts.userId,
        balanceCents: newBalance,
      });
    }

    const [transaction] = await db
      .insert(tokenTransactionsTable)
      .values({
        userId: opts.userId,
        type: "topup",
        amountCents: opts.amountCents,
        balanceAfterCents: newBalance,
        stripePaymentIntentId: opts.stripePaymentIntentId,
        paidAmountCents: opts.paidAmountCents,
        description: opts.description,
      })
      .returning();

    return { success: true, balanceAfterCents: newBalance, transactionId: transaction.id };
  } catch (err) {
    logger.error({ err, userId: opts.userId, amountCents: opts.amountCents }, "Failed to add credit");
    return { success: false, balanceAfterCents: currentBalance };
  }
}

/**
 * Get user balance and transaction history.
 */
export async function getUserBalance(userId: string): Promise<{
  balanceCents: number;
  preferredTierId: string | null;
  recentTransactions: Array<{
    id: string;
    type: string;
    amountCents: number;
    balanceAfterCents: number;
    description: string;
    createdAt: Date;
  }>;
}> {
  const [balance] = await db
    .select()
    .from(userBalancesTable)
    .where(eq(userBalancesTable.userId, userId));

  const transactions = await db
    .select({
      id: tokenTransactionsTable.id,
      type: tokenTransactionsTable.type,
      amountCents: tokenTransactionsTable.amountCents,
      balanceAfterCents: tokenTransactionsTable.balanceAfterCents,
      description: tokenTransactionsTable.description,
      createdAt: tokenTransactionsTable.createdAt,
    })
    .from(tokenTransactionsTable)
    .where(eq(tokenTransactionsTable.userId, userId))
    .orderBy(tokenTransactionsTable.createdAt)
    .limit(20);

  return {
    balanceCents: balance?.balanceCents ?? 0,
    preferredTierId: balance?.preferredTierId ?? null,
    recentTransactions: transactions,
  };
}
