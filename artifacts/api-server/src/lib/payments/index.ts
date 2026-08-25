/**
 * Payment Gateway Module (STUB)
 *
 * STATUS: NOT IMPLEMENTED. Owner belum memilih payment gateway.
 *
 * STRIPE: DITOLAK oleh owner (biaya tinggi untuk pasar Indonesia).
 *
 * Options to evaluate:
 *   - Midtrans (https://midtrans.com) — Lokal Indonesia, support QRIS/VA/e-wallet
 *   - Xendit (https://xendit.co) — Lokal Indonesia, support QRIS/VA/e-wallet
 *   - Duitku — Lokal Indonesia
 *
 * DESIGN GOALS:
 *   1. Single interface (`PaymentProvider`) so switching is trivial.
 *   2. Topup flow: user picks nominal → server creates invoice → user pays →
 *      payment gateway sends webhook → server verifies signature → adds credit
 *      to user_balances + inserts token_transactions record.
 *   3. Currency: IDR (no USD, no conversion).
 *   4. Minimum topup: TBD (pending owner decision).
 *
 * OWNER ACTIONS NEEDED BEFORE IMPLEMENTATION:
 *   1. Choose provider (Midtrans / Xendit / Duitku).
 *   2. Register merchant account (requires production website URL for KYC).
 *   3. Provide API key (server key) + webhook secret.
 *   4. Decide minimum topup amount.
 *   5. Configure webhook URL in payment gateway dashboard.
 *
 * Folder structure (planned):
 *   lib/payments/
 *     ├── index.ts            # Re-exports
 *     ├── types.ts            # PaymentProvider interface, TopupInvoice, WebhookEvent
 *     ├── providers/
 *     │     ├── midtrans.ts   # Midtrans implementation (when chosen)
 *     │     ├── xendit.ts     # Xendit implementation (when chosen)
 *     │     └── duitku.ts     # Duitku implementation (when chosen)
 *     └── verify.ts           # Signature verification helper
 */

export const PAYMENT_GATEWAY_STATUS = "NOT_CONFIGURED" as const;

export interface PaymentProvider {
  readonly name: "midtrans" | "xendit" | "duitku" | "stripe";
  createTopupInvoice(params: TopupInvoiceParams): Promise<TopupInvoice>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
}

export interface TopupInvoiceParams {
  userId: string;
  amountCents: number; // IDR cents
  description?: string;
  metadata?: Record<string, string>;
}

export interface TopupInvoice {
  invoiceId: string;
  paymentUrl: string;
  amountCents: number;
  expiresAt: Date;
}

export interface WebhookEvent {
  invoiceId: string;
  status: "pending" | "paid" | "expired" | "failed";
  paidAmountCents?: number;
  paidAt?: Date;
  metadata?: Record<string, string>;
}

/**
 * Returns the active payment provider. Currently throws because no provider configured.
 * After owner decision, this will instantiate the chosen provider.
 */
export function getPaymentProvider(): PaymentProvider {
  throw new Error(
    "Payment gateway belum dikonfigurasi. " +
      "Owner harus memilih provider (Midtrans/Xendit/Duitku) dan menambahkan API keys.",
  );
}