import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Subscription package catalog — the 30 SKUs.
 * 5 tiers × 3 model types × 2 periods = 30 packages.
 *
 * Tier: starter, standar, premium, pro, ultra
 * Model type: lama (haiku only), campuran (haiku+sonnet), baru (sonnet only)
 * Period: 15 days, 30 days
 */
export const packagesTable = pgTable(
  "subscription_packages",
  {
    id: text("id").primaryKey(), // e.g. "starter-lama-15d"

    tier: varchar("tier", { length: 20 }).notNull(), // starter|standar|premium|pro|ultra
    tierName: text("tier_name").notNull(), // "Starter", "Standar", dst
    tierDisplayOrder: integer("tier_display_order").notNull().default(0),

    modelType: varchar("model_type", { length: 20 }).notNull(), // lama|campuran|baru
    modelTypeName: text("model_type_name").notNull(), // "Lama (Haiku)", "Campuran", "Baru (Sonnet)"

    periodDays: integer("period_days").notNull(), // 15 | 30
    periodName: text("period_name").notNull(), // "15 Hari", "30 Hari"

    // Quota caps per window (in tokens), per model
    // Haiku quotas (in tokens)
    quota7dHaikuTokens: integer("quota_7d_haiku_tokens").notNull(),
    quota5hHaikuTokens: integer("quota_5h_haiku_tokens").notNull(),
    // Sonnet quotas (in tokens)
    quota7dSonnetTokens: integer("quota_7d_sonnet_tokens").notNull(),
    quota5hSonnetTokens: integer("quota_5h_sonnet_tokens").notNull(),

    // Price in IDR cents
    priceCents: integer("price_cents").notNull(),

    // Feature flags
    isHighlighted: boolean("is_highlighted").notNull().default(false), // "Pilihan Terbaik"
    isDefault: boolean("is_default").notNull().default(false), // default pick

    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_packages_tier").on(table.tier, table.tierDisplayOrder),
    index("idx_packages_active").on(table.isActive),
    index("idx_packages_tier_model_period").on(
      table.tier,
      table.modelType,
      table.periodDays
    ),
  ]
);

export type Package = typeof packagesTable.$inferSelect;
