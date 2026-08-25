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

/** Writing style characteristics extracted by AI analysis */
export const styleCharacteristicsSchema = z.object({
  formality: z.number().min(0).max(1).describe("0=informal, 1=formal"),
  vocabularyLevel: z
    .number()
    .min(0)
    .max(1)
    .describe("0=simple/common, 1=academic/specialized"),
  avgSentenceLength: z.number().positive(),
  avgParagraphLength: z.number().positive(),
  passiveVoiceRatio: z.number().min(0).max(1),
  readabilityScore: z.number().min(0).max(100),
  dominantTone: z.enum(["neutral", "persuasive", "analytical", "descriptive", "critical"]),
  commonPhrases: z.array(z.string()),
  structuralPatterns: z.array(z.string()),
});

export const writingStyleProfilesTable = pgTable("writing_style_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  projectId: integer("project_id"),
  /** AI-extracted style characteristics */
  styleCharacteristics: jsonb("style_characteristics")
    .$type<z.infer<typeof styleCharacteristicsSchema>>()
    .notNull(),
  /** Number of documents analyzed to build this profile */
  sampleSize: integer("sample_size").notNull().default(1),
  analyzedAt: timestamp("analyzed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertWritingStyleProfileSchema = createInsertSchema(
  writingStyleProfilesTable,
).omit({
  id: true,
  analyzedAt: true,
  updatedAt: true,
});
export type InsertWritingStyleProfile = z.infer<typeof insertWritingStyleProfileSchema>;
export type WritingStyleProfile = typeof writingStyleProfilesTable.$inferSelect;
