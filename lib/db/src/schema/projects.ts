import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // FK to Supabase auth user ID
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  progress: integer("progress").notNull().default(0),
  instructionText: text("instruction_text"),
  subject: text("subject"),
  taskType: text("task_type"),
  citationFormat: text("citation_format"),
  outputFormat: text("output_format"),
  minRefYear: integer("min_ref_year"),
  minRefCount: integer("min_ref_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
