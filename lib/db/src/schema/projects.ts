import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // FK to Supabase auth user ID
  // Nullable: Task Umum (general) projects don't require a title.
  // DECISION 021. The frontend treats title as "opsional" and the Zod
  // CreateProjectBody marks it optional; the DB must agree or INSERT fails.
  // Note: Karya Ilmiah (academic) flows may still want a title — UI can
  // encourage it without making it required at the schema layer.
  title: text("title"),
  status: text("status").notNull().default("draft"),
  progress: integer("progress").notNull().default(0),
  instructionText: text("instruction_text"),
  subject: text("subject"),
  taskType: text("task_type"),
  citationFormat: text("citation_format"),
  outputFormat: text("output_format"),
  minRefYear: integer("min_ref_year"),
  minRefCount: integer("min_ref_count"),
  /** Toggle AI disclosure labels — default true (ON) */
  aiDisclosure: boolean("ai_disclosure").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
},
  (table) => [
    // NOTE: add CHECK constraint to Drizzle schema so `drizzle-kit push` diffs see it.
    // INC-008: previously applied as raw SQL, invisible to ORM tooling.
    // Constraint is NOT defined via Drizzle expression here (would try to re-apply
    // and conflict with the already-existing DB constraint). The actual constraint
    // expression is: task_type IS NULL OR task_type IN ('general','academic','dashboard_chat')
    // Managed via raw SQL migration (Supabase MCP). See INC-008 recommendations.
    // If `drizzle-kit push` ever starts supporting IF NOT EXISTS for CHECK constraints,
    // this can be uncommented with the correct expression:
    // check("projects_task_type_check", sql`(task_type IS NULL OR task_type IN ('general', 'academic', 'dashboard_chat'))`),
  ],
);

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
