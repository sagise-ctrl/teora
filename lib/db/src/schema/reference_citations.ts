import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * reference_citations — track citation marker positions in document text.
 *
 * When AI auto-cite inserts a citation (e.g., "(Smith, 2023)") into a paragraph,
 * the position is recorded here so the citation can be:
 *   - Re-rendered when citationFormat changes
 *   - Dragged to a different paragraph by the user
 *   - Removed without losing the underlying reference
 *
 * One reference can appear multiple times in a document (multi-cite) — each
 * occurrence gets its own row with its own paragraph_index + offset.
 */

export const referenceCitationsTable = pgTable("reference_citations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  referenceId: integer("reference_id")
    .notNull()
    .references(() => referencesTable.id, { onDelete: "cascade" }),
  // 0-based paragraph index in the document text
  paragraphIndex: integer("paragraph_index").notNull(),
  // Character offset within the paragraph (where the citation marker starts)
  offsetInParagraph: integer("offset_in_paragraph").notNull().default(0),
  // Pre-rendered citation marker (e.g., "(Smith & Jones, 2023)" or "[1]")
  // Re-rendered when citationFormat changes
  formatMarker: text("format_marker").notNull(),
  // Optional AI explanation for why this citation was placed here
  // Useful for the auto-cite preview UI
  placementReason: text("placement_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Foreign key imports — declared at the bottom to avoid circular type issues
import { projectsTable } from "./projects";
import { referencesTable } from "./references";

export const insertReferenceCitationSchema = createInsertSchema(referenceCitationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReferenceCitation = z.infer<typeof insertReferenceCitationSchema>;
export type ReferenceCitation = typeof referenceCitationsTable.$inferSelect;
