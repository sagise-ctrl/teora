import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

/**
 * Tracks every AI API request for FinOps (cost attribution, token budgeting).
 * Each AI call generates one record. Records are preserved for audit and billing.
 */
export const aiUsageLogTable = pgTable(
  "ai_usage_log",
  {
    id: serial("id").primaryKey(),

    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),

    projectId: integer("project_id").references(() => projectsTable.id, {
      onDelete: "set null",
    }),

    model: text("model").notNull(),
    provider: text("provider").notNull().default("openai"),

    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    estimatedCostUsd: real("estimated_cost_usd").notNull().default(0),

    requestType: text("request_type").notNull(),

    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_ai_usage_user_created").on(table.userId, table.createdAt),
    index("idx_ai_usage_project").on(table.projectId),
    index("idx_ai_usage_type").on(table.requestType),
  ]
);

export const requestTypes = [
  "chat",
  "analyze",
  "write",
  "bibliography",
  "export",
] as const;
export type RequestType = (typeof requestTypes)[number];

export const insertAIUsageLogSchema = createInsertSchema(aiUsageLogTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAIUsageLog = z.infer<typeof insertAIUsageLogSchema>;
export type AIUsageLog = typeof aiUsageLogTable.$inferSelect;

export const aiUsageStatsSchema = z.object({
  totalRequests: z.number(),
  totalInputTokens: z.number(),
  totalOutputTokens: z.number(),
  totalCostUsd: z.number(),
  byRequestType: z.record(
    z.string(),
    z.object({
      requests: z.number(),
      inputTokens: z.number(),
      outputTokens: z.number(),
      costUsd: z.number(),
    })
  ),
});
export type AIUsageStats = z.infer<typeof aiUsageStatsSchema>;
