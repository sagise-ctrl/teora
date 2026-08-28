import { useState, useEffect } from "react";
import { Zap, Clock, Hash, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLayout from "@/components/admin-layout";
import { customFetch } from "@/lib/api-client-react";
import { StatCard } from "@/lib/admin-utils";

interface UsageData {
  period: string;
  totalRequests: number;
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  byProvider: Record<string, { requests: number; costUsd: number }>;
  byModel: Record<string, { requests: number; costUsd: number }>;
  byRequestType: Record<string, number>;
  daily: Array<{ date: string; requests: number; costUsd: number }>;
}

export default function AdminUsage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month">("month");

  useEffect(() => {
    customFetch<UsageData>(`/api/admin/usage?period=${period}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <AdminLayout activeTab="/admin/usage">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-tight">AI Usage</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Token consumption dan cost breakdown</p>
          </div>
          <div className="flex items-center gap-2">
            {(["week", "month"] as const).map((p) => (
              <Button key={p} variant={period === p ? "default" : "outline"} size="sm" onClick={() => setPeriod(p)}>
                {p === "week" ? "7 hari" : "Bulan ini"}
              </Button>
            ))}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)
          ) : data ? (
            <>
              <StatCard title="Total Requests" value={data.totalRequests.toLocaleString()} icon={Zap} accent="purple" />
              <StatCard title="Input Tokens" value={data.inputTokens.toLocaleString()} icon={TrendingUp} accent="blue" />
              <StatCard title="Output Tokens" value={data.outputTokens.toLocaleString()} icon={TrendingUp} accent="green" />
              <StatCard title="Total Cost" value={`$${data.totalCostUsd.toFixed(2)}`} icon={Clock} accent="amber" />
            </>
          ) : (
            <div className="col-span-4 text-center py-8 text-muted-foreground">Gagal memuat data</div>
          )}
        </div>

        {/* Breakdown */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By Provider */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">By Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(data.byProvider).map(([provider, info]) => (
                    <div key={provider} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{provider}</p>
                        <p className="text-xs text-muted-foreground">{info.requests.toLocaleString()} requests</p>
                      </div>
                      <span className="text-sm font-mono">${info.costUsd.toFixed(4)}</span>
                    </div>
                  ))}
                  {Object.keys(data.byProvider).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Tidak ada data</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* By Request Type */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">By Request Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(data.byRequestType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm font-mono text-muted-foreground">{type}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#2D79FF] rounded-full"
                            style={{ width: `${Math.min((count / data.totalRequests) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm w-16 text-right">{count.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  {Object.keys(data.byRequestType).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Tidak ada data</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* By Model */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">By Model</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(data.byModel).map(([model, info]) => (
                    <div key={model} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-mono font-medium">{model}</p>
                        <p className="text-xs text-muted-foreground">{info.requests.toLocaleString()} requests</p>
                      </div>
                      <span className="text-sm font-mono">${info.costUsd.toFixed(4)}</span>
                    </div>
                  ))}
                  {Object.keys(data.byModel).length === 0 && (
                    <p className="col-span-2 text-sm text-muted-foreground text-center py-4">Tidak ada data</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
