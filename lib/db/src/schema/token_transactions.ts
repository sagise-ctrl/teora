import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { aiTiersTable } from "./ai_tiers";

export const transactionTypes = [
  "topup",
  "ai_usage",
  "refund",
  "bonus",
  "adjustment",
] as const;
export type TransactionType = (typeof transactionTypes)[number];

/**
 * Complete audit trail for all credit movements.
 * Every balance change creates one record.
 * Used for: user history, FinOps reporting, dispute resolution.
 */
export const tokenTransactionsTable = pgTable(
  "token_transactions",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),

    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),

    type: text("type").notNull(),

    // Amount in IDR cents. Positive = credit (incoming), Negative = debit (outgoing)
    amountCents: integer("amount_cents").notNull(),

    // Balance snapshot after this transaction
    balanceAfterCents: integer("balance_after_cents").notNull(),

    // For AI usage: reference to ai_usage_log
    aiUsageLogId: integer("ai_usage_log_id"),

    // For topup: Stripe payment reference
    stripePaymentIntentId: text("stripe_payment_intent_id"),

    // For topup: amount paid in cents (may differ from amountCents due to bonus)
    paidAmountCents: integer("paid_amount_cents"),

    // Human-readable description
    description: text("description").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_token_trans_user_created").on(table.userId, table.createdAt),
    index("idx_token_trans_type").on(table.type),
    index("idx_token_trans_stripe").on(table.stripePaymentIntentId),
  ]
);

export const insertTokenTransactionSchema = createInsertSchema(tokenTransactionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertTokenTransaction = z.infer<typeof insertTokenTransactionSchema>;
export type TokenTransaction = typeof tokenTransactionsTable.$inferSelect;
