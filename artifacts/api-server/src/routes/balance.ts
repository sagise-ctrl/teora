import { Router, type IRouter } from "express";
import { db, userBalancesTable, tokenTransactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getUserBalance } from "../lib/credit.js";

const router: IRouter = Router();

// GET /users/me/balance — Get current balance and transaction history
router.get("/users/me/balance", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user!.id;

  const balance = await getUserBalance(userId);

  res.json({
    balanceCents: balance.balanceCents,
    balanceDisplay: (balance.balanceCents / 100).toLocaleString("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }),
    preferredTierId: balance.preferredTierId,
    recentTransactions: balance.recentTransactions.map((t) => ({
      id: t.id,
      type: t.type,
      amountCents: t.amountCents,
      amountDisplay: (t.amountCents / 100).toLocaleString("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }),
      balanceAfterCents: t.balanceAfterCents,
      balanceAfterDisplay: (t.balanceAfterCents / 100).toLocaleString("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }),
      description: t.description,
      createdAt: t.createdAt,
    })),
  });
});

// PUT /users/me/ai-tier-preference — Set default tier
router.put("/users/me/ai-tier-preference", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user!.id;

  const { tierId } = req.body as { tierId?: string };
  if (!tierId) {
    res.status(400).json({ error: "tierId diperlukan" });
    return;
  }

  const [balance] = await db
    .select()
    .from(userBalancesTable)
    .where(eq(userBalancesTable.userId, userId));

  if (balance) {
    await db
      .update(userBalancesTable)
      .set({
        preferredTierId: tierId,
        updatedAt: new Date(),
      })
      .where(eq(userBalancesTable.userId, userId));
  } else {
    await db.insert(userBalancesTable).values({
      userId,
      balanceCents: 0,
      preferredTierId: tierId,
    });
  }

  res.json({ preferredTierId: tierId });
});

export default router;
