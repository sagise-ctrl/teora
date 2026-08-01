import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectMetadataTable = pgTable("project_metadata", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().unique(),
  detectedTitle: text("detected_title"),
  subject: text("subject"),
  taskType: text("task_type"),
  citationFormat: text("citation_format"),
  language: text("language"),
  outline: text("outline"),
  contextSummary: text("context_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProjectMetadataSchema = createInsertSchema(projectMetadataTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProjectMetadata = z.infer<typeof insertProjectMetadataSchema>;
export type ProjectMetadata = typeof projectMetadataTable.$inferSelect;
