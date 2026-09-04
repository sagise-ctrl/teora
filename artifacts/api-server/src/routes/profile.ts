import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, usersTable, projectsTable } from "@workspace/db";
import { supabaseAdmin } from "../lib/supabase-admin.js";

const router: IRouter = Router();

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

const avatarUploadSchema = z.object({
  base64Content: z.string().min(1),
  filename: z.string().min(1).max(255),
});

const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

function toProfileJson(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    isOwner: user.isOwner,
    referralCode: user.referralCode,
    createdAt: user.createdAt,
  };
}

// GET /users/me/profile
router.get("/users/me/profile", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id));

  if (!user) {
    res.status(404).json({ error: "Akun tidak ditemukan." });
    return;
  }

  res.json(toProfileJson(user));
});

// PATCH /users/me/profile
router.patch("/users/me/profile", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { displayName, avatarUrl } = parsed.data;
  if (!displayName && avatarUrl === undefined) {
    res.status(400).json({ error: "Tidak ada data yang diubah." });
    return;
  }

  const updates: Record<string, string | null> = {};
  if (displayName !== undefined) {
    updates.displayName = displayName.trim() || null;
  }
  if (avatarUrl !== undefined) {
    updates.avatarUrl = avatarUrl || null;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(usersTable.id, req.user.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Akun tidak ditemukan." });
    return;
  }

  res.json(toProfileJson(updated));
});

// POST /users/me/avatar
router.post("/users/me/avatar", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const parsed = avatarUploadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { base64Content, filename } = parsed.data;

  // Validate base64 size
  const byteSize = Math.ceil((base64Content.length * 3) / 4);
  if (byteSize > MAX_AVATAR_SIZE) {
    res.status(400).json({ error: "File too large. Maximum size is 5MB." });
    return;
  }

  // Detect content type from base64 or filename
  let contentType = "image/jpeg";
  if (base64Content.startsWith("/9j/")) contentType = "image/jpeg";
  else if (base64Content.startsWith("iVBOR")) contentType = "image/png";
  else if (base64Content.startsWith("UklGR")) contentType = "image/webp";

  if (!ALLOWED_TYPES.includes(contentType)) {
    res.status(400).json({ error: "Invalid file type. Accepted: JPEG, PNG, WebP." });
    return;
  }

  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const safeFilename = `${Date.now()}.${ext}`;
  const storagePath = `${req.user.id}/${safeFilename}`;

  if (!supabaseAdmin) {
    res.status(500).json({ error: "Layanan penyimpanan belum tersedia." });
    return;
  }

  const buffer = Buffer.from(base64Content, "base64");

  const { error: uploadError } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    res.status(500).json({ error: "Failed to upload avatar" });
    return;
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(storagePath);

  const avatarUrl = urlData.publicUrl;

  // Update user record with new avatar URL
  await db
    .update(usersTable)
    .set({ avatarUrl, updatedAt: new Date() })
    .where(eq(usersTable.id, req.user.id));

  res.json({ avatarUrl });
});

// DELETE /users/me/account
router.delete("/users/me/account", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const parsed = deleteAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { password } = parsed.data;

  // Verify password via Supabase
  if (!supabaseAdmin) {
    res.status(500).json({ error: "Fitur login belum tersedia. Hubungi administrator." });
    return;
  }

  // Get the user's email to re-authenticate
  const [userRecord] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id));

  if (!userRecord) {
    res.status(404).json({ error: "Akun tidak ditemukan." });
    return;
  }

  // Try to sign in with the provided password to verify ownership
  const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email: userRecord.email,
    password,
  });

  if (signInError) {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }

  // Delete all projects owned by this user (cascade)
  await db
    .delete(projectsTable)
    .where(eq(projectsTable.userId, req.user.id));

  // Delete the Supabase Auth user (this cascades to local DB via RLS or we handle it)
  const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(req.user.id);

  if (deleteAuthError) {
    res.status(500).json({ error: "Failed to delete account" });
    return;
  }

  res.json({ message: "Account deleted successfully" });
});

export default router;
