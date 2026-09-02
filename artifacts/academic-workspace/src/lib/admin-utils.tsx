import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export interface AdminStats {
  period: string;
  totals: {
    users: number;
    projects: number;
    aiRequests: number;
    aiCostUsd: number;
    inputTokens: number;
    outputTokens: number;
  };
  revenue: {
    totalTopupCents: number;
    totalRefundCents: number;
    transactionCount: number;
    grossMargin: number;
  };
  ownerUsage: {
    totalRequests: number;
    totalCostUsd: number;
  };
  topConsumers: Array<{ userId: string; requests: number; costUsd: number }>;
}

export function formatCents(cents: number): string {
  if (cents >= 100000) return `Rp ${(cents / 100000).toFixed(0)}jt`;
  if (cents >= 100) return `Rp ${(cents / 100).toLocaleString("id-ID")}`;
  return `Rp ${cents}`;
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
  trendLabel,
  accent = "blue",
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  trend?: "up" | "down";
  trendLabel?: string;
  accent?: string;
}) {
  const colors: Record<string, string> = {
    blue: "from-[#2D79FF]/10 to-[#2D79FF]/5 text-[#2D79FF]",
    green: "from-emerald-500/10 to-emerald-500/5 text-emerald-600",
    amber: "from-amber-500/10 to-amber-500/5 text-amber-600",
    red: "from-red-500/10 to-red-500/5 text-red-600",
    purple: "from-purple-500/10 to-purple-500/5 text-purple-600",
  };
  const color = colors[accent] ?? colors.blue;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trend === "up" ? "text-emerald-600" : "text-red-600"}`}>
              {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trendLabel}
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-serif font-bold tracking-tight">{value}</p>
          <p className="text-sm font-medium text-muted-foreground mt-0.5">{title}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
