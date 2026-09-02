import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Single quiz question definition */
export const questionSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(["multiple_choice", "short_answer", "essay"]),
  options: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
      }),
    )
    .optional(),
  points: z.number().int().positive().default(1),
});

export const quizzesTable = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  /** Array of question definitions */
  questions: jsonb("questions").$type<z.infer<typeof questionSchema>[]>().notNull(),
  /** Extra metadata (difficulty, topic, estimatedTime, etc.) */
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertQuizSchema = createInsertSchema(quizzesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzesTable.$inferSelect;
