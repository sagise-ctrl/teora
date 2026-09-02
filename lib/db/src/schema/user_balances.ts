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

/**
 * User credit balance for AI token purchases.
 * Balance is stored in IDR cents.
 * No negative balance allowed.
 */
export const userBalancesTable = pgTable(
  "user_balances",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),

    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => usersTable.id, { onDelete: "cascade" }),

    // Balance in IDR cents. e.g. 50000 = Rp 500
    balanceCents: integer("balance_cents").notNull().default(0),

    // Default tier preference for this user
    preferredTierId: text("preferred_tier_id")
      .references(() => aiTiersTable.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_user_balances_user").on(table.userId),
  ]
);

export const insertUserBalanceSchema = createInsertSchema(userBalancesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserBalance = z.infer<typeof insertUserBalanceSchema>;
export type UserBalance = typeof userBalancesTable.$inferSelect;
