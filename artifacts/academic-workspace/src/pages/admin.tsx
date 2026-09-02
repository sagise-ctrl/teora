import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Users,
  TrendingUp,
  Coins,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Shield,
  Settings,
  ScrollText,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import AdminLayout from "@/components/admin-layout";
import { customFetch } from "@/lib/api-client-react";
import { AdminStats, StatCard, formatCents } from "@/lib/admin-utils";

// - Admin Overview -

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "week" | "month">("month");

  useEffect(() => {
    customFetch<AdminStats>(`/api/admin/stats?period=${period}`)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <AdminLayout activeTab="/admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Overview sistem Teora: semua data dan konfigurasi
            </p>
          </div>
          <div className="flex items-center gap-2">
            {["today", "week", "month"].map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(p as typeof period)}
              >
                {p === "today" ? "Hari ini" : p === "week" ? "7 hari" : "Bulan ini"}
              </Button>
            ))}
          </div>
        </div>

        {/* Owner Notice */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
          <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Test Mode Active</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Anda mengakses Admin Dashboard sebagai Owner. Token unlimited, payment disabled.
              Usage owner tetap tercatat untuk laporan cost.
            </p>
          </div>
        </div>

        {/* Financial Stats */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Financial Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </>
            ) : stats ? (
              <>
                <StatCard
                  title="Total Pengguna"
                  value={stats.totals.users.toLocaleString()}
                  sub={`${stats.totals.projects} projects`}
                  icon={Users}
                  accent="blue"
                />
                <StatCard
                  title="Permintaan Teora"
                  value={stats.totals.aiRequests.toLocaleString()}
                  sub={`${stats.totals.inputTokens.toLocaleString()} input / ${stats.totals.outputTokens.toLocaleString()} output tokens`}
                  icon={Zap}
                  accent="purple"
                />
                <StatCard
                  title="Revenue"
                  value={formatCents(stats.revenue.totalTopupCents)}
                  sub={`${stats.revenue.transactionCount} transactions`}
                  icon={TrendingUp}
                  accent="green"
                />
                <StatCard
                  title="Biaya Teora"
                  value={`$${stats.totals.aiCostUsd.toFixed(2)}`}
                  sub={`Gross margin: ${stats.revenue.grossMargin}%`}
                  icon={Coins}
                  accent="amber"
                />
              </>
            ) : (
              <div className="col-span-4 text-center py-8 text-muted-foreground">
                Gagal memuat statistik. Pastikan backend berjalan.
              </div>
            )}
          </div>
        </div>

        {/* Usage Breakdown */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Owner Usage */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Usage Owner (Mode Test)</CardTitle>
                <CardDescription>Usage owner tetap tercatat untuk laporan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stats.ownerUsage.totalRequests.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Permintaan Teora</p>
                    <p className="text-xs text-muted-foreground">${stats.ownerUsage.totalCostUsd.toFixed(2)} cost</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Consumers */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pengguna Aktif Teratas</CardTitle>
                <CardDescription>Pengguna dengan usage tertinggi periode ini</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.topConsumers.length > 0 ? (
                  <div className="space-y-2">
                    {stats.topConsumers.slice(0, 5).map((c, i) => (
                      <div key={c.userId} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                          <span className="text-sm font-mono">{c.userId.slice(0, 8)}...</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium">{c.requests}</span>
                          <span className="text-xs text-muted-foreground ml-1">reqs</span>
                          <span className="text-xs text-muted-foreground ml-2">${c.costUsd.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Belum ada usage</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Navigation */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Manage</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: "Pengguna", href: "/admin/users", icon: Users, desc: "Kelola pengguna" },
              { label: "Financial", href: "/admin/finops", icon: TrendingUp, desc: "Revenue & cost" },
              { label: "Usage Teora", href: "/admin/usage", icon: Coins, desc: "Usage breakdown" },
              { label: "Tier Teora", href: "/admin/ai-tiers", icon: Settings, desc: "Pricing config" },
              { label: "System", href: "/admin/health", icon: Activity, desc: "Health & alerts" },
              { label: "Audit Log", href: "/admin/audit-log", icon: ScrollText, desc: "Admin actions" },
              { label: "Reports", href: "/admin/reports", icon: ScrollText, desc: "Report archive" },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <Card className="cursor-pointer hover:border-[#2D79FF]/30 hover:shadow-sm transition-all">
                  <CardContent className="p-4 text-center">
                    <item.icon className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
