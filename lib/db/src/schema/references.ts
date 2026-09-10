import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const referencesTable = pgTable("references", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  title: text("title").notNull(),
  authors: text("authors"),
  year: integer("year"),
  journal: text("journal"),
  volume: text("volume"),
  issue: text("issue"),
  doi: text("doi"),
  url: text("url"),
  validationStatus: text("validation_status").notNull().default("unverified"),
  usedInChapters: text("used_in_chapters"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Track whether this reference was auto-suggested by CrossRef or confirmed by user
  isSuggested: boolean("is_suggested").notNull().default(false),
  // Source of the reference
  source: text("source").notNull().default("manual"),
  // DECISION 014 — ceklist status: true if included in bibliography + eligible for AI auto-cite
  isSelected: boolean("is_selected").notNull().default(false),
});

export const insertReferenceSchema = createInsertSchema(referencesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertReference = z.infer<typeof insertReferenceSchema>;
export type Reference = typeof referencesTable.$inferSelect;
