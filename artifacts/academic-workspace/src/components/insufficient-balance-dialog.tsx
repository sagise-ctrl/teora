import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Coins, TrendingUp, Sparkles } from "lucide-react";
import { Link } from "wouter";

export interface InsufficientBalanceData {
  error?: string;
  balanceCents?: number;
  costCents?: number;
  tierName?: string;
  tierId?: string;
}

interface InsufficientBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: InsufficientBalanceData | null;
}

function formatIdr(cents: number | undefined): string {
  if (cents === undefined || cents === null) return "—";
  return "Rp " + (cents / 100).toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

/**
 * Modal that appears when the user tries to use a paid AI tier but has insufficient credit.
 * Shows the deficit amount + a direct CTA to the topup page.
 */
export default function InsufficientBalanceDialog({
  open,
  onOpenChange,
  data,
}: InsufficientBalanceDialogProps) {
  const [, navigate] = useLocation();
  const [localData, setLocalData] = useState(data);

  useEffect(() => {
    if (open) setLocalData(data);
  }, [open, data]);

  if (!localData) return null;

  const deficit = (localData.costCents ?? 0) - (localData.balanceCents ?? 0);
  const suggestedTopup = Math.max(
    Math.ceil(deficit / 100000) * 100000, // round up to nearest Rp 1.000
    1000000 // minimum topup Rp 10.000
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Saldo Tidak Cukup</DialogTitle>
              <DialogDescription className="text-xs">
                {localData.error ?? "Saldo Anda tidak cukup untuk tier ini."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {localData.tierName && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-sm">
                Tier yang digunakan:{" "}
                <strong className="font-medium text-purple-700 dark:text-purple-300">
                  {localData.tierName}
                </strong>
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-muted/50 rounded-lg p-3">
              <Coins className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Saldo Anda
              </p>
              <p className="font-mono text-sm font-semibold mt-0.5">
                {formatIdr(localData.balanceCents)}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-orange-600 rotate-90" />
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <Coins className="w-4 h-4 mx-auto mb-1 text-red-500" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Biaya
              </p>
              <p className="font-mono text-sm font-semibold mt-0.5 text-red-600">
                {formatIdr(localData.costCents)}
              </p>
            </div>
          </div>

          {deficit > 0 && (
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
              <p className="text-xs text-orange-800 dark:text-orange-200">
                Kekurangan:{" "}
                <strong className="font-mono">{formatIdr(deficit)}</strong>
              </p>
              <p className="text-[10px] text-orange-700 dark:text-orange-300 mt-1">
                Minimum topup yang disarankan:{" "}
                <strong className="font-mono">{formatIdr(suggestedTopup)}</strong>
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Nanti
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] hover:opacity-90"
            onClick={() => {
              onOpenChange(false);
              navigate("/topup");
            }}
          >
            <Coins className="w-4 h-4 mr-2" />
            Topup Sekarang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}