import { pgTable, text, serial, integer, timestamp, jsonb, index, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { simulationSessionsTable } from "./simulation_sessions";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const simulationScoreSchema = z.object({
  criterion: z.string(),
  score: z.number().int().min(0).max(100),
  notes: z.string(),
});
export type SimulationScore = z.infer<typeof simulationScoreSchema>;

export const simulationReportsTable = pgTable(
  "simulation_reports",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => simulationSessionsTable.id, { onDelete: "cascade" })
      .unique(),
    projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    overallScore: integer("overall_score").notNull(),
    summary: text("summary").notNull(),
    strengths: text("strengths").notNull(),
    weaknesses: text("weaknesses").notNull(),
    recommendations: text("recommendations").notNull(),
    scores: jsonb("scores").$type<SimulationScore[]>().notNull(),
    isLatestForProject: boolean("is_latest_for_project").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_sim_reports_session").on(table.sessionId),
    index("idx_sim_reports_user_created").on(table.userId, table.createdAt),
    index("idx_sim_reports_project_latest").on(table.projectId, table.isLatestForProject),
  ]
);

export const insertSimulationReportSchema = createInsertSchema(simulationReportsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSimulationReport = z.infer<typeof insertSimulationReportSchema>;
export type SimulationReport = typeof simulationReportsTable.$inferSelect;
