import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, userPreferencesTable } from "@workspace/db";
import { z } from "zod/v4";
import { isOwnerEmail } from "../middlewares/owner.js";

const router: IRouter = Router();

/**
 * DECISION 019/020 — Olagon owner-only AI provider.
 *
 * GET /users/me/preferences — Fetch the current user's preferences
 *   (always returns aiProvider; defaults to 'anthropic' if no row exists)
 *
 * PATCH /users/me/preferences — Update preferences.
 *   Setting `aiProvider: 'olagon'` requires user email = OWNER_EMAIL (DECISION 020).
 *   Non-owners attempting to set olagon receive 403.
 *
 * Schema: `user_preferences` table (single row per user_id)
 */

const updatePreferencesSchema = z.object({
  aiProvider: z.enum(["anthropic", "olagon"]),
});

// GET /users/me/preferences — Fetch current preferences (auto-create if missing)
router.get("/users/me/preferences", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = req.user.id;

  const [pref] = await db
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, userId))
    .limit(1);

  if (!pref) {
    // Auto-create with default
    const [created] = await db
      .insert(userPreferencesTable)
      .values({ userId, aiProvider: "anthropic" })
      .returning();
    res.json(created);
    return;
  }

  res.json(pref);
});

// PATCH /users/me/preferences — Update preferences (owner-only check for olagon)
router.patch("/users/me/preferences", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = updatePreferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid payload",
      details: parsed.error.issues,
    });
    return;
  }

  const { aiProvider } = parsed.data;
  const userEmail = req.user.email;

  // DECISION 020: olagon is owner-only
  if (aiProvider === "olagon" && !isOwnerEmail(userEmail)) {
    res.status(403).json({
      error: "Forbidden",
      message: "Olagon provider is owner-only",
    });
    return;
  }

  const userId = req.user.id;

  // Upsert pattern
  const [existing] = await db
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, userId))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(userPreferencesTable)
      .set({
        aiProvider,
        updatedAt: new Date(),
      })
      .where(eq(userPreferencesTable.userId, userId))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db
      .insert(userPreferencesTable)
      .values({ userId, aiProvider })
      .returning();
    res.json(created);
  }
});

export default router;
