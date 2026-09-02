import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Source of truth for AI tier configuration.
 * Owner sets provider prices here. System calculates user prices with margin.
 */
export const aiTiersTable = pgTable(
  "ai_tiers",
  {
    id: text("id").primaryKey(), // e.g. "free", "standard", "premium", "ultra"

    name: text("name").notNull(), // e.g. "Gratis", "Standar", "Premium"

    provider: text("provider").notNull(), // "groq", "anthropic", "openai"
    model: text("model").notNull(), // Model ID, e.g. "llama-3.1-8b-instant"
    baseUrl: text("base_url").notNull(), // API base URL
    apiKeyEnvVar: text("api_key_env_var").notNull(), // ENV var name for API key

    // Prices are stored in IDR cents per 1M tokens
    // e.g. 500 = Rp 5 per 1M tokens
    pricePer1MInputCents: integer("price_per_1m_input_cents").notNull().default(0),
    pricePer1MOutputCents: integer("price_per_1m_output_cents").notNull().default(0),

    // Provider cost in USD cents per 1M tokens (for margin calculation)
    providerCostPer1MInputCents: integer("provider_cost_per_1m_input_cents").notNull().default(0),
    providerCostPer1MOutputCents: integer("provider_cost_per_1m_output_cents").notNull().default(0),

    // Rate limits
    rateLimitRpm: integer("rate_limit_rpm"),
    rateLimitTpd: integer("rate_limit_tpd"),

    isFree: boolean("is_free").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),

    description: text("description").notNull().default(""),
    usageTips: text("usage_tips"), // Tips shown to users

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_ai_tiers_active").on(table.isActive, table.displayOrder),
  ]
);

export const insertAiTierSchema = createInsertSchema(aiTiersTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertAiTier = z.infer<typeof insertAiTierSchema>;
export type AiTier = typeof aiTiersTable.$inferSelect;
