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
import { subscriptionsTable } from "./subscriptions";

/**
 * Rolling window usage tracking per subscription, per model type.
 *
 * Anchored rolling window: T0 = subscription.usageAnchorAt.
 * - Window 5h: resets every 5 hours from T0
 * - Window 7d: resets every 7 days from T0
 * - Max windows = periodDays / 7 (floor)
 *
 * One row per (subscription_id, model_type, window_type).
 * Tokens are accumulated from ai_usage_log and aggregated here.
 */
export const windowTypes = ["5h", "7d"] as const;
export type WindowType = (typeof windowTypes)[number];

export const usageWindowsTable = pgTable(
  "usage_windows",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),

    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => subscriptionsTable.id, { onDelete: "cascade" }),

    userId: text("user_id").notNull(),

    // Model type: lama | campuran | baru
    modelType: varchar("model_type", { length: 20 }).notNull(),

    // Window type: 5h | 7d
    windowType: varchar("window_type", { length: 5 })
      .notNull()
      .$type<WindowType>(),

    // Which window number this is (1-indexed)
    // e.g., for a 30-day subscription: windows 1-4 for 7d
    windowNumber: integer("window_number").notNull(),

    // Window boundary
    windowStartAt: timestamp("window_start_at", { withTimezone: true }).notNull(),
    windowEndAt: timestamp("window_end_at", { withTimezone: true }).notNull(),

    // Usage accumulated (in tokens)
    haikuTokensUsed: integer("haiku_tokens_used").notNull().default(0),
    sonnetTokensUsed: integer("sonnet_tokens_used").notNull().default(0),

    // Cost accumulated (in IDR cents) — computed from tokens × rate
    costCents: integer("cost_cents").notNull().default(0),

    // Is this window exhausted (cannot be used further)?
    isExhausted: boolean("is_exhausted").notNull().default(false),

    // Did user exceed the window cap?
    isOverLimit: boolean("is_over_limit").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_usage_win_sub_model_type").on(
      table.subscriptionId,
      table.modelType,
      table.windowType
    ),
    index("idx_usage_win_user").on(table.userId, table.windowEndAt),
    index("idx_usage_win_active").on(
      table.isExhausted,
      table.windowEndAt
    ),
  ]
);

export type UsageWindow = typeof usageWindowsTable.$inferSelect;
