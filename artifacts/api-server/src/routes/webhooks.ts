import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, referralsTable, referralEventsTable } from "@workspace/db";

const router: IRouter = Router();

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "";

// ---------------------------------------------------------------------------
// POST /webhooks/email-verified
// Called by Supabase database webhook when auth.users.email_confirmed_at
// transitions from null to a timestamp.
// ---------------------------------------------------------------------------
router.post("/webhooks/email-verified", async (req, res): Promise<void> => {
  // Validate webhook secret
  if (WEBHOOK_SECRET && req.headers["x-webhook-secret"] !== WEBHOOK_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = req.body as {
    record?: {
      id?: string;
      email?: string;
      email_confirmed_at?: string | null;
    };
    old_record?: {
      email_confirmed_at?: string | null;
    };
  };

  if (!body.record?.id) {
    res.status(400).json({ error: "Missing user id" });
    return;
  }

  const { id: userId, email_confirmed_at } = body.record;
  const oldConfirmed = body.old_record?.email_confirmed_at;

  // Only process if email was just confirmed (transition from null → timestamp)
  if (!email_confirmed_at || oldConfirmed) {
    // Not a new confirmation or already confirmed — acknowledge and ignore
    res.sendStatus(200);
    return;
  }

  // Find pending referral for this user
  const [referral] = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referredId, userId));

  if (!referral) {
    // No pending referral — nothing to do
    res.sendStatus(200);
    return;
  }

  if (referral.status !== "pending") {
    // Already processed — acknowledge and ignore
    res.sendStatus(200);
    return;
  }

  // Update referral status to verified
  await db
    .update(referralsTable)
    .set({ status: "verified", updatedAt: new Date() })
    .where(eq(referralsTable.id, referral.id));

  // Log the transition
  await db.insert(referralEventsTable).values({
    referralId: referral.id,
    actorId: null,
    actorType: "system",
    fromStatus: "pending",
    toStatus: "verified",
    reason: "email_verified",
    metadata: { emailConfirmedAt: email_confirmed_at },
  });

  res.sendStatus(200);
});

export default router;
