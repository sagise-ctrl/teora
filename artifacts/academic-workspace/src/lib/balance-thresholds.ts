/**
 * Threshold saldo rendah untuk visual indicator di sidebar.
 * Single source of truth — owner-approved 2026-09-05.
 *
 * - SALDO_WARNING_CENTS: Saldo di bawah threshold ini → sidebar jadi oranye + AlertCircle
 *   (visual cue saja; banner eksplisit sudah dihapus per owner 2026-09-08)
 *
 * Backend BLOCK sudah di 0 cents (return 402 + insufficient-balance-dialog).
 *
 * Approx: Rp 20.000 ≈ ~20.000 short essay requests, Rp 10.000 ≈ ~10.000 requests.
 * (Asumsi Rp 1.000 ≈ 1.000 token, free tier cost = 0).
 */
export const SALDO_WARNING_CENTS = 20000; // Rp 20.000
