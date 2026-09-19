import { Link } from "wouter";
import {
  CreditCard,
  User,
  Shield,
  Bell,
  Key,
  ChevronRight,
  Wallet,
  TrendingUp,
  AlertCircle,
  Bot,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  useGetMyBalance,
  useGetMyUsageStats,
  useGetMyPreferences,
  useUpdateMyPreferences,
  useSetAITierPreference,
} from "@/lib/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { TierSelector } from "@/components/tier-selector";
import { useQueryClient } from "@tanstack/react-query";

const AKUN_SECTIONS = [
  {
    icon: User,
    label: "Profil",
    desc: "Nama, email, foto, dan informasi akun Anda",
    href: "/profile",
  },
  {
    icon: CreditCard,
    label: "Topup Saldo",
    desc: "Isi ulang saldo untuk penggunaan Teora",
    href: "/topup",
  },
  {
    icon: Bell,
    label: "Notifikasi",
    desc: "Pengaturan notifikasi email dan push",
    href: "#",
  },
  {
    icon: Key,
    label: "Keamanan",
    desc: "Ubah password dan pengaturan keamanan",
    href: "#",
  },
  {
    icon: Shield,
    label: "Privasi",
    desc: "Pengaturan data dan privasi akun",
    href: "/privacy",
  },
];

function formatNumber(n: number | undefined | null): string {
  if (n == null || typeof n !== "number") return "0";
  return n.toLocaleString("id-ID");
}

function formatUSD(cost: number | undefined | null): string {
  if (cost == null || typeof cost !== "number") return "$0.00";
  if (cost < 0.01) return `$${(cost * 1000).toFixed(2)}m`;
  return `$${cost.toFixed(2)}`;
}

export default function Akun() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: balanceData, isLoading: balanceLoading, isError: balanceError } = useGetMyBalance();
  const { data: usageStats, isLoading: usageLoading, isError: usageError } = useGetMyUsageStats({
    period: "7d",
  });

  const { data: preferences, isLoading: prefsLoading } = useGetMyPreferences();
  const updatePrefs = useUpdateMyPreferences();
  const setAITierPreference = useSetAITierPreference();

  const currentProvider = preferences?.aiProvider ?? "anthropic";
  const preferredTierId = balanceData?.preferredTierId ?? "";

  const handleProviderChange = (value: string) => {
    const provider = value as "anthropic" | "olagon";
    updatePrefs.mutate(
      { data: { aiProvider: provider } },
      {
        onSuccess: () => {
          toast({
            title: "Provider diperbarui",
            description: `AI Provider sekarang: ${provider === "anthropic" ? "Anthropic (Production)" : "Olagon Gateway"}`,
          });
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          const isForbidden = msg.toLowerCase().includes("forbidden") || msg.toLowerCase().includes("403");
          toast({
            title: isForbidden ? "Akses ditolak" : "Gagal menyimpan",
            description: isForbidden
              ? "Olagon provider hanya untuk workspace owner"
              : "Tidak dapat menyimpan preferensi AI",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleAITierChange = (tierId: string) => {
    setAITierPreference.mutate(
      { data: { tierId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/users/me/balance"] });
          toast({
            title: "Default AI Tier diperbarui",
            description: "Tier ini akan digunakan oleh semua fitur AI di Teora.",
          });
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          toast({
            title: "Gagal menyimpan",
            description: msg || "Tidak dapat menyimpan default AI tier",
            variant: "destructive",
          });
        },
      }
    );
  };

  const recentTransactions = balanceData?.recentTransactions ?? [];
  const topTransactions = recentTransactions.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold tracking-tight">Akun</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Kelola profil, saldo, dan pengaturan akun Anda
        </p>
      </div>

      {/* Token & Usage Card */}
      <Card className="border-[#2D79FF]/20 bg-gradient-to-br from-[#2D79FF]/5 to-[#8E54E9]/5">
        <CardContent className="p-5 space-y-4">
          {/* Header: Saldo */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D79FF] to-[#8E54E9] flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo Teora</p>
                {balanceLoading ? (
                  <Skeleton className="h-6 w-32 mt-1" />
                ) : balanceError ? (
                  <p className="text-xl font-bold font-mono mt-0.5 text-destructive">Gagal memuat</p>
                ) : (
                  <p className="text-xl font-bold font-mono mt-0.5">
                    {balanceData?.balanceDisplay ?? "Rp 0"}
                  </p>
                )}
              </div>
            </div>
            <Link href="/topup">
              <Button size="sm" className="bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] hover:opacity-90">
                Topup
              </Button>
            </Link>
          </div>

          {/* Quick Stats: 7-day usage */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Request 7 hari
              </p>
              {usageLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : usageError ? (
                <p className="text-sm font-semibold font-mono text-muted-foreground">—</p>
              ) : (
                <p className="text-sm font-semibold font-mono">
                  {formatNumber(usageStats?.totalRequests)}
                </p>
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Biaya 7 hari
              </p>
              {usageLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : usageError ? (
                <p className="text-sm font-semibold font-mono text-muted-foreground">—</p>
              ) : (
                <p className="text-sm font-semibold font-mono">
                  {formatUSD(usageStats?.totalCostUsd)}
                </p>
              )}
            </div>
          </div>

          {/* Recent transactions */}
          {topTransactions.length > 0 && (
            <div className="pt-2 border-t border-border/50 space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Transaksi Terbaru
              </p>
              <div className="space-y-1.5">
                {topTransactions.map((tx) => (
                  <div
                    key={tx.id ?? `${tx.createdAt}-${tx.description}`}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-muted-foreground truncate flex-1 mr-2">
                      {tx.description ?? tx.type}
                    </span>
                    <span
                      className={
                        tx.type === "topup" || tx.type === "bonus" || tx.type === "refund"
                          ? "text-emerald-600 font-mono font-medium"
                          : "text-sidebar-foreground font-mono font-medium"
                      }
                    >
                      {(tx.type === "topup" || tx.type === "bonus" || tx.type === "refund") ? "+" : "-"}
                      {tx.amountDisplay ?? "Rp 0"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer: Lihat penggunaan */}
          <div className="pt-2 border-t border-border/50 flex items-center justify-between">
            <Link href="/usage">
              <span className="text-xs text-[#2D79FF] hover:underline cursor-pointer flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Lihat penggunaan lengkap
              </span>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Default AI Tier — Global Setting (all users) */}
      <Card className="border-[#2D79FF]/20 bg-gradient-to-br from-[#2D79FF]/5 to-[#8E54E9]/5">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D79FF] to-[#8E54E9] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium">Default AI Tier</p>
              <p className="text-xs text-muted-foreground">
                Tier model yang dipakai semua fitur AI di Teora
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {balanceLoading || prefsLoading ? (
              <Skeleton className="h-9 w-[160px]" />
            ) : (
              <TierSelector
                value={preferredTierId}
                onChange={handleAITierChange}
              />
            )}
            {balanceData && (
              <span className="text-xs text-muted-foreground font-mono">
                Saldo: {balanceData.balanceDisplay}
              </span>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-2.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <strong>Mengubah ini akan mengubah semua fitur AI memakai model ini</strong> — termasuk
              Task Mentor, Simulasi Presentasi, dan asisten AI lainnya.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Detail harga per tier tersedia di halaman{" "}
            <Link href="/langganan">
              <span className="text-[#2D79FF] hover:underline cursor-pointer">Langganan</span>
            </Link>{" "}
            dan{" "}
            <Link href="/topup">
              <span className="text-[#2D79FF] hover:underline cursor-pointer">Topup</span>
            </Link>.
          </p>
        </CardContent>
      </Card>

      {/* AI Provider Configuration (Owner-only) */}
      {user?.isOwner && (
        <Card className="border-[#8E54E9]/20 bg-gradient-to-br from-[#8E54E9]/5 to-[#2D79FF]/5">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8E54E9] to-[#2D79FF] flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium">AI Provider</p>
                <p className="text-xs text-muted-foreground">Konfigurasi gateway AI (owner only)</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Anthropic (Production)</p>
                  <p className="text-xs text-muted-foreground">
                    Haiku 4.5 / Sonnet 5 — untuk user umum
                  </p>
                </div>
                <RadioGroup value={currentProvider} onValueChange={handleProviderChange}>
                  <RadioGroupItem value="anthropic" />
                </RadioGroup>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    Olagon Gateway
                    <span className="text-[10px] bg-[#8E54E9]/10 text-[#8E54E9] px-1.5 py-0.5 rounded font-medium">
                      Owner Only
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Opus 4.8 / 4.6 — testing & maintenance, tidak dipotong saldo
                  </p>
                </div>
                <RadioGroup value={currentProvider} onValueChange={handleProviderChange}>
                  <RadioGroupItem value="olagon" />
                </RadioGroup>
              </label>
            </div>

            {currentProvider === "olagon" && (
              <p className="text-xs text-muted-foreground bg-[#8E54E9]/5 rounded-lg p-2">
                Olagon: auto-cascade opus-4-8 ke opus-4-6 jika quota habis.
                HTTP 402 = quota window habis, tunggu 5h atau 7d.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Account sections */}
      <div className="space-y-3">
        {AKUN_SECTIONS.map((section) => (
          <Card key={section.label} className="hover:border-[#2D79FF]/30 transition-colors">
            <CardContent className="p-4">
              <a
                href={section.href === "#" ? undefined : section.href}
                className="flex items-center gap-4 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <section.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{section.label}</p>
                  <p className="text-xs text-muted-foreground">{section.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
