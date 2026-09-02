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

/** Student answer to a single question */
export const quizResponseSchema = z.object({
  questionId: z.string(),
  answer: z.string(),
});

export const quizSubmissionsTable = pgTable("quiz_submissions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull(),
  studentId: text("student_id").notNull(),
  /** Array of student responses {questionId, answer} */
  responses: jsonb("responses").$type<z.infer<typeof quizResponseSchema>[]>().notNull(),
  /** Total score (null = not yet graded) */
  score: integer("score"),
  /** Max possible score for this quiz */
  maxScore: integer("max_score"),
  /** Individual question scores {questionId, score, maxScore} */
  gradingDetails: jsonb("grading_details").$type<
    Array<{ questionId: string; score: number; maxScore: number }>
  >(),
  gradedAt: timestamp("graded_at", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertQuizSubmissionSchema = createInsertSchema(
  quizSubmissionsTable,
).omit({
  id: true,
  score: true,
  gradingDetails: true,
  gradedAt: true,
  submittedAt: true,
  updatedAt: true,
});
export type InsertQuizSubmission = z.infer<typeof insertQuizSubmissionSchema>;
export type QuizSubmission = typeof quizSubmissionsTable.$inferSelect;
