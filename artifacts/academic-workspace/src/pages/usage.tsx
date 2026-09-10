import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useGetMyBalance } from "@/lib/api-client-react";
import { customFetch } from "@/lib/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import {
  Coins,
  ArrowLeft,
  Package,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  TrendingDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

function formatIDR(cents: number | undefined | null): string {
  const value = typeof cents === "number" ? cents : 0;
  return (value / 100).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

// Token-to-hours conversion: Haiku ~50 tokens/sec, Sonnet ~30 tokens/sec
const TOKENS_PER_SECOND_HAIKU = 50;
const TOKENS_PER_SECOND_SONNET = 30;
const TOKENS_PER_HOUR = (rate: number) => rate * 3600;

function tokensToHours(tokens: number, rate: number): number {
  return tokens / TOKENS_PER_HOUR(rate);
}

// API response types
interface PackageInfo {
  tier: string;
  tierName: string;
  periodDays: number;
  periodName: string;
  modelType: string;
  quota5hHaikuTokens: number;
  quota5hSonnetTokens: number;
  quota7dHaikuTokens: number;
  quota7dSonnetTokens: number;
}

interface SubscriptionData {
  subscription: {
    id: string;
    package: PackageInfo;
    status: string;
    startsAt: string;
    expiresAt: string;
    autoRenew: boolean;
    usageAnchorAt: string | null;
  } | null;
  usageWindows: Array<{
    id: string;
    modelType: string;
    windowType: string;
    windowNumber: number;
    windowStartAt: string;
    windowEndAt: string;
    haikuTokensUsed: number;
    sonnetTokensUsed: number;
    quotaHaikuTokens: number;
    quotaSonnetTokens: number;
    isExhausted: boolean;
    isActive: boolean;
  }>;
  maxWindows: number;
}

function UsageBar({
  used,
  limit,
  unit,
  color,
}: {
  used: number;
  limit: number;
  unit: string;
  color: string;
}) {
  const pct = Math.min(100, (used / limit) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {used.toFixed(1)} / {limit} {unit}
        </span>
        <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function UsageColumn({
  label,
  used,
  limit,
  unit,
  resetAt,
  color,
  icon: Icon,
}: {
  label: string;
  used: number;
  limit: number;
  unit: string;
  resetAt: string;
  color: string;
  icon: React.ElementType;
}) {
  const remaining = Math.max(0, limit - used);

  return (
    <Card className="bg-card border-border/50 flex-1">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-xs text-muted-foreground/60">
              {remaining.toFixed(1)} {unit} tersisa
            </p>
          </div>
        </div>

        <UsageBar used={used} limit={limit} unit={unit} color={color} />

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3 shrink-0" />
          <span>Reset {resetAt}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function DailyHistoryRow({
  date,
  hours,
  costCents,
  defaultOpen = false,
}: {
  date: string;
  hours: number;
  costCents: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/30 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 px-1 hover:bg-muted/30 rounded transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
            {open ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
          <span className="text-sm font-medium">{date}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-mono">{hours.toFixed(1)} jam</span>
          <span className="font-mono">{formatIDR(costCents)}</span>
        </div>
      </button>
      {open && (
        <div className="px-1 pb-3 pl-10 text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Durasi aktif</span>
            <span className="font-mono">{hours.toFixed(1)} jam</span>
          </div>
          <div className="flex justify-between">
            <span>Biaya</span>
            <span className="font-mono">{formatIDR(costCents)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Usage() {
  const { data: balance } = useGetMyBalance();
  const { token } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    customFetch<SubscriptionData>("/api/users/me/subscription")
      .then(setSubscriptionData)
      .catch(() => setError("Gagal memuat data langganan"))
      .finally(() => setLoading(false));
  }, [token]);

  // Compute 5h and 7d usage from windows
  const active5hWindow = subscriptionData?.usageWindows.find(
    (w) => w.windowType === "5h" && w.isActive,
  );
  const active7dWindow = subscriptionData?.usageWindows.find(
    (w) => w.windowType === "7d" && w.isActive,
  );

  const quota5hHours = tokensToHours(
    (subscriptionData?.subscription?.package?.quota5hHaikuTokens ?? 0) +
    (subscriptionData?.subscription?.package?.quota5hSonnetTokens ?? 0),
    TOKENS_PER_SECOND_HAIKU,
  );
  const quota7dHours = tokensToHours(
    (subscriptionData?.subscription?.package?.quota7dHaikuTokens ?? 0) +
    (subscriptionData?.subscription?.package?.quota7dSonnetTokens ?? 0),
    TOKENS_PER_SECOND_HAIKU,
  );

  const used5hHours = active5hWindow
    ? tokensToHours(
        active5hWindow.haikuTokensUsed + active5hWindow.sonnetTokensUsed,
        TOKENS_PER_SECOND_HAIKU,
      )
    : 0;
  const used7dHours = active7dWindow
    ? tokensToHours(
        active7dWindow.haikuTokensUsed + active7dWindow.sonnetTokensUsed,
        TOKENS_PER_SECOND_HAIKU,
      )
    : 0;

  // Build daily history from windows
  const history = (subscriptionData?.usageWindows ?? []).map((w) => {
    const totalTokens = w.haikuTokensUsed + w.sonnetTokensUsed;
    const hours = tokensToHours(totalTokens, TOKENS_PER_SECOND_HAIKU);
    const date = new Date(w.windowStartAt);
    const dateStr = date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return {
      date: dateStr,
      hours,
      costCents: 0,
    };
  });

  // Fallback for display
  const subscription = subscriptionData?.subscription
    ? {
        packageName: subscriptionData.subscription.package?.tierName ?? "Paket",
        packageTier: subscriptionData.subscription.package?.tier ?? "",
        expiresAt: subscriptionData.subscription.expiresAt,
      }
    : null;

  const usage5h = {
    used: used5hHours,
    limit: Math.round(quota5hHours),
    unit: "jam",
    resetAt: active5hWindow
      ? `pk ${new Date(active5hWindow.windowEndAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
      : "-",
  };

  const usage7d = {
    used: used7dHours,
    limit: Math.round(quota7dHours),
    unit: "jam",
    resetAt: active7dWindow
      ? new Date(active7dWindow.windowEndAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        })
      : "-",
  };

  const balanceCents = balance?.balanceCents ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-tight">
              Penggunaan
            </h1>
            <p className="text-sm text-muted-foreground">
              Pantau penggunaan paket dan saldo akun Anda.
            </p>
          </div>
        </div>
      </div>

      {/* Active Package — loading / error / no-sub / real */}
      {loading ? (
        <Card className="bg-gradient-to-br from-[#2D79FF]/8 via-[#8E54E9]/5 to-transparent border-border/50">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="bg-destructive/5 border-destructive/30">
          <CardContent className="p-5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium">{error}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Menghubungi admin jika masalah berlanjut.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : !subscription ? (
        <Card className="bg-gradient-to-br from-[#2D79FF]/8 via-[#8E54E9]/5 to-transparent border-border/50">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D79FF] to-[#8E54E9] flex items-center justify-center shrink-0 shadow-lg shadow-[#2D79FF]/20">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-muted-foreground">
                    Belum ada paket aktif
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Langganan paket untuk menikmati kuota AI tanpa batas saldo.
                  </p>
                </div>
              </div>
              <Link href="/subscribe">
                <Button variant="outline" size="sm" className="text-xs shrink-0">
                  Lihat Paket
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-br from-[#2D79FF]/8 via-[#8E54E9]/5 to-transparent border-border/50">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D79FF] to-[#8E54E9] flex items-center justify-center shrink-0 shadow-lg shadow-[#2D79FF]/20">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold">{subscription.packageName}</p>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4 bg-gradient-to-r from-[#2D79FF]/10 to-[#8E54E9]/10 text-[#2D79FF] border-0 font-medium"
                    >
                      Aktif
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Berakhir {formatDate(subscription.expiresAt)}
                    </p>
                  </div>
                </div>
              </div>
              <Link href="/subscribe">
                <Button variant="outline" size="sm" className="text-xs shrink-0">
                  Lihat Paket
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Columns: 5h + 7d — only show when there's a subscription or loading */}
      {(subscription || loading) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {loading ? (
            <>
              <Card className="bg-card border-border/50"><CardContent className="p-5 space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-2 w-full" /><Skeleton className="h-3 w-16" /></CardContent></Card>
              <Card className="bg-card border-border/50"><CardContent className="p-5 space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-2 w-full" /><Skeleton className="h-3 w-16" /></CardContent></Card>
            </>
          ) : (
            <>
              <UsageColumn
                label="Batas 5 Jam"
                used={usage5h.used}
                limit={usage5h.limit}
                unit={usage5h.unit}
                resetAt={usage5h.resetAt}
                color="#2D79FF"
                icon={Clock}
              />
              <UsageColumn
                label="Batas 7 Hari"
                used={usage7d.used}
                limit={usage7d.limit}
                unit={usage7d.unit}
                resetAt={usage7d.resetAt}
                color="#8E54E9"
                icon={TrendingDown}
              />
            </>
          )}
        </div>
      )}

      {/* Saldo */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shrink-0 shadow-lg shadow-[#10B981]/20">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Sisa Saldo
                </p>
                <p className="text-xl font-bold font-mono">
                  {balance?.balanceDisplay ?? formatIDR(balanceCents)}
                </p>
              </div>
            </div>
            <Link href="/topup">
              <Button variant="outline" size="sm" className="text-xs shrink-0">
                Topup
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Daily History */}
      {(subscription || loading) && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">
                Riwayat Harian
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {history.length > 0 ? `${history.length} hari` : ""}
              </span>
            </div>
          </CardHeader>
          <CardContent className="px-3">
            {loading ? (
              <div className="space-y-3 py-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            ) : history.length > 0 ? (
              history.map((day, i) => (
                <DailyHistoryRow
                  key={day.date}
                  date={day.date}
                  hours={day.hours}
                  costCents={day.costCents}
                  defaultOpen={i === 0}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Belum ada riwayat penggunaan.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
