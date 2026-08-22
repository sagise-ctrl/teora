import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const documentVersionsTable = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  // Multi-document: each version belongs to a document (nullable for backward compat)
  documentId: integer("document_id"),
  versionNumber: integer("version_number").notNull().default(1),
  content: text("content").notNull(),
  outline: text("outline"),
  changeDescription: text("change_description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDocumentVersionSchema = createInsertSchema(documentVersionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertDocumentVersion = z.infer<typeof insertDocumentVersionSchema>;
export type DocumentVersion = typeof documentVersionsTable.$inferSelect;
