import { pgTable, text, serial, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { simulationSessionsTable } from "./simulation_sessions";

export const simulationRoles = ["user", "assistant", "system"] as const;
export type SimulationRole = (typeof simulationRoles)[number];

export const simulationMessagesTable = pgTable(
  "simulation_messages",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id").notNull().references(() => simulationSessionsTable.id, { onDelete: "cascade" }),
    role: text("role").notNull().$type<SimulationRole>(),
    content: text("content").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costCents: integer("cost_cents").notNull().default(0),
    sequenceIndex: integer("sequence_index").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_sim_messages_session").on(table.sessionId, table.sequenceIndex),
  ]
);

export const insertSimulationMessageSchema = createInsertSchema(simulationMessagesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSimulationMessage = z.infer<typeof insertSimulationMessageSchema>;
export type SimulationMessage = typeof simulationMessagesTable.$inferSelect;
