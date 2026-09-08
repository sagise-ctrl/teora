import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { db, userBalancesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// PUT /users/me/autofallback — toggle hybrid autofallback
router.put("/autofallback", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const schema = z.object({
    enabled: z.boolean(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "enabled (boolean) diperlukan" });
    return;
  }

  const { enabled } = parsed.data;
  const userId = req.user.id;

  const [balance] = await db
    .select()
    .from(userBalancesTable)
    .where(eq(userBalancesTable.userId, userId))
    .limit(1);

  if (!balance) {
    // Auto-create balance record with default values
    await db.insert(userBalancesTable).values({
      userId,
      balanceCents: 0,
      autofallbackEnabled: enabled,
    });
    res.json({ autofallbackEnabled: enabled });
    return;
  }

  await db
    .update(userBalancesTable)
    .set({
      autofallbackEnabled: enabled,
      updatedAt: new Date(),
    })
    .where(eq(userBalancesTable.userId, userId));

  res.json({ autofallbackEnabled: enabled });
});

export default router;
