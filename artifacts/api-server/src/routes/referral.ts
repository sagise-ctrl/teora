/**
 * Referral — User Info Endpoint
 *
 * Returns the authenticated user's referral program status:
 *   - Their referral code (to share)
 *   - Number of referees they've invited
 *   - Number of referees who have completed first payment
 *   - Total reward earned (lifetime)
 *   - Current reward balance (non-withdrawable)
 *   - Whether THIS user was ever a referee and has claimed cashback
 *
 * Endpoint: GET /api/users/me/referral-info
 *
 * Used by /referral page in frontend. Replaces the previous mock data.
 */

import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { getReferralSummary } from "../lib/referral-rewards.js";

const router: IRouter = Router();

router.get("/users/me/referral-info", async (req, res): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Get user's referral code
    const [user] = await db
      .select({
        referralCode: usersTable.referralCode,
        email: usersTable.email,
        displayName: usersTable.displayName,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const summary = await getReferralSummary(userId);
    summary.referralCode = user.referralCode;

    res.status(200).json({
      referralCode: user.referralCode,
      email: user.email,
      displayName: user.displayName,
      referredCount: summary.referredCount,
      refereesWithFirstPayment: summary.refereesWithFirstPayment,
      totalRewardEarnedCents: summary.totalRewardEarnedCents,
      rewardBalanceCents: summary.rewardBalanceCents,
      refereeCashbackClaimed: summary.refereeCashbackClaimed,
      // Program constants (frontend can show exact wording)
      refereeCashbackAmountCents: 500_000, // Rp 5,000
      referrerRewardPercent: 0.03, // 3%
      referrerRewardTxCap: 5, // 5 transactions
    });
  } catch (err) {
    console.error("[referral-info] unhandled", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Gagal memuat informasi referral." });
    }
  }
});

export default router;
