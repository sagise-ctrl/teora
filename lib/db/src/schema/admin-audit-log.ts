import {
  pgTable,
  serial,
  text,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adminAuditLogTable = pgTable(
  "admin_audit_log",
  {
    id: serial("id").primaryKey(),

    // Admin user who performed the action (owner email)
    adminEmail: text("admin_email").notNull(),

    // Action type
    action: text("action").notNull(),

    // Target resource
    targetType: text("target_type").notNull(), // user, tier, pricing, system
    targetId: text("target_id"), // user_id, tier_id, etc.

    // Details as JSON
    details: jsonb("details"),

    // IP address of admin
    ipAddress: text("ip_address"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_admin_audit_admin_created").on(table.adminEmail, table.createdAt),
    index("idx_admin_audit_action").on(table.action),
    index("idx_admin_audit_target").on(table.targetType, table.targetId),
  ]
);

export const adminActionTypes = [
  "tier_override",
  "user_suspend",
  "user_unsuspend",
  "pricing_change",
  "tier_change",
  "system_config",
] as const;
export type AdminActionType = (typeof adminActionTypes)[number];

export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLogTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;
export type AdminAuditLog = typeof adminAuditLogTable.$inferSelect;
