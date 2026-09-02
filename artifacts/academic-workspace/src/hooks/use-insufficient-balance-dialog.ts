import { useState, useCallback } from "react";
import { parseInsufficientBalance } from "@/components/parse-insufficient-balance";
import type { InsufficientBalanceData } from "@/components/insufficient-balance-dialog";
import InsufficientBalanceDialog from "@/components/insufficient-balance-dialog";

/**
 * Hook for handling HTTP 402 (insufficient balance) responses from AI mutations.
 * Returns props to spread onto InsufficientBalanceDialog + a helper to call from onError.
 *
 * Usage:
 *   const insufficient = useInsufficientBalanceDialog()
 *   mutation.mutate(data, {
 *     onError: insufficient.handleError,
 *   })
 *   return <InsufficientBalanceDialog {...insufficient.dialogProps} />
 */
export function useInsufficientBalanceDialog() {
  const [data, setData] = useState<InsufficientBalanceData | null>(null);
  const [open, setOpen] = useState(false);

  const handleError = useCallback((err: unknown) => {
    const insufficient = parseInsufficientBalance(err);
    if (insufficient) {
      setData(insufficient);
      setOpen(true);
      return true;
    }
    return false;
  }, []);

  const dialogProps = {
    open,
    onOpenChange: setOpen,
    data,
  };

  return { handleError, dialogProps, InsufficientBalanceDialog };
}