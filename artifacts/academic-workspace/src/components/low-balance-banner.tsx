import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AlertTriangle, X, Coins } from "lucide-react";
import { SALDO_BANNER_CENTS, BANNER_STORAGE_PREFIX } from "@/lib/balance-thresholds";
import { useAuth } from "@/hooks/use-auth";

interface LowBalanceBannerProps {
  balanceCents: number;
}

function getDismissKey(userId: string): string {
  const today = new Date().toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // id-ID format: DD/MM/YYYY → rearrange to YYYYMMDD
  const [day, month, year] = today.split("/");
  return `${BANNER_STORAGE_PREFIX}${userId}_${year}${month}${day}`;
}

function readDismissed(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(key: string): void {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // localStorage unavailable — ignore
  }
}

export function LowBalanceBanner({ balanceCents }: LowBalanceBannerProps) {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!user?.id) return;
    const key = getDismissKey(user.id);
    setDismissed(readDismissed(key));
  }, [user?.id]);

  if (!mounted) return null;
  if (balanceCents >= SALDO_BANNER_CENTS) return null;
  if (!user?.id) return null;
  if (dismissed) return null;

  const handleDismiss = () => {
    const key = getDismissKey(user.id);
    writeDismissed(key);
    setDismissed(true);
  };

  return (
    <div className="mx-auto max-w-6xl mb-4">
      <div className="flex items-center gap-3 rounded-lg border border-orange-500/30 bg-orange-50 dark:bg-orange-950/20 px-4 py-3">
        <div className="shrink-0">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
            Saldo hampir habis
          </p>
          <p className="text-xs text-orange-700/70 dark:text-orange-300/60">
            Sisa saldo Anda di bawah Rp {(SALDO_BANNER_CENTS / 100).toLocaleString("id-ID")}. Topup sekarang untuk terus menggunakan fitur AI.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Link href="/topup">
            <button className="flex items-center gap-1.5 text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-md transition-colors">
              <Coins className="w-3.5 h-3.5" />
              Topup
            </button>
          </Link>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-orange-500/60 hover:text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-md transition-colors"
            title="Tutup untuk hari ini"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
