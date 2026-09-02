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

/** Rubric criterion for a single question */
export const rubricCriterionSchema = z.object({
  questionId: z.string(),
  maxPoints: z.number().int().nonnegative(),
  /** Correct answer (for auto-grading multiple choice) */
  correctAnswer: z.string().optional(),
  /** Keywords to check for short-answer auto-grading */
  keywords: z.array(z.string()).optional(),
  /** Min keyword matches required (0-1 = percentage) */
  keywordThreshold: z.number().min(0).max(1).optional(),
});

export const rubricsTable = pgTable("rubrics", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull(),
  /** Array of per-question grading criteria */
  criteria: jsonb("criteria").$type<z.infer<typeof rubricCriterionSchema>[]>().notNull(),
  /** Manual grading notes for essay questions */
  manualNotes: text("manual_notes"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertRubricSchema = createInsertSchema(rubricsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRubric = z.infer<typeof insertRubricSchema>;
export type Rubric = typeof rubricsTable.$inferSelect;
