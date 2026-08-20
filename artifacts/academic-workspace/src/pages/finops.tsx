import { useMemo } from "react";
import { useSearchParams } from "wouter";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  useListAIUsage,
  useGetAIUsageStats,
} from "@workspace/api-client-react";
import type { AIUsageLog } from "@workspace/api-client-react";
import {
  ActivitySquare,
  Coins,
  Cpu,
  FileText,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { TeoraLogo } from "@/components/brand/teora-logo";

const REQUEST_TYPE_LABELS: Record<string, string> = {
  chat: "Chat AI",
  analyze: "Analisis",
  outline: "Outline",
  write: "Penulisan",
  export: "Ekspor",
};

const REQUEST_TYPE_COLORS: Record<string, string> = {
  chat: "#2D79FF",
  analyze: "#8E54E9",
  outline: "#10B981",
  write: "#F59E0B",
  export: "#EF4444",
};

function formatNumber(n: number | undefined | null): string {
  if (n == null || typeof n !== "number") return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCost(cost: number | undefined | null): string {
  if (cost == null || typeof cost !== "number") return "$0.00";
  if (cost < 0.01) return `$${(cost * 1000).toFixed(2)}m`;
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  return `$${cost.toFixed(4)}`;
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
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold font-mono tracking-tight">{value}</p>
            {subValue && (
              <p className="text-xs text-muted-foreground">{subValue}</p>
            )}
          </div>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UsageByTypeChart({
  byRequestType,
}: {
  byRequestType?: Record<string, { requests?: number; inputTokens?: number; outputTokens?: number; costUsd?: number }>;
}) {
  const pieData = useMemo(() => {
    if (!byRequestType) return [];
    return Object.entries(byRequestType)
      .filter(([, v]) => (v.costUsd ?? 0) > 0)
      .map(([type, v]) => ({
        name: REQUEST_TYPE_LABELS[type] ?? type,
        value: v.costUsd ?? 0,
        requests: v.requests ?? 0,
        tokens: (v.inputTokens ?? 0) + (v.outputTokens ?? 0),
        color: REQUEST_TYPE_COLORS[type] ?? "#94A3B8",
      }));
  }, [byRequestType]);

  if (pieData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        No usage data yet
      </div>
    );
  }

  return (
    <ChartContainer
      config={Object.fromEntries(
        pieData.map((d) => [d.name, { label: d.name, color: d.color }])
      )}
      className="h-64"
    >
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          innerRadius={50}
          paddingAngle={2}
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <ChartTooltipContent
          formatter={(value: number) => {
            const n = typeof value === "number" ? value : 0;
            return [`$${n.toFixed(6)}`, "Cost"];
          }}
          labelFormatter={(_, payload) => {
            const item = (payload as Array<{ payload: { name: string; requests: number; tokens: number } }>)?.[0]?.payload;
            if (!item) return "";
            return `${item.name} · ${item.requests} requests · ${formatNumber(item.tokens)} tokens`;
          }}
        />
      </PieChart>
    </ChartContainer>
  );
}

function TokenBarChart({
  byRequestType,
}: {
  byRequestType?: Record<string, { requests?: number; inputTokens?: number; outputTokens?: number; costUsd?: number }>;
}) {
  const barData = useMemo(() => {
    if (!byRequestType) return [];
    return Object.entries(byRequestType).map(([type, v]) => ({
      name: REQUEST_TYPE_LABELS[type] ?? type,
      input: v.inputTokens ?? 0,
      output: v.outputTokens ?? 0,
    }));
  }, [byRequestType]);

  if (barData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        No usage data yet
      </div>
    );
  }

  return (
    <ChartContainer
      config={{
        input: { label: "Input Tokens", color: "#2D79FF" },
        output: { label: "Output Tokens", color: "#8E54E9" },
      }}
      className="h-64"
    >
      <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatNumber(v)}
        />
        <ChartTooltipContent
          formatter={(value: number, name: string) => [
            formatNumber(value),
            name === "input" ? "Input Tokens" : "Output Tokens",
          ]}
        />
        <Bar dataKey="input" stackId="a" fill="#2D79FF" radius={[0, 0, 0, 0]} />
        <Bar dataKey="output" stackId="a" fill="#8E54E9" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

function UsageTable({
  records,
  isLoading,
}: {
  records: AIUsageLog[] | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!records?.length) {
    return (
      <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
        No usage records found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Model</TableHead>
            <TableHead className="text-right">Input</TableHead>
            <TableHead className="text-right">Output</TableHead>
            <TableHead className="text-right">Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(r.createdAt), "MMM d, HH:mm")}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className="text-xs"
                  style={{
                    borderColor: REQUEST_TYPE_COLORS[r.requestType] ?? "#94A3B8",
                    color: REQUEST_TYPE_COLORS[r.requestType] ?? "#94A3B8",
                    backgroundColor: `${REQUEST_TYPE_COLORS[r.requestType] ?? "#94A3B8"}15`,
                  }}
                >
                  {REQUEST_TYPE_LABELS[r.requestType] ?? r.requestType}
                </Badge>
              </TableCell>
              <TableCell className="text-sm font-mono">{r.model}</TableCell>
              <TableCell className="text-right text-sm font-mono text-muted-foreground">
                {formatNumber(r.inputTokens)}
              </TableCell>
              <TableCell className="text-right text-sm font-mono text-muted-foreground">
                {formatNumber(r.outputTokens)}
              </TableCell>
              <TableCell className="text-right text-sm font-mono font-medium">
                {formatCost(r.estimatedCostUsd)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function FinOps() {
  const [searchParams] = useSearchParams();

  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = 20;

  const statsQuery = useGetAIUsageStats();
  const usageQuery = useListAIUsage({
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const stats = statsQuery.data;
  const records = usageQuery.data?.data;
  const totalRecords = usageQuery.data?.total;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D79FF]/10 to-[#8E54E9]/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-tight">
              AI Usage & Cost
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor your AI API consumption and costs
            </p>
          </div>
        </div>
        <TeoraLogo size="sm" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ActivitySquare}
          label="Total Requests"
          value={stats ? formatNumber(stats.totalRequests) : "—"}
          subValue="across all features"
          color="#2D79FF"
        />
        <StatCard
          icon={Cpu}
          label="Input Tokens"
          value={stats ? formatNumber(stats.totalInputTokens) : "—"}
          subValue="sent to AI models"
          color="#8E54E9"
        />
        <StatCard
          icon={FileText}
          label="Output Tokens"
          value={stats ? formatNumber(stats.totalOutputTokens) : "—"}
          subValue="received from AI models"
          color="#10B981"
        />
        <StatCard
          icon={Coins}
          label="Estimated Cost"
          value={stats ? formatCost(stats.totalCostUsd) : "—"}
          subValue="based on current pricing"
          color="#F59E0B"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Cost by Feature
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : stats ? (
              <UsageByTypeChart byRequestType={stats.byRequestType} />
            ) : null}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Token Usage by Feature
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : stats ? (
              <TokenBarChart byRequestType={stats.byRequestType} />
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Request Type Breakdown */}
      {stats && Object.keys(stats.byRequestType).length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Usage Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byRequestType)
                .sort(([, a], [, b]) => (b.costUsd ?? 0) - (a.costUsd ?? 0))
                .map(([type, v]) => {
                  const allCosts = Object.values(stats.byRequestType).map(
                    (x) => x.costUsd ?? 0
                  );
                  const maxCost = Math.max(...allCosts);
                  const pct = maxCost > 0 ? ((v.costUsd ?? 0) / maxCost) * 100 : 0;
                  return (
                    <div key={type} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {REQUEST_TYPE_LABELS[type] ?? type}
                        </span>
                        <span className="text-muted-foreground font-mono text-xs">
                          {formatNumber(v.requests ?? 0)} requests ·{" "}
                          {formatCost(v.costUsd ?? 0)}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor:
                              REQUEST_TYPE_COLORS[type] ?? "#94A3B8",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Usage Table */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              Recent Requests
            </CardTitle>
            {totalRecords !== undefined && (
              <span className="text-xs text-muted-foreground">
                {totalRecords} total records
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <UsageTable records={records} isLoading={usageQuery.isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
