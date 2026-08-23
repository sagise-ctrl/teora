import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectMembersRoles = ["owner", "collaborator", "viewer"] as const;

export const projectMembersTable = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role", { enum: projectMembersRoles })
    .notNull()
    .default("collaborator"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  projectUserIdx: uniqueIndex("project_members_project_user_idx").on(
    table.projectId,
    table.userId,
  ),
}));

export const insertProjectMemberSchema = createInsertSchema(
  projectMembersTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectMember = typeof projectMembersTable.$inferSelect;
