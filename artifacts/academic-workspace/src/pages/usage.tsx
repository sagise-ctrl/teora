import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useGetMyBalance, getGetMyUsageDailyHistoryQueryOptions, getGetMyUsageWindowsQueryOptions } from "@/lib/api-client-react";
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

function formatHistoryDate(dateStr: string): string {
  // "YYYY-MM-DD" → "8 Sep 2026"
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatResetAt(isoDate: string): string {
  // "2026-09-13T22:00:00Z" → "Hari ini pk 22:00" or "13 Sep 2026"
  try {
    const d = new Date(isoDate);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return `Hari ini pk ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
    }
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return isoDate;
  }
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

  const { data: windowsData, isLoading: windowsLoading } = useQuery(
    getGetMyUsageWindowsQueryOptions()
  );
  const { data: dailyData, isLoading: dailyLoading } = useQuery(
    getGetMyUsageDailyHistoryQueryOptions({ days: 7 })
  );

  // Default fallback for subscription
  const subscription = windowsData?.subscription ?? {
    packageName: "Tanpa Paket",
    packageTier: null,
    expiresAt: null,
  };

  // Default fallback for usage windows
  const windows5h = windowsData?.windows5h ?? {
    usedHours: 0, limitHours: 0, resetAt: "",
  };
  const windows7d = windowsData?.windows7d ?? {
    usedHours: 0, limitHours: 0, resetAt: "",
  };

  // Map API response to component shape
  const usage5h = {
    used: windows5h.usedHours,
    limit: windows5h.limitHours,
    unit: "jam",
    resetAt: windows5h.resetAt ? formatResetAt(windows5h.resetAt) : "-",
  };
  const usage7d = {
    used: windows7d.usedHours,
    limit: windows7d.limitHours,
    unit: "jam",
    resetAt: windows7d.resetAt ? formatResetAt(windows7d.resetAt) : "-",
  };

  // Map daily history
  const history = (dailyData?.history ?? []).map((day) => ({
    date: formatHistoryDate(day.date ?? ""),
    hours: day.hours ?? 0,
    costCents: day.costCents ?? 0,
  }));

  const todayUsage = history[0];
  const totalHistoryCost = history.reduce((s, d) => s + d.costCents, 0);
  const balanceCents = balance?.balanceCents ?? 0;

  const isLoading = windowsLoading || dailyLoading;

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

      {/* Active Package */}
      <Card className="bg-gradient-to-br from-[#2D79FF]/8 via-[#8E54E9]/5 to-transparent border-border/50">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D79FF] to-[#8E54E9] flex items-center justify-center shrink-0 shadow-lg shadow-[#2D79FF]/20">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ) : (
                  <>
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
                        {subscription.expiresAt
                          ? `Berakhir ${formatDate(subscription.expiresAt)}`
                          : "Tidak ada paket aktif"}
                      </p>
                    </div>
                  </>
                )}
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

      {/* Usage Columns: 5h + 7d */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isLoading ? (
          <>
            <Card className="bg-card border-border/50 flex-1">
              <CardContent className="p-5 space-y-4">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
            <Card className="bg-card border-border/50 flex-1">
              <CardContent className="p-5 space-y-4">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
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
                {todayUsage && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hari ini terpakai{" "}
                    <span className="font-mono font-medium">
                      {formatIDR(todayUsage.costCents)}
                    </span>
                  </p>
                )}
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
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              Riwayat Harian
            </CardTitle>
            {!isLoading && (
              <span className="text-xs text-muted-foreground">
                Total {formatIDR(totalHistoryCost)} &middot; {history.length} hari
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Belum ada data penggunaan.
            </p>
          ) : (
            history.map((day, i) => (
              <DailyHistoryRow
                key={day.date}
                date={day.date}
                hours={day.hours}
                costCents={day.costCents}
                defaultOpen={i === 0}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
