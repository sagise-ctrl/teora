import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accountReferencesTable = pgTable("account_references", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  authors: text("authors"),
  year: integer("year"),
  journal: text("journal"),
  volume: text("volume"),
  issue: text("issue"),
  doi: text("doi"),
  url: text("url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Track whether this reference was auto-suggested by CrossRef or confirmed by user
  isSuggested: boolean("is_suggested").notNull().default(false),
  // Source of the reference
  source: text("source").notNull().default("manual"),
});

export const insertAccountReferenceSchema = createInsertSchema(accountReferencesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAccountReference = z.infer<typeof insertAccountReferenceSchema>;
export type AccountReference = typeof accountReferencesTable.$inferSelect;
