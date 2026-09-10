import { useState, useEffect } from "react";
import { useSearchParams } from "wouter";
import { Users, Search, Shield, Ban, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLayout from "@/components/admin-layout";
import { customFetch } from "@/lib/api-client-react";
import { formatUsd } from "@/lib/admin-utils";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  tier: string;
  isActive: boolean;
  createdAt: string;
  totalProjects: number;
  totalAiRequests: number;
  totalAiCostUsd: number;
  lastLoginAt: string | null;
}

interface AdminUserList {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

const TIER_COLORS: Record<string, string> = {
  free: "bg-slate-100 text-slate-700",
  starter: "bg-blue-100 text-blue-700",
  pro: "bg-purple-100 text-purple-700",
  ultra: "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700",
};

export default function AdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.page ?? "1", 10);
  const [search, setSearch] = useState(searchParams.search ?? "");
  const [data, setData] = useState<AdminUserList | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsers = () => {
    setLoading(true);
    setFetchError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (search) params.set("search", search);
    customFetch<AdminUserList>(`/api/admin/users?${params}`)
      .then(setData)
      .catch((err) => {
        setFetchError(String(err));
        setData(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [page, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ page: "1", search });
    fetchUsers();
  };

  const handleTierChange = async (userId: string, tier: string) => {
    setActionLoading(userId + tier);
    try {
      await customFetch(`/api/admin/users/${userId}/tier`, {
        method: "POST",
        body: JSON.stringify({ tier }),
      });
      toast({ title: "Berhasil", description: `Tier pengguna diubah ke ${tier}.` });
      fetchUsers();
    } catch (err) {
      toast({ title: "Gagal", description: String(err), variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (userId: string, suspend: boolean) => {
    setActionLoading(userId + String(suspend));
    try {
      await customFetch(`/api/admin/users/${userId}/suspend`, {
        method: "POST",
        body: JSON.stringify({ suspended: suspend }),
      });
      toast({ title: "Berhasil", description: suspend ? "Pengguna ditangguhkan." : "Pengguna diaktifkan kembali." });
      fetchUsers();
    } catch (err) {
      toast({ title: "Gagal", description: String(err), variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <AdminLayout activeTab="/admin/users">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight">Manajemen Pengguna</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {data ? `${data.total} pengguna` : "Semua pengguna terdaftar"}
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search email atau nama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pengguna</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tier</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Projects</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Permintaan Teora</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Biaya Teora</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                        ))}
                      </tr>
                    ))
                  ) : fetchError ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center">
                        <p className="text-destructive font-medium">Gagal memuat data</p>
                        <p className="text-xs text-muted-foreground mt-1">{fetchError}</p>
                      </td>
                    </tr>
                  ) : data?.users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        Tidak ada pengguna ditemukan
                      </td>
                    </tr>
                  ) : (
                    data?.users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{user.displayName ?? ":"}</p>
                            <p className="text-xs text-muted-foreground font-mono">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={user.tier}
                            disabled={actionLoading === user.id + user.tier}
                            onChange={(e) => handleTierChange(user.id, e.target.value)}
                            className="text-xs px-2 py-1 rounded border border-border bg-background cursor-pointer"
                          >
                            <option value="free">Free</option>
                            <option value="starter">Starter</option>
                            <option value="pro">Pro</option>
                            <option value="ultra">Ultra</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-center">{user.totalProjects}</td>
                        <td className="px-4 py-3 text-center">{user.totalAiRequests.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          ${user.totalAiCostUsd.toFixed(4)}
                        </td>
                        <td className="px-4 py-3">
                          {user.isActive ? (
                            <Badge variant="success" className="text-xs">Active</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">Suspended</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant={user.isActive ? "destructive" : "secondary"}
                            className="text-xs h-7"
                            disabled={actionLoading === user.id + String(!user.isActive)}
                            onClick={() => handleSuspend(user.id, !user.isActive)}
                          >
                            {user.isActive ? "Suspend" : "Activate"}
                          </Button>
                        </td>
                      </tr>
                    ))
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
              Page {page} dari {totalPages}: {data?.total} pengguna
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setSearchParams({ page: String(page - 1), search })}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">{page} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setSearchParams({ page: String(page + 1), search })}
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
