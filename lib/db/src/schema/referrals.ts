import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

/**
 * Tracks referral relationships between users.
 * Each referred user has exactly one referrer (enforced by UNIQUE on referredId).
 * Records are preserved even when users are deleted (ON DELETE SET NULL).
 *
 * Decision: Owner-approved 2026-09-09 (referral-program-discussion.md)
 * - referee cashback: Rp 5,000 first payment only (per user lifetime)
 * - referrer reward: 3% × payment amount, up to 5 transactions
 * - subsidy source: owner personal (not Teora revenue)
 */
export const referralsTable = pgTable(
  "referrals",
  {
    id: serial("id").primaryKey(),

    // Who invited
    referrerId: text("referrer_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "set null" }),

    // Who was invited (exactly one referrer per user)
    referredId: text("referred_id")
      .notNull()
      .unique()
      .references(() => usersTable.id, { onDelete: "set null" }),

    // Email at time of registration (denormalized for audit trail)
    referredEmail: text("referred_email").notNull(),

    // Referral code used at time of registration
    referralCode: text("referral_code").notNull(),

    // Lifecycle status
    status: text("status").notNull().default("pending"),
    // pending   = newly registered, awaiting email verification
    // verified  = email confirmed
    // qualified = email confirmed + first payment (future)
    // rewarded  = commission/reward paid out (future)
    // rejected  = abuse detected

    // ----- Reward program tracking (finalized 2026-09-09) -----

    // First successful payment timestamp (any method: subscription or topup)
    firstPaymentAt: timestamp("first_payment_at", { withTimezone: true }),

    // First-payment payment event ID (for idempotency)
    firstPaymentEventId: text("first_payment_event_id"),

    // Referee cashback Rp 5,000 — claimed exactly once per user lifetime
    refereeCashbackClaimed: boolean("referee_cashback_claimed")
      .notNull()
      .default(false),

    // Count of paid transactions used for referrer reward (capped at 5)
    referrerRewardTxCount: integer("referrer_reward_tx_count")
      .notNull()
      .default(0),

    // Total referrer reward paid (denormalized for fast display)
    referrerRewardPaidCents: integer("referrer_reward_paid_cents")
      .notNull()
      .default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_referrals_referrer").on(table.referrerId),
    index("idx_referrals_referred").on(table.referredId),
    index("idx_referrals_code").on(table.referralCode),
    index("idx_referrals_status").on(table.status),
    index("idx_referrals_first_payment").on(table.firstPaymentAt),
  ]
);

export const referralStatuses = [
  "pending",
  "verified",
  "qualified",
  "rewarded",
  "rejected",
] as const;
export type ReferralStatus = (typeof referralStatuses)[number];

export const insertReferralSchema = createInsertSchema(referralsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  firstPaymentAt: true,
  firstPaymentEventId: true,
  refereeCashbackClaimed: true,
  referrerRewardTxCount: true,
  referrerRewardPaidCents: true,
});
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referralsTable.$inferSelect;
