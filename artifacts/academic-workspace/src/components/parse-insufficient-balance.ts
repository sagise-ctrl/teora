import { ApiError } from "@/lib/api-client-react/custom-fetch";
import type { InsufficientBalanceData } from "./insufficient-balance-dialog";

/**
 * Detects an HTTP 402 (Payment Required) error from the API client and
 * extracts the insufficient-balance payload.
 *
 * Returns null if the error is not a 402 or the payload is missing.
 */
export function parseInsufficientBalance(
  err: unknown
): InsufficientBalanceData | null {
  if (!(err instanceof ApiError)) return null;
  if (err.status !== 402) return null;

  const data = err.data as
    | (InsufficientBalanceData & Record<string, unknown>)
    | null;
  if (!data || typeof data !== "object") return null;

  return {
    error: data.error,
    balanceCents: data.balanceCents,
    costCents: data.costCents,
    tierName: data.tierName,
  };
}