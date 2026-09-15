import {
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Per-user UI/UX preferences.
 *
 * DECISION 019 (Owner 2026-09-15):
 *   - Stores user-level settings including `ai_provider` toggle ('anthropic' | 'olagon')
 *   - When user sets ai_provider='olagon', backend routes AI requests to
 *     `opus-4-8-olagon` tier (with auto-cascade to opus-4-6-olagon).
 *   - Setting ai_provider='olagon' requires user email = OWNER_EMAIL (enforced in
 *     PATCH /api/users/me/preferences route).
 *
 * Pattern matching existing tables (user_balances, projects, etc.):
 *   - user_id stored as TEXT (not UUID) — custom format
 *   - No FK constraint to auth.users (matches existing pattern)
 *   - updated_at auto-updated via trigger in DB
 */
export const userPreferencesTable = pgTable("user_preferences", {
  userId: text("user_id").primaryKey(),

  // 'anthropic' (production, Haiku/Sonnet) | 'olagon' (owner-only Opus)
  aiProvider: text("ai_provider").notNull().default("anthropic"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserPreferences = typeof userPreferencesTable.$inferSelect;
export type InsertUserPreferences = typeof userPreferencesTable.$inferInsert;

/**
 * AI provider enum (for TypeScript type-safety).
 * DB-level CHECK constraint enforces same values at SQL layer.
 */
export const AI_PROVIDERS = ["anthropic", "olagon"] as const;
export type AIProvider = (typeof AI_PROVIDERS)[number];
