import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, aiTiersTable, usersTable } from "@workspace/db";
import { z } from "zod/v4";

const router: IRouter = Router();

/**
 * Owner-only middleware.
 * Verifies the authenticated user has `isOwner = true` in the users table.
 */
async function requireOwner(req: any, res: any, next: any): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const [user] = await db
    .select({ isOwner: usersTable.isOwner })
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id))
    .limit(1);

  if (!user?.isOwner) {
    res.status(403).json({ error: "Owner access required" });
    return;
  }

  next();
}

// Validation schema for tier update
const updateTierSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  pricePer1MInputCents: z.number().int().min(0).optional(),
  pricePer1MOutputCents: z.number().int().min(0).optional(),
  providerCostPer1MInputCents: z.number().int().min(0).optional(),
  providerCostPer1MOutputCents: z.number().int().min(0).optional(),
  rateLimitRpm: z.number().int().min(1).max(10000).nullable().optional(),
  rateLimitTpd: z.number().int().min(1).max(100_000_000).nullable().optional(),
  isFree: z.boolean().optional(),
  isActive: z.boolean().optional(),
  description: z.string().max(500).optional(),
  usageTips: z.string().max(500).nullable().optional(),
});

// GET /admin/ai-tiers — Owner: list ALL tiers including inactive
router.get("/admin/ai-tiers", requireOwner, async (_req, res): Promise<void> => {
  const tiers = await db
    .select()
    .from(aiTiersTable)
    .orderBy(aiTiersTable.displayOrder);

  res.json({ tiers });
});

// PUT /admin/ai-tiers/:id — Owner: update tier pricing and config
router.put("/admin/ai-tiers/:id", requireOwner, async (req, res): Promise<void> => {
  const parsed = updateTierSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const tierId = req.params.id;
  const update = parsed.data;

  // Check tier exists
  const [existing] = await db
    .select()
    .from(aiTiersTable)
    .where(eq(aiTiersTable.id, tierId))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: `Tier '${tierId}' tidak ditemukan` });
    return;
  }

  // Build update payload — strip undefined
  const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(update)) {
    if (value !== undefined) {
      updatePayload[key] = value;
    }
  }

  const [updated] = await db
    .update(aiTiersTable)
    .set(updatePayload as any)
    .where(eq(aiTiersTable.id, tierId))
    .returning();

  res.json({ tier: updated });
});

export default router;