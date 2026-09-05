import { useState } from "react";
import { Link } from "wouter";
import { useGetMyUsageStats, useGetMyBalance } from "@/lib/api-client-react";
import type { FinOpsUserUsageStatsPeriod } from "@/lib/api-client-react";
import {
  Coins,
  Cpu,
  FileText,
  ActivitySquare,
  Wallet,
  ArrowLeft,
  BarChart3,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { FinOpsUserUsageStatsByRequestType } from "@/lib/api-client-react";

const PERIODS: { label: string; value: FinOpsUserUsageStatsPeriod }[] = [
  { label: "7 Hari", value: "7d" },
  { label: "30 Hari", value: "30d" },
  { label: "Semua", value: "all" },
];

const REQUEST_TYPE_LABELS: Record<string, string> = {
  chat: "Chat Teora",
  analyze: "Analisis",
  write: "Penulisan",
  bibliography: "Bibliografi",
  export: "Ekspor",
};

const REQUEST_TYPE_COLORS: Record<string, string> = {
  chat: "#2D79FF",
  analyze: "#8E54E9",
  write: "#10B981",
  bibliography: "#F59E0B",
  export: "#EF4444",
};

function formatNumber(n: number | undefined | null): string {
  if (n == null || typeof n !== "number") return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("id-ID");
}

function formatIDR(cents: number | undefined | null): string {
  const value = typeof cents === "number" ? cents : 0;
  return (value / 100).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
}

function CssBar({
  label,
  value,
  max,
  color,
  subLabel,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  subLabel?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground font-mono text-xs">
          {subLabel ?? formatNumber(value)}
        </span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  color: string;
}) {
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold font-mono tracking-tight">{value}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground">{subValue}</p>
            )}
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TokenBalanceSection() {
  const { data: balance, isLoading } = useGetMyBalance();

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-[#2D79FF]/5 via-[#8E54E9]/5 to-transparent border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-7 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const balanceCents = balance?.balanceCents ?? 0;
  return (
    <Card className="bg-gradient-to-br from-[#2D79FF]/5 via-[#8E54E9]/5 to-transparent border-border/50">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D79FF] to-[#8E54E9] flex items-center justify-center shrink-0 shadow-lg shadow-[#2D79FF]/20">
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
              <Wallet className="w-3.5 h-3.5 mr-1.5" />
              Topup
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function RequestTypeBreakdown({
  byRequestType,
}: {
  byRequestType: FinOpsUserUsageStatsByRequestType | undefined;
}) {
  if (!byRequestType || Object.keys(byRequestType).length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
        Belum ada data penggunaan untuk periode ini.
      </div>
    );
  }

  const entries = Object.entries(byRequestType).filter(
    ([, v]) => (v.requests ?? 0) > 0
  );
  const maxCost = Math.max(
    ...entries.map(([, v]) => v.costCents ?? 0),
    1
  );

  return (
    <div className="space-y-4">
      {entries
        .sort(([, a], [, b]) => (b.costCents ?? 0) - (a.costCents ?? 0))
        .map(([type, v]) => (
          <CssBar
            key={type}
            label={REQUEST_TYPE_LABELS[type] ?? type}
            value={v.costCents ?? 0}
            max={maxCost}
            color={REQUEST_TYPE_COLORS[type] ?? "#94A3B8"}
            subLabel={`${formatNumber(v.requests ?? 0)} permintaan · ${formatIDR(v.costCents ?? 0)}`}
          />
        ))}
    </div>
  );
}

function ProjectBreakdown({
  byProject,
}: {
  byProject: FinOpsUserUsageStatsByRequestType | undefined;
}) {
  if (!byProject || Object.keys(byProject).length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
        Belum ada data project untuk periode ini.
      </div>
    );
  }

  const entries = Object.entries(byProject).filter(
    ([, v]) => (v.requests ?? 0) > 0
  );
  const maxCost = Math.max(
    ...entries.map(([, v]) => v.costCents ?? 0),
    1
  );

  return (
    <div className="space-y-3">
      {entries
        .sort(([, a], [, b]) => (b.costCents ?? 0) - (a.costCents ?? 0))
        .slice(0, 8)
        .map(([projectId, v]) => (
          <Link key={projectId} href={`/projects/${projectId}`}>
            <div className="group cursor-pointer space-y-1.5 rounded-lg p-2 -mx-2 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium group-hover:text-[#2D79FF] transition-colors">
                  Project #{projectId}
                </span>
                <span className="text-muted-foreground font-mono text-xs">
                  {formatNumber(v.requests ?? 0)} permintaan · {formatIDR(v.costCents ?? 0)}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#2D79FF] transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.min(100, ((v.costCents ?? 0) / maxCost) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </Link>
        ))}
    </div>
  );
}

export default function Usage() {
  const [period, setPeriod] = useState<FinOpsUserUsageStatsPeriod>("all");

  const { data: stats, isLoading } = useGetMyUsageStats({ period });
  const { data: balance } = useGetMyBalance();

  const hasData =
    !isLoading && stats && (stats.totalRequests ?? 0) > 0;

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
              Penggunaan Teora
            </h1>
            <p className="text-sm text-muted-foreground">
              Pantau konsumsi token dan biaya penggunaan AI Anda.
            </p>
          </div>
        </div>
      </div>

      {/* Token Balance */}
      <TokenBalanceSection />

      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                period === p.value
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : hasData ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={ActivitySquare}
            label="Total Permintaan"
            value={formatNumber(stats!.totalRequests)}
            subValue="di semua fitur"
            color="#2D79FF"
          />
          <StatCard
            icon={Cpu}
            label="Token Input"
            value={formatNumber(stats!.totalInputTokens)}
            subValue="dikirim ke model"
            color="#8E54E9"
          />
          <StatCard
            icon={FileText}
            label="Token Output"
            value={formatNumber(stats!.totalOutputTokens)}
            subValue="diterima dari model"
            color="#10B981"
          />
          <StatCard
            icon={Wallet}
            label="Total Biaya"
            value={formatIDR(stats!.totalCostCents)}
            subValue="sesuai tarif aktif"
            color="#F59E0B"
          />
        </div>
      ) : (
        <Card className="bg-card border-border/50">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground text-sm">
              Belum ada data penggunaan untuk periode ini. Mulai buat project untuk melihat statistik penggunaan Teora Anda.
            </p>
            <Link href="/projects/new">
              <Button variant="outline" size="sm" className="mt-4">
                Buat Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Cost by Feature */}
      {hasData && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Biaya per Fitur
            </CardTitle>
            <CardDescription className="text-xs">
              Distribusi saldo terpakai berdasarkan jenis permintaan AI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RequestTypeBreakdown byRequestType={stats?.byRequestType} />
          </CardContent>
        </Card>
      )}

      {/* Project Breakdown */}
      {hasData && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Penggunaan per Project
            </CardTitle>
            <CardDescription className="text-xs">
              Konsumsi token dan biaya untuk masing-masing project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectBreakdown byProject={stats?.byProject} />
          </CardContent>
        </Card>
      )}

      {/* Request Type Detail Table */}
      {hasData && Object.keys(stats?.byRequestType ?? {}).length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Rincian Lengkap
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                    Fitur
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">
                    Permintaan
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">
                    Token Input
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">
                    Token Output
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">
                    Biaya
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats!.byRequestType)
                  .filter(([, v]) => (v.requests ?? 0) > 0)
                  .sort(([, a], [, b]) => (b.costCents ?? 0) - (a.costCents ?? 0))
                  .map(([type, v]) => (
                    <tr key={type} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{
                            borderColor: REQUEST_TYPE_COLORS[type] ?? "#94A3B8",
                            color: REQUEST_TYPE_COLORS[type] ?? "#94A3B8",
                            backgroundColor: `${REQUEST_TYPE_COLORS[type] ?? "#94A3B8"}15`,
                          }}
                        >
                          {REQUEST_TYPE_LABELS[type] ?? type}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                        {formatNumber(v.requests ?? 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                        {formatNumber(v.inputTokens ?? 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                        {formatNumber(v.outputTokens ?? 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium">
                        {formatIDR(v.costCents ?? 0)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
