import {
  pgTable,
  text,
  integer,
  varchar,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { packagesTable } from "./subscription_packages";
import { usersTable } from "./users";

/**
 * Active user subscriptions.
 * Only ONE active subscription per user (enforced by business logic).
 * Queue: future subscriptions purchased to start when current expires.
 */
export const subscriptionStatuses = [
  "active",
  "expired",
  "cancelled",
  "queued",
] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export const subscriptionsTable = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),

    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),

    packageId: text("package_id")
      .notNull()
      .references(() => packagesTable.id),

    status: varchar("status", { length: 20 })
      .notNull()
      .default("active" as SubscriptionStatus)
      .$type<SubscriptionStatus>(),

    // Subscription period
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    // Price paid (IDR cents) — for record keeping
    pricePaidCents: integer("price_paid_cents").notNull(),

    // Payment reference (filled when payment gateway is wired)
    paymentId: text("payment_id"),

    // Queue: when this subscription is queued to start
    queuedForStartAt: timestamp("queued_for_start_at", { withTimezone: true }),

    // Auto-renew toggle
    autoRenew: boolean("auto_renew").notNull().default(false),

    // Cancelled at
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    // Anchor timestamp: when the user first used the subscription.
    // Used for anchored rolling window calculation.
    usageAnchorAt: timestamp("usage_anchor_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_subs_user").on(table.userId),
    index("idx_subs_user_status").on(table.userId, table.status),
    index("idx_subs_expires").on(table.expiresAt),
    index("idx_subs_queued").on(table.queuedForStartAt),
  ]
);

export type Subscription = typeof subscriptionsTable.$inferSelect;
