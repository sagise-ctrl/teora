import { Router, type IRouter } from "express";
import { db, packagesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

// GET /packages — Return all active subscription packages, grouped
router.get("/packages", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(packagesTable)
    .where(eq(packagesTable.isActive, true))
    .orderBy(
      asc(packagesTable.tierDisplayOrder),
      asc(packagesTable.modelType),
      asc(packagesTable.periodDays),
    );

  const packages = rows.map((pkg) => ({
    id: pkg.id,
    tier: pkg.tier,
    tierName: pkg.tierName,
    tierDisplayOrder: pkg.tierDisplayOrder,
    modelType: pkg.modelType,
    modelTypeName: pkg.modelTypeName,
    periodDays: pkg.periodDays,
    periodName: pkg.periodName,
    quota7dHaikuTokens: pkg.quota7dHaikuTokens,
    quota5hHaikuTokens: pkg.quota5hHaikuTokens,
    quota7dSonnetTokens: pkg.quota7dSonnetTokens,
    quota5hSonnetTokens: pkg.quota5hSonnetTokens,
    priceCents: pkg.priceCents,
    priceDisplay: pkg.priceCents.toLocaleString("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }),
    isHighlighted: pkg.isHighlighted,
    isDefault: pkg.isDefault,
  }));

  // Collect unique tiers, model types, and periods for client-side grouping
  const tiers = [...new Set(packages.map((p) => p.tier))];
  const modelTypes = [...new Set(packages.map((p) => p.modelType))];
  const periods = [...new Set(packages.map((p) => p.periodDays))].sort(
    (a, b) => a - b,
  );

  res.json({ packages, tiers, modelTypes, periods });
});

export default router;
