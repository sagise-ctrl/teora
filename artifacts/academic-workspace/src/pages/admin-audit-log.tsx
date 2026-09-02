import { useState, useEffect } from "react";
import { useSearchParams } from "wouter";
import { ScrollText, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLayout from "@/components/admin-layout";
import { customFetch } from "@/lib/api-client-react";

interface AuditLogEntry {
  id: number;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogList {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

const ACTION_COLORS: Record<string, string> = {
  tier_change: "bg-blue-100 text-blue-700",
  user_suspend: "bg-red-100 text-red-700",
  user_activate: "bg-emerald-100 text-emerald-700",
  tier_config_update: "bg-purple-100 text-purple-700",
  login: "bg-slate-100 text-slate-700",
  default: "bg-muted text-muted-foreground",
};

export default function AdminAuditLog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.page ?? "1", 10);
  const [data, setData] = useState<AuditLogList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    customFetch<AuditLogList>(`/api/admin/audit-log?page=${page}&pageSize=50`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <AdminLayout activeTab="/admin/audit-log">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Semua aksi admin tercatat di sini: {data ? `${data.total} entries` : "Memuat..."}
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Admin</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Target</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Details</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        ))}
                      </tr>
                    ))
                  ) : data?.entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Belum ada audit log
                      </td>
                    </tr>
                  ) : (
                    data?.entries.map((entry) => {
                      const colorClass = ACTION_COLORS[entry.action] ?? ACTION_COLORS.default;
                      return (
                        <tr key={entry.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{entry.adminEmail.split("@")[0]}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}>
                              {entry.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span className="text-muted-foreground">{entry.targetType}</span>
                            {entry.targetId && (
                              <span className="ml-1 font-mono text-muted-foreground/70">
                                /{entry.targetId.slice(0, 8)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground max-w-48 truncate">
                            {entry.details ? JSON.stringify(entry.details) : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                            {entry.ipAddress ?? "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} dari {totalPages}: {data?.total} entries
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setSearchParams({ page: String(page - 1) })}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">{page} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setSearchParams({ page: String(page + 1) })}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
