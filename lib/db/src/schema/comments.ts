import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  documentId: integer("document_id").notNull(),
  userId: text("user_id").notNull(),
  /** Display name of commenter (denormalized for query convenience) */
  userName: text("user_name").notNull(),
  /** The comment text */
  content: text("content").notNull(),
  /**
   * Text selection this comment refers to.
   * Stores the selected text so we can re-attach comments
   * if content changes.
   */
  quoteText: text("quote_text"),
  /**
   * Start offset of selection in the document content.
   * Null for comments not anchored to specific text.
   */
  offsetStart: integer("offset_start"),
  /**
   * End offset of selection.
   * Null for comments not anchored to specific text.
   */
  offsetEnd: integer("offset_end"),
  /** Parent comment ID for threaded replies */
  parentId: integer("parent_id"),
  /** Whether the comment has been resolved/dismissed */
  resolved: boolean("resolved").notNull().default(false),
  resolvedBy: text("resolved_by"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCommentSchema = createInsertSchema(commentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof commentsTable.$inferSelect;
