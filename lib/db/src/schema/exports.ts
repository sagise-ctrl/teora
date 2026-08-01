import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const exportsTable = pgTable("exports", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  format: text("format").notNull(),
  status: text("status").notNull().default("pending"),
  filePath: text("file_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertExportSchema = createInsertSchema(exportsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertExport = z.infer<typeof insertExportSchema>;
export type Export = typeof exportsTable.$inferSelect;
