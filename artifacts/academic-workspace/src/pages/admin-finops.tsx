import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLayout from "@/components/admin-layout";
import { customFetch } from "@/lib/api-client-react";
import { StatCard, formatCents, formatUsd } from "@/lib/admin-utils";

interface FinStat {
  period: string;
  revenue: {
    totalTopupCents: number;
    totalRefundCents: number;
    transactionCount: number;
    grossRevenue: number;
    refunds: number;
    netRevenue: number;
    grossMargin: number;
  };
  costs: {
    totalAiCostUsd: number;
    byProvider: Record<string, number>;
    byModel: Record<string, number>;
  };
  summary: {
    avgRevenuePerTransaction: number;
    avgCostPerRequest: number;
    profitUsd: number;
  };
}

export default function AdminFinOps() {
  const [stats, setStats] = useState<FinStat | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "all">("month");

  useEffect(() => {
    customFetch<FinStat>(`/api/admin/stats?period=${period}`)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <AdminLayout activeTab="/admin/finops">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-tight">Financial Overview</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Revenue, costs, dan profit margin
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(["week", "month", "all"] as const).map((p) => (
              <Button key={p} variant={period === p ? "default" : "outline"} size="sm" onClick={() => setPeriod(p)}>
                {p === "week" ? "7 hari" : p === "month" ? "Bulan ini" : "Semua"}
              </Button>
            ))}
          </div>
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)
          ) : stats ? (
            <>
              <StatCard title="Gross Revenue" value={formatCents(stats.revenue.totalTopupCents)} sub={`${stats.revenue.transactionCount} transactions`} icon={DollarSign} accent="green" />
              <StatCard title="Refunds" value={formatCents(stats.revenue.totalRefundCents)} sub={`${stats.revenue.refunds} refund events`} icon={TrendingDown} accent="red" />
              <StatCard title="Net Revenue" value={formatCents(stats.revenue.netRevenue)} sub={`Margin: ${stats.revenue.grossMargin}%`} icon={TrendingUp} accent="blue" />
              <StatCard title="Biaya Teora" value={`$${stats.costs.totalAiCostUsd.toFixed(2)}`} sub={`Profit: ${formatUsd(stats.summary.profitUsd)}`} icon={PiggyBank} accent="amber" />
            </>
          ) : (
            <div className="col-span-4 text-center py-8 text-muted-foreground">Gagal memuat data</div>
          )}
        </div>

        {/* Profit Summary */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cost Breakdown by Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.costs.byProvider).map(([provider, cost]) => (
                    <div key={provider} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{provider}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] rounded-full"
                            style={{ width: `${Math.min((cost / stats.costs.totalAiCostUsd) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono w-16 text-right">${cost.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg revenue per transaction</span>
                    <span className="font-medium">{formatCents(stats.summary.avgRevenuePerTransaction)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg cost per permintaan Teora</span>
                    <span className="font-medium">${stats.summary.avgCostPerRequest.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-4">
                    <span className="text-sm font-medium">Net Profit</span>
                    <span className={`font-bold ${stats.summary.profitUsd >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatUsd(stats.summary.profitUsd)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
