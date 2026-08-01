import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
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
});

export const insertReferenceSchema = createInsertSchema(referencesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertReference = z.infer<typeof insertReferenceSchema>;
export type Reference = typeof referencesTable.$inferSelect;
