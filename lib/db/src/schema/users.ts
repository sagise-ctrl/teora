import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  // Supabase auth user ID (UUID from Supabase)
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  // Username: unique, used for sharing URLs (e.g., /u/budi)
  username: text("username").unique().notNull(),
  // Owner flag: owner doesn't need subscription
  isOwner: boolean("is_owner").notNull().default(false),
  // Optional display info
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  // Unique referral code this user can share
  referralCode: text("referral_code").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
