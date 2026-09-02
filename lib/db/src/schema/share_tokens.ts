import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const shareTokensTable = pgTable("share_tokens", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  /** view = read-only, comment = view + annotations, edit = view + modify */
  accessMode: text("access_mode").notNull().default("view"),
  /** Optional label to help owner remember what the link is for */
  label: text("label"),
  /** Null = never expires */
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertShareTokenSchema = createInsertSchema(shareTokensTable).omit({
  id: true,
  createdAt: true,
});
export type InsertShareToken = z.infer<typeof insertShareTokenSchema>;
export type ShareToken = typeof shareTokensTable.$inferSelect;
