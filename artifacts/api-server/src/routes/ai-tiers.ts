import { Router, type IRouter } from "express";
import { db, aiTiersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

// GET /ai-tiers — List all active tiers (for price list page)
router.get("/ai-tiers", async (_req, res): Promise<void> => {
  const tiers = await db
    .select({
      id: aiTiersTable.id,
      name: aiTiersTable.name,
      provider: aiTiersTable.provider,
      model: aiTiersTable.model,
      pricePer1MInputCents: aiTiersTable.pricePer1MInputCents,
      pricePer1MOutputCents: aiTiersTable.pricePer1MOutputCents,
      providerCostPer1MInputCents: aiTiersTable.providerCostPer1MInputCents,
      providerCostPer1MOutputCents: aiTiersTable.providerCostPer1MOutputCents,
      rateLimitRpm: aiTiersTable.rateLimitRpm,
      rateLimitTpd: aiTiersTable.rateLimitTpd,
      isFree: aiTiersTable.isFree,
      description: aiTiersTable.description,
      usageTips: aiTiersTable.usageTips,
    })
    .from(aiTiersTable)
    .where(eq(aiTiersTable.isActive, true))
    .orderBy(aiTiersTable.displayOrder);

  res.json({
    tiers: tiers.map((t) => ({
      ...t,
      rateLimit: t.rateLimitRpm
        ? `${t.rateLimitRpm} req/menit${t.rateLimitTpd ? `, ${t.rateLimitTpd.toLocaleString()} token/hari` : ""}`
        : "Tanpa batas",
      priceDisplay: t.isFree
        ? "Gratis"
        : `${(t.pricePer1MInputCents / 100).toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })} / 1M token`,
    })),
  });
});

export default router;
