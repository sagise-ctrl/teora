import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { aiTiersTable } from "./ai_tiers";

export const saldoStatuses = ["active", "held", "closed"] as const;
export type SaldoStatus = (typeof saldoStatuses)[number];

/**
 * User credit balance for AI token purchases.
 * Balance is stored in IDR cents.
 * No negative balance allowed.
 *
 * Two balance columns:
 * - balanceCents: regular saldo IDR (from topup, refund, bonus). Withdrawable in concept.
 * - rewardBalanceCents: reward balance (non-withdrawable, from referral program).
 *   - Can use for AI services
 *   - Cannot withdraw to bank
 *   - Cannot convert to saldo IDR
 *   - Source: 3% of referee's payments, capped at 5 transactions per (referrer, referee) pair
 */
export const userBalancesTable = pgTable(
  "user_balances",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),

    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => usersTable.id, { onDelete: "cascade" }),

    // Saldo IDR cents (from topup, refund, bonus). Withdrawable in concept.
    balanceCents: integer("balance_cents").notNull().default(0),

    // Reward balance cents (non-withdrawable). Earned by being a referrer.
    rewardBalanceCents: integer("reward_balance_cents").notNull().default(0),

    // Saldo status: active (normal), held (12mo inactivity), closed
    saldoStatus: text("saldo_status")
      .notNull()
      .default("active" as SaldoStatus)
      .$type<SaldoStatus>(),

    // Hybrid autofallback: automatically use saldo when subscription quota is exhausted
    autofallbackEnabled: boolean("autofallback_enabled").notNull().default(true),

    // When the user last had any AI activity
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),

    // When the saldo was put on hold (12-month inactivity)
    heldAt: timestamp("held_at", { withTimezone: true }),

    // Default tier preference for this user
    preferredTierId: text("preferred_tier_id")
      .references(() => aiTiersTable.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_user_balances_user").on(table.userId),
    index("idx_user_balances_status").on(table.saldoStatus),
  ]
);

export const insertUserBalanceSchema = createInsertSchema(userBalancesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserBalance = z.infer<typeof insertUserBalanceSchema>;
export type UserBalance = typeof userBalancesTable.$inferSelect;
