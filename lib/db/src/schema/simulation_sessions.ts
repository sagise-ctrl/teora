import { pgTable, text, serial, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const simulationStatuses = ["active", "completed", "abandoned", "failed"] as const;
export type SimulationStatus = (typeof simulationStatuses)[number];

export const simulationPersonas = [
  "dosen_strict",
  "dosen_friendly",
  "audience_awam",
  "audience_expert",
] as const;
export type SimulationPersona = (typeof simulationPersonas)[number];

export const simulationSessionsTable = pgTable(
  "simulation_sessions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
    persona: text("persona").notNull().$type<SimulationPersona>(),
    status: text("status").notNull().default("active").$type<SimulationStatus>(),
    projectContextSnapshot: jsonb("project_context_snapshot").$type<{
      title: string;
      subject: string | null;
      taskType: string | null;
      latestDocumentExcerpt: string | null;
      outline: string | null;
      instructionText: string | null;
    }>(),
    questionsAsked: integer("questions_asked").notNull().default(0),
    totalInputTokens: integer("total_input_tokens").notNull().default(0),
    totalOutputTokens: integer("total_output_tokens").notNull().default(0),
    totalCostCents: integer("total_cost_cents").notNull().default(0),
    tierId: text("tier_id"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_sim_sessions_user").on(table.userId),
    index("idx_sim_sessions_project").on(table.projectId),
    index("idx_sim_sessions_user_status").on(table.userId, table.status),
    index("idx_sim_sessions_started").on(table.startedAt),
  ]
);

export const insertSimulationSessionSchema = createInsertSchema(simulationSessionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  questionsAsked: true,
  totalInputTokens: true,
  totalOutputTokens: true,
  totalCostCents: true,
});
export type InsertSimulationSession = z.infer<typeof insertSimulationSessionSchema>;
export type SimulationSession = typeof simulationSessionsTable.$inferSelect;
