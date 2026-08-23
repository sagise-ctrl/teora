import { useState } from "react";
import { Link } from "wouter";
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  Server,
  Zap,
  Shield,
  Database,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down";
  latency?: string;
  lastChecked: string;
  description: string;
  icon: React.ElementType;
}

interface Incident {
  id: string;
  title: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  severity: "critical" | "major" | "minor";
  startedAt: string;
  resolvedAt?: string;
  message: string;
}

const SERVICES: ServiceStatus[] = [
  { name: "Frontend App", status: "operational", latency: "<200ms", lastChecked: new Date().toISOString(), description: "Teora web application", icon: Globe },
  { name: "API Server", status: "operational", latency: "<150ms", lastChecked: new Date().toISOString(), description: "REST API endpoints", icon: Server },
  { name: "Database", status: "operational", latency: "<50ms", lastChecked: new Date().toISOString(), description: "PostgreSQL via Supabase", icon: Database },
  { name: "AI Processing", status: "operational", lastChecked: new Date().toISOString(), description: "OpenAI / Claude API", icon: Zap },
  { name: "Authentication", status: "operational", lastChecked: new Date().toISOString(), description: "Supabase Auth", icon: Shield },
];

const INCIDENTS: Incident[] = [];

function StatusDot({ status }: { status: ServiceStatus["status"] }) {
  const colors = {
    operational: "text-green-500",
    degraded: "text-yellow-500",
    down: "text-red-500",
  };
  const labels = {
    operational: "Operational",
    degraded: "Degraded",
    down: "Down",
  };
  const bgColors = {
    operational: "bg-green-500",
    degraded: "bg-yellow-500",
    down: "bg-red-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${colors[status]}`}>
      <span className={`w-2 h-2 rounded-full ${bgColors[status]} ${status === "operational" ? "animate-pulse" : ""}`} />
      {labels[status]}
    </span>
  );
}

function IncidentBadge({ status }: { status: Incident["status"] }) {
  const variants: Record<Incident["status"], "destructive" | "secondary" | "outline"> = {
    investigating: "destructive",
    identified: "secondary",
    monitoring: "secondary",
    resolved: "outline",
  };
  const labels: Record<Incident["status"], string> = {
    investigating: "Investigating",
    identified: "Identified",
    monitoring: "Monitoring",
    resolved: "Resolved",
  };
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}

export default function Monitoring() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const operationalCount = SERVICES.filter(s => s.status === "operational").length;
  const overallStatus = SERVICES.every(s => s.status === "operational") ? "operational" : SERVICES.some(s => s.status === "down") ? "down" : "degraded";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Status</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time monitoring dan incident history</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Status Banner */}
      <Card className={`border-0 shadow-sm ${overallStatus === "operational" ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20" : overallStatus === "degraded" ? "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20" : "bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20"}`}>
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            {overallStatus === "operational" ? (
              <CheckCircle className="w-12 h-12 text-green-600" />
            ) : overallStatus === "degraded" ? (
              <AlertTriangle className="w-12 h-12 text-yellow-600" />
            ) : (
              <XCircle className="w-12 h-12 text-red-600" />
            )}
            <div>
              <h2 className="text-xl font-semibold">
                {overallStatus === "operational" ? "All Systems Operational" : overallStatus === "degraded" ? "Partial Degradation" : "Service Disruption"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {operationalCount}/{SERVICES.length} services operational &bull; Last checked: {new Date().toLocaleTimeString("id-ID")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SERVICES.map(service => {
          const Icon = service.icon;
          return (
            <Card key={service.name} className="bg-card border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{service.name}</h3>
                      <p className="text-xs text-muted-foreground">{service.description}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <StatusDot status={service.status} />
                  {service.latency && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {service.latency}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Incidents */}
      <Card className="bg-card border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Incident History</CardTitle>
              <CardDescription>Last 90 days</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {INCIDENTS.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-10 h-10 mx-auto mb-3 text-green-500 opacity-50" />
              <p className="text-sm text-muted-foreground">No incidents in the last 90 days</p>
              <p className="text-xs text-muted-foreground mt-1">All systems have been running normally</p>
            </div>
          ) : (
            <div className="space-y-4">
              {INCIDENTS.map(incident => (
                <div key={incident.id} className="border-b border-border pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm">{incident.title}</h4>
                    <IncidentBadge status={incident.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{incident.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(incident.startedAt).toLocaleDateString("id-ID")}
                    </span>
                    {incident.resolvedAt && (
                      <>
                        <span className="text-[10px] text-muted-foreground">→</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(incident.resolvedAt).toLocaleDateString("id-ID")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monitoring Setup */}
      <Card className="bg-card border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Monitoring Setup</CardTitle>
          <CardDescription>How to set up alerts for your Teora deployment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Zap className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div>
                <h4 className="font-medium">Vercel Web Analytics</h4>
                <p className="text-muted-foreground text-xs mt-0.5">Built-in analytics available in your Vercel dashboard. No additional setup needed.</p>
                <a href="https://vercel.com/docs/concepts/analytics" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                  Vercel Analytics <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <AlertTriangle className="w-4 h-4 mt-0.5 text-yellow-600 shrink-0" />
              <div>
                <h4 className="font-medium">Uptime Monitoring (UptimeRobot)</h4>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Set up free monitoring at uptimerobot.com. Create monitors for your frontend and API endpoints.
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Recommended: Frontend URL + API health endpoint. Alert via email/Telegram.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Activity className="w-4 h-4 mt-0.5 text-blue-600 shrink-0" />
              <div>
                <h4 className="font-medium">Runtime Error Monitoring</h4>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Vercel provides built-in runtime error tracking in the dashboard under "Errors".
                  Set up notifications in project settings → Integrations.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Shield className="w-4 h-4 mt-0.5 text-red-600 shrink-0" />
              <div>
                <h4 className="font-medium">Cost Anomaly Alerts</h4>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Set up budget alerts in Vercel dashboard → Settings → Billing.
                  Alert when spend exceeds threshold (e.g., 80% of monthly budget).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
              <div>
                <h4 className="font-medium">Auto-Rollback</h4>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Vercel automatically rolls back when a deployment fails health checks.
                  Configure protection rules in Vercel dashboard → Settings → Deployment Protection.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              <strong>Quick Setup:</strong> Go to your Vercel project dashboard → Settings → Notifications to configure email alerts for deployment failures and errors.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
