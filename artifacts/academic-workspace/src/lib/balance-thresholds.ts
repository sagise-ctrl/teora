/**
 * Threshold saldo rendah untuk UI warning.
 * Single source of truth — owner-approved 2026-09-05.
 *
 * - SALDO_WARNING_CENTS: Saldo di bawah threshold ini → sidebar jadi oranye + AlertCircle
 * - SALDO_BANNER_CENTS: Saldo di bawah threshold ini → banner muncul di semua protected pages
 *
 * Backend BLOCK sudah di 0 cents (return 402 + insufficient-balance-dialog).
 *
 * Approx: Rp 20.000 ≈ ~20.000 short essay requests, Rp 10.000 ≈ ~10.000 requests.
 * (Asumsi Rp 1.000 ≈ 1.000 token, free tier cost = 0).
 */
export const SALDO_WARNING_CENTS = 20000; // Rp 20.000
export const SALDO_BANNER_CENTS = 10000;  // Rp 10.000

/**
 * localStorage key untuk dismiss banner. Format: low_banner_dismissed_{userId}_{YYYYMMDD}.
 * Banner auto-show lagi besok kalau saldo masih di bawah threshold.
 */
export const BANNER_STORAGE_PREFIX = "low_banner_dismissed_";
