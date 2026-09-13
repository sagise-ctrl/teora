/**
 * Payment Webhook Handler — gateway-agnostic referral reward trigger
 *
 * Designed to be plug-in ready for any payment gateway (Midtrans, Xendit, Duitku, Stripe).
 * Each gateway implementation translates its native webhook payload to the standard
 * `PaymentSuccessEvent` shape consumed by `processReferralPayment()`.
 *
 * Endpoint: POST /api/webhooks/payment-success
 *
 * Signature verification (HMAC-SHA256) — placeholder for now.
 * When payment gateway is chosen, replace `verifyWebhookSignature()` with the
 * gateway's specific verification (e.g., Midtrans SHA-512, Xendit HMAC-SHA256).
 *
 * Idempotency:
 *   - `paymentEventId` is required and unique per gateway-issued event.
 *   - Replay is safe — see `processReferralPayment()`.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod/v4";
import {
  processReferralPayment,
  type PaymentMethod,
  type PaymentSuccessEvent,
} from "../lib/referral-rewards.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Signature verification (placeholder for gateway-specific impl)
// ---------------------------------------------------------------------------

const WEBHOOK_SECRET = process.env.REFERRAL_WEBHOOK_SECRET ?? "";

/**
 * Verify HMAC-SHA256 signature of the raw body.
 * Header: `x-webhook-signature: sha256=<hex>`
 *
 * H4 fix: req.body is a Buffer (from express.raw() middleware in app.ts).
 * The raw bytes are used directly — no JSON.stringify() which can alter the payload
 * (whitespace normalization, key ordering, number precision).
 *
 * Replace this with gateway-specific verification when payment provider is chosen.
 * Example for Midtrans: SHA-512 of `body + server_key` compared to `signature_key`.
 * Example for Stripe: HMAC-SHA256 of body using `stripe.webhook_secret`, header `Stripe-Signature`.
 */
function verifyWebhookSignature(req: Request): boolean {
  if (!WEBHOOK_SECRET) {
    // No secret configured → reject (secure default)
    logger.warn(
      "[webhook] REFERRAL_WEBHOOK_SECRET not set — rejecting webhook"
    );
    return false;
  }

  const sigHeader = req.headers["x-webhook-signature"];
  if (typeof sigHeader !== "string") return false;

  const expected = sigHeader.startsWith("sha256=")
    ? sigHeader.slice(7)
    : sigHeader;

  // req.body is a Buffer when mounted with express.raw({ type: "application/json" })
  const bodyBuffer = req.body as Buffer | undefined;
  if (!bodyBuffer || !Buffer.isBuffer(bodyBuffer)) {
    logger.warn("[webhook] body is not a Buffer — express.raw() middleware missing?");
    return false;
  }

  const computed = createHmac("sha256", WEBHOOK_SECRET)
    .update(bodyBuffer)
    .digest("hex");

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(computed, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Request schema (gateway-agnostic)
// ---------------------------------------------------------------------------

const WebhookPayloadSchema = z.object({
  paymentEventId: z.string().min(1),
  userId: z.string().min(1),
  paidAmountCents: z.number().int().positive(),
  method: z.enum(["subscription", "topup"]),
  paidAt: z
    .string()
    .datetime()
    .transform((s) => new Date(s)),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

// ---------------------------------------------------------------------------
// POST /webhooks/payment-success
// ---------------------------------------------------------------------------

router.post("/webhooks/payment-success", async (req, res): Promise<void> => {
  // Verify signature first (before any body parsing)
  if (!verifyWebhookSignature(req)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  // req.body is a Buffer from express.raw() — parse to JSON for Zod validation
  let rawBody: unknown;
  try {
    rawBody = JSON.parse((req.body as Buffer).toString());
  } catch {
    res.status(400).json({ error: "Invalid JSON payload" });
    return;
  }

  // Validate payload
  const parseResult = WebhookPayloadSchema.safeParse(rawBody);
  if (!parseResult.success) {
    logger.warn(
      { issues: parseResult.error.issues },
      "[webhook] invalid payload"
    );
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const payload: WebhookPayload = parseResult.data;

  const event: PaymentSuccessEvent = {
    paymentEventId: payload.paymentEventId,
    userId: payload.userId,
    paidAmountCents: payload.paidAmountCents,
    method: payload.method as PaymentMethod,
    paidAt: payload.paidAt,
    metadata: payload.metadata,
  };

  try {
    const result = await processReferralPayment(event);

    logger.info(
      {
        paymentEventId: event.paymentEventId,
        userId: event.userId,
        refereeCashback: result.refereeCashback,
        referrerReward: result.referrerReward,
      },
      "[webhook] payment processed"
    );

    res.status(200).json({
      ok: true,
      refereeCashback: result.refereeCashback,
      referrerReward: result.referrerReward,
    });
  } catch (err) {
    logger.error(
      { err, paymentEventId: event.paymentEventId, userId: event.userId },
      "[webhook] failed to process payment"
    );
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to process payment" });
    }
  }
});

export default router;
