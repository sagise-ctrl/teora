import {
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { referralsTable } from "./referrals";
import { usersTable } from "./users";

/**
 * Immutable audit log of every status transition on a referral.
 * Never delete rows from this table — it is the source of truth for
 * referral history and financial auditing.
 */
export const referralEventsTable = pgTable(
  "referral_events",
  {
    id: serial("id").primaryKey(),

    // Which referral this event belongs to
    referralId: integer("referral_id")
      .notNull()
      .references(() => referralsTable.id, { onDelete: "cascade" }),

    // Who or what triggered this event
    actorId: text("actor_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    actorType: text("actor_type").notNull(),
    // 'system' = automated process (email verified, payment confirmed)
    // 'user'   = user-initiated action
    // 'admin'  = manual admin override

    // State transition
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),

    // Human-readable reason
    reason: text("reason"),
    // e.g. "user_registered", "email_verified", "payment_confirmed",
    //       "abuse_detected", "manual_approval"

    // Additional context (IP address, payment ID, etc.)
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_referral_events_referral").on(table.referralId),
    index("idx_referral_events_created").on(table.createdAt),
  ]
);

export const insertReferralEventSchema = createInsertSchema(referralEventsTable).omit(
  {
    id: true,
    createdAt: true,
  }
);
export type InsertReferralEvent = z.infer<typeof insertReferralEventSchema>;
export type ReferralEvent = typeof referralEventsTable.$inferSelect;
