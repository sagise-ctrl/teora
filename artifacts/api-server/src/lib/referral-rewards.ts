/**
 * Referral Program — Reward Service
 *
 * Owner-approved 2026-09-09 (referral-program-discussion.md).
 * Spec:
 *   - Referee cashback: Rp 5,000 flat, one-time per user lifetime
 *     - Triggered on first successful payment (subscription OR topup)
 *     - Source: owner personal subsidy
 *     - Destination: regular saldo IDR (balanceCents)
 *   - Referrer reward: 3% × payment amount, capped at 5 transactions per (referrer, referee)
 *     - Triggered on each successful payment by referee
 *     - Destination: reward balance (rewardBalanceCents, non-withdrawable)
 *
 * Idempotency: every function takes `paymentEventId` (gateway-issued unique ID)
 * for dedup. Replay of the same webhook event is safe.
 *
 * This service is payment-gateway-agnostic. The webhook handler is responsible
 * for translating gateway-specific events into the shape this service expects.
 */

import { db } from "@workspace/db";
import {
  referralsTable,
  referralEventsTable,
  userBalancesTable,
  tokenTransactionsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "./logger.js";

export const REFEREE_CASHBACK_CENTS = 500_000; // Rp 5,000 in IDR cents
export const REFERRER_REWARD_PERCENT = 0.03; // 3%
export const REFERRER_REWARD_TX_CAP = 5; // 5 transactions

export type PaymentMethod = "subscription" | "topup";

export interface PaymentSuccessEvent {
  paymentEventId: string; // unique ID from payment gateway (dedup key)
  userId: string; // who paid
  paidAmountCents: number; // amount paid in IDR cents (gross)
  method: PaymentMethod;
  paidAt: Date;
  metadata?: Record<string, unknown>;
}

export interface ProcessPaymentResult {
  refereeCashback: {
    credited: boolean;
    reason: "credited" | "already_claimed" | "no_referrer" | "no_user";
    amountCents: number;
  };
  referrerReward: {
    credited: boolean;
    reason:
      | "credited"
      | "cap_reached"
      | "no_referrer"
      | "amount_too_small"
      | "duplicate_event";
    amountCents: number;
    txCount: number;
  };
}

/**
 * Process a successful payment event. Idempotent.
 *
 * Steps:
 *   1. Find referral relationship for `userId` (where user is the referee).
 *   2. If first payment ever → credit referee cashback Rp 5,000 to saldo.
 *   3. If referrer exists and tx_count < 5 → credit referrer 3% to reward balance.
 *   4. Log events to referral_events for audit trail.
 *
 * Returns structured result so callers (webhook handler) can react/log.
 */
export async function processReferralPayment(
  event: PaymentSuccessEvent
): Promise<ProcessPaymentResult> {
  const result: ProcessPaymentResult = {
    refereeCashback: {
      credited: false,
      reason: "no_user",
      amountCents: 0,
    },
    referrerReward: {
      credited: false,
      reason: "no_referrer",
      amountCents: 0,
      txCount: 0,
    },
  };

  // 1. Find referral relationship
  const [referral] = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referredId, event.userId));

  if (!referral) {
    logger.info(
      { userId: event.userId, paymentEventId: event.paymentEventId },
      "[referral] no referral relationship for user — skip"
    );
    return result;
  }

  // 2. Referee cashback (one-time)
  const cashbackResult = await creditRefereeCashback(referral, event);
  result.refereeCashback = cashbackResult;

  // 3. Referrer reward (capped at 5 tx)
  const rewardResult = await creditReferrerReward(referral, event);
  result.referrerReward = rewardResult;

  return result;
}

/**
 * Credit Rp 5,000 to referee's saldo. Idempotent via refereeCashbackClaimed flag
 * AND firstPaymentEventId. Returns true if credited, false if already claimed.
 */
async function creditRefereeCashback(
  referral: typeof referralsTable.$inferSelect,
  event: PaymentSuccessEvent
): Promise<ProcessPaymentResult["refereeCashback"]> {
  // Already claimed? Skip.
  if (referral.refereeCashbackClaimed) {
    return { credited: false, reason: "already_claimed", amountCents: 0 };
  }

  // Use atomic update with WHERE guard — prevents double-claim on race
  const updated = await db
    .update(referralsTable)
    .set({
      refereeCashbackClaimed: true,
      firstPaymentAt: event.paidAt,
      firstPaymentEventId: event.paymentEventId,
      status: referral.status === "verified" ? "qualified" : referral.status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(referralsTable.id, referral.id),
        eq(referralsTable.refereeCashbackClaimed, false)
      )
    )
    .returning();

  if (updated.length === 0) {
    // Another concurrent request already claimed
    return { credited: false, reason: "already_claimed", amountCents: 0 };
  }

  // Credit saldo via transaction
  await db.transaction(async (tx) => {
    // Get or create balance row
    const [existing] = await tx
      .select()
      .from(userBalancesTable)
      .where(eq(userBalancesTable.userId, event.userId));

    const currentBalance = existing?.balanceCents ?? 0;
    const newBalance = currentBalance + REFEREE_CASHBACK_CENTS;

    if (existing) {
      await tx
        .update(userBalancesTable)
        .set({
          balanceCents: newBalance,
          lastActiveAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userBalancesTable.userId, event.userId));
    } else {
      await tx.insert(userBalancesTable).values({
        userId: event.userId,
        balanceCents: newBalance,
        lastActiveAt: new Date(),
      });
    }

    // Audit transaction
    await tx.insert(tokenTransactionsTable).values({
      userId: event.userId,
      type: "bonus",
      amountCents: REFEREE_CASHBACK_CENTS,
      balanceAfterCents: newBalance,
      paidAmountCents: REFEREE_CASHBACK_CENTS,
      description: "Bonus referral: cashback pengguna baru (Rp 5.000)",
    });
  });

  // Log to referral events
  await db.insert(referralEventsTable).values({
    referralId: referral.id,
    actorId: null,
    actorType: "system",
    fromStatus: referral.status,
    toStatus: referral.status === "verified" ? "qualified" : referral.status,
    reason: "referee_cashback_credited",
    metadata: {
      paymentEventId: event.paymentEventId,
      method: event.method,
      paidAmountCents: event.paidAmountCents,
      amountCents: REFEREE_CASHBACK_CENTS,
    },
  });

  logger.info(
    {
      referralId: referral.id,
      userId: event.userId,
      paymentEventId: event.paymentEventId,
      amountCents: REFEREE_CASHBACK_CENTS,
    },
    "[referral] referee cashback credited"
  );

  return {
    credited: true,
    reason: "credited",
    amountCents: REFEREE_CASHBACK_CENTS,
  };
}

/**
 * Credit 3% of paid amount to referrer's reward balance.
 * Capped at 5 transactions per (referrer, referee) pair.
 * Idempotent via paymentEventId check on referral_events.
 */
async function creditReferrerReward(
  referral: typeof referralsTable.$inferSelect,
  event: PaymentSuccessEvent
): Promise<ProcessPaymentResult["referrerReward"]> {
  // Check if this event already processed (dedup)
  const existing = await db
    .select({ id: referralEventsTable.id })
    .from(referralEventsTable)
    .where(
      and(
        eq(referralEventsTable.referralId, referral.id),
        eq(
          sql`${referralEventsTable.metadata}->>'paymentEventId'`,
          event.paymentEventId
        )
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return {
      credited: false,
      reason: "duplicate_event",
      amountCents: 0,
      txCount: referral.referrerRewardTxCount,
    };
  }

  // Cap check
  if (referral.referrerRewardTxCount >= REFERRER_REWARD_TX_CAP) {
    logger.info(
      {
        referralId: referral.id,
        txCount: referral.referrerRewardTxCount,
        cap: REFERRER_REWARD_TX_CAP,
      },
      "[referral] referrer reward cap reached — skip"
    );
    return {
      credited: false,
      reason: "cap_reached",
      amountCents: 0,
      txCount: referral.referrerRewardTxCount,
    };
  }

  // Amount calculation
  const rewardCents = Math.floor(
    event.paidAmountCents * REFERRER_REWARD_PERCENT
  );

  if (rewardCents <= 0) {
    return {
      credited: false,
      reason: "amount_too_small",
      amountCents: 0,
      txCount: referral.referrerRewardTxCount,
    };
  }

  const newTxCount = referral.referrerRewardTxCount + 1;

  // Atomic update to referral counters
  await db
    .update(referralsTable)
    .set({
      referrerRewardTxCount: newTxCount,
      referrerRewardPaidCents:
        referral.referrerRewardPaidCents + rewardCents,
      status: referral.status === "pending" ? "verified" : referral.status,
      updatedAt: new Date(),
    })
    .where(eq(referralsTable.id, referral.id));

  // Credit reward balance
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(userBalancesTable)
      .where(eq(userBalancesTable.userId, referral.referrerId));

    const currentReward = existing?.rewardBalanceCents ?? 0;
    const newReward = currentReward + rewardCents;

    if (existing) {
      await tx
        .update(userBalancesTable)
        .set({
          rewardBalanceCents: newReward,
          updatedAt: new Date(),
        })
        .where(eq(userBalancesTable.userId, referral.referrerId));
    } else {
      await tx.insert(userBalancesTable).values({
        userId: referral.referrerId,
        balanceCents: 0,
        rewardBalanceCents: newReward,
      });
    }
  });

  // Log event
  await db.insert(referralEventsTable).values({
    referralId: referral.id,
    actorId: null,
    actorType: "system",
    fromStatus: referral.status,
    toStatus: referral.status === "pending" ? "verified" : referral.status,
    reason: "referrer_reward_credited",
    metadata: {
      paymentEventId: event.paymentEventId,
      method: event.method,
      paidAmountCents: event.paidAmountCents,
      rewardCents,
      txCount: newTxCount,
    },
  });

  logger.info(
    {
      referralId: referral.id,
      referrerId: referral.referrerId,
      paymentEventId: event.paymentEventId,
      rewardCents,
      txCount: newTxCount,
    },
    "[referral] referrer reward credited"
  );

  return {
    credited: true,
    reason: "credited",
    amountCents: rewardCents,
    txCount: newTxCount,
  };
}

/**
 * Get referral summary for a user. Used by /users/me/referral-info endpoint.
 */
export async function getReferralSummary(userId: string): Promise<{
  referralCode: string | null;
  referredCount: number;
  refereesWithFirstPayment: number;
  totalRewardEarnedCents: number;
  rewardBalanceCents: number;
  refereeCashbackClaimed: boolean;
}> {
  // Reward balance
  const [balance] = await db
    .select({
      rewardBalanceCents: userBalancesTable.rewardBalanceCents,
    })
    .from(userBalancesTable)
    .where(eq(userBalancesTable.userId, userId));

  // All referees by this user
  const referees = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referrerId, userId));

  const referredCount = referees.length;
  const refereesWithFirstPayment = referees.filter(
    (r) => r.firstPaymentAt !== null
  ).length;

  const totalRewardEarnedCents = referees.reduce(
    (sum, r) => sum + r.referrerRewardPaidCents,
    0
  );

  // Check if THIS user was ever a referee (and got cashback)
  const [userAsReferee] = await db
    .select({ refereeCashbackClaimed: referralsTable.refereeCashbackClaimed })
    .from(referralsTable)
    .where(eq(referralsTable.referredId, userId))
    .limit(1);

  return {
    referralCode: null, // filled in by route handler from user record
    referredCount,
    refereesWithFirstPayment,
    totalRewardEarnedCents,
    rewardBalanceCents: balance?.rewardBalanceCents ?? 0,
    refereeCashbackClaimed: userAsReferee?.refereeCashbackClaimed ?? false,
  };
}
