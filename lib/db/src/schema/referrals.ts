import {
  pgTable,
  serial,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

/**
 * Tracks referral relationships between users.
 * Each referred user has exactly one referrer (enforced by UNIQUE on referredId).
 * Records are preserved even when users are deleted (ON DELETE SET NULL).
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
});
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referralsTable.$inferSelect;
