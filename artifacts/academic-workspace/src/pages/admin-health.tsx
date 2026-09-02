import { useState, useEffect } from "react";
import { Activity, CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/admin-layout";

interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  latencyMs: number | null;
  lastChecked: string;
  message?: string;
}

export default function AdminHealth() {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    try {
      const checks = [
        { name: "API Server", url: "/api/healthz" },
        { name: "Database", url: "/api/admin/me" },
      ];
      const results: ServiceHealth[] = await Promise.all(
        checks.map(async (check) => {
          const start = Date.now();
          try {
            const res = await fetch(import.meta.env.VITE_API_URL + check.url, {
              credentials: "include",
            });
            const latency = Date.now() - start;
            return {
              name: check.name,
              status: res.ok ? "healthy" : "degraded",
              latencyMs: latency,
              lastChecked: new Date().toISOString(),
              message: res.ok ? "Operational" : `HTTP ${res.status}`,
            } as ServiceHealth;
          } catch {
            return {
              name: check.name,
              status: "down",
              latencyMs: null,
              lastChecked: new Date().toISOString(),
              message: "Connection failed",
            } as ServiceHealth;
          }
        })
      );
      setServices(results);
    } catch {
      setServices([
        { name: "API Server", status: "unknown", latencyMs: null, lastChecked: new Date().toISOString() },
        { name: "Database", status: "unknown", latencyMs: null, lastChecked: new Date().toISOString() },
      ]);
    } finally {
      setChecking(false);
      setLoading(false);
    }
  };

  useEffect(() => { checkHealth(); }, []);

  const statusConfig = {
    healthy: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "Healthy" },
    degraded: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Degraded" },
    down: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Down" },
    unknown: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted/30 border-border", label: "Unknown" },
  };

  return (
    <AdminLayout activeTab="/admin/health">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-tight">System Health</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Status dan latency semua service</p>
          </div>
          <Button variant="outline" size="sm" onClick={checkHealth} disabled={checking}>
            <RefreshCw className={`w-4 h-4 mr-2 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking..." : "Refresh"}
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {(["healthy", "degraded", "down"] as const).map((status) => {
            const count = services.filter((s) => s.status === status).length;
            const cfg = statusConfig[status];
            return (
              <Card key={status} className={cfg.bg}>
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold ${cfg.color}`}>{count}</p>
                  <p className="text-xs font-medium mt-1">{cfg.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Service List */}
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)
          ) : (
            services.map((svc) => {
              const cfg = statusConfig[svc.status];
              const Icon = cfg.icon;
              return (
                <Card key={svc.name} className={cfg.bg}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${cfg.color}`} />
                        <div>
                          <p className="font-medium text-sm">{svc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {svc.message ?? cfg.label}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {svc.latencyMs !== null ? (
                          <p className="text-sm font-mono">{svc.latencyMs}ms</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">:</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(svc.lastChecked).toLocaleTimeString("id-ID")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Uptime Notice */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Vercel serverless functions automatically scale. Health checks here
              hanya mengukur latency request dari browser Anda. Untuk monitoring production yang lebih
              baik, cek <a href="https://vercel.com/dashboard" className="underline" target="_blank" rel="noreferrer">Vercel Dashboard</a>.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
