import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectMetadataTable = pgTable("project_metadata", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().unique(),
  detectedTitle: text("detected_title"),
  subject: text("subject"),
  // INC-011: split taskType into category (enum) + subtype (free-form).
  // - task_category mirrors projects.task_type — used for routing, filtering, theme.
  //   CHECK constraint enforces enum: NULL OR 'general'/'academic'/'dashboard_chat'.
  // - task_subtype is free-form — captures AI's natural-language description
  //   ("makalah", "skripsi", "artikel", "esai", etc.). No CHECK constraint
  //   so AI can write what it actually sees without being constrained.
  // Previous single `taskType` column broke the analyze pipeline because AI
  // free-form output ("artikel") violated the inherited DB CHECK constraint
  // and rolled back the entire transaction (no document, outline, or job
  // status update would be written). See INC-011 details.
  taskCategory: text("task_category"),
  taskSubtype: text("task_subtype"),
  citationFormat: text("citation_format"),
  language: text("language"),
  outline: text("outline"),
  contextSummary: text("context_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
},
  // NOTE: project_metadata_task_category_check constraint is managed via raw
  // SQL migration (Supabase MCP) and intentionally NOT declared in the Drizzle
  // table expression here. See INC-011. The actual DB constraint is:
  //   task_category IS NULL OR task_category IN ('general','academic','dashboard_chat')
  // Keep this comment block in sync if the constraint definition ever changes.
  // (Adding it here would cause `drizzle-kit push` to attempt to re-apply
  // and conflict with the existing DB constraint.)
);

export const insertProjectMetadataSchema = createInsertSchema(projectMetadataTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProjectMetadata = z.infer<typeof insertProjectMetadataSchema>;
export type ProjectMetadata = typeof projectMetadataTable.$inferSelect;
