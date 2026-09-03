import { pgTable, text, serial, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const learningActivitiesTable = pgTable(
  "learning_activities",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    /** JSONB array of topic strings, e.g. ["Perubahan Iklim", "Food Security"] */
    topics: text("topics").notNull(), // stored as JSON string
    subject: text("subject"),
    /** Link to the source project in Task Mentor */
    sourceProjectId: integer("source_project_id"),
    /** Where the topics were extracted from */
    extractedFrom: text("extracted_from").notNull().default("instruction"), // 'instruction' | 'reference' | 'chat'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIdIdx: uniqueIndex("learning_activities_user_id_idx").on(table.userId, table.sourceProjectId),
  }),
);

export const insertLearningActivitySchema = createInsertSchema(learningActivitiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLearningActivity = z.infer<typeof insertLearningActivitySchema>;
export type LearningActivity = typeof learningActivitiesTable.$inferSelect;
