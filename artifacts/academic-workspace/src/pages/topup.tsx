import { useState } from "react";
import { useGetMyBalance } from "@/lib/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Coins,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Zap,
  Clock,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const TRANSACTION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  topup: { label: "Topup", color: "bg-green-100 text-green-700" },
  ai_usage: { label: "Penggunaan AI", color: "bg-orange-100 text-orange-700" },
  refund: { label: "Refund", color: "bg-blue-100 text-blue-700" },
  bonus: { label: "Bonus", color: "bg-purple-100 text-purple-700" },
  adjustment: { label: "Penyesuaian", color: "bg-gray-100 text-gray-700" },
};

function TransactionRow({
  tx,
}: {
  tx: {
    id?: string;
    type?: string;
    amountCents?: number;
    amountDisplay?: string;
    balanceAfterCents?: number;
    balanceAfterDisplay?: string;
    description?: string;
    createdAt?: string;
  };
}) {
  const info = tx.type ? TRANSACTION_TYPE_LABELS[tx.type] ?? { label: tx.type, color: "bg-muted" } : null;
  const isDebit = (tx.amountCents ?? 0) < 0;

  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isDebit ? "bg-orange-100" : "bg-green-100"
          }`}
        >
          {isDebit ? (
            <Zap className="w-4 h-4 text-orange-600" />
          ) : (
            <Coins className="w-4 h-4 text-green-600" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">{tx.description ?? info?.label ?? "Transaksi"}</p>
          {tx.createdAt && (
            <p className="text-[10px] text-muted-foreground">
              {format(new Date(tx.createdAt), "dd MMM yyyy, HH:mm", { locale: id })}
            </p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p
          className={`text-sm font-mono font-semibold ${
            isDebit ? "text-orange-600" : "text-green-600"
          }`}
        >
          {isDebit ? "-" : "+"}
          {tx.amountDisplay ?? (tx.amountCents ? "Rp " + Math.abs(tx.amountCents / 100).toLocaleString("id-ID") : "?")}
        </p>
        {tx.balanceAfterDisplay && (
          <p className="text-[10px] text-muted-foreground">
            Saldo: {tx.balanceAfterDisplay}
          </p>
        )}
      </div>
    </div>
  );
}

export default function TopupPage() {
  const { data: balanceData, isLoading: balanceLoading } = useGetMyBalance();
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  const [showPendingForm, setShowPendingForm] = useState(false);

  const balanceDisplay = balanceData?.balanceDisplay ?? "Rp 0";
  const balanceCents = balanceData?.balanceCents ?? 0;
  const transactions = balanceData?.recentTransactions ?? [];

  const TOPUP_PACKAGES = [
    { amount: 10000, label: "Rp 10.000", tokens: "~1.000 short essays" },
    { amount: 25000, label: "Rp 25.000", tokens: "~2.500 short essays", popular: true },
    { amount: 50000, label: "Rp 50.000", tokens: "~5.000 short essays" },
    { amount: 100000, label: "Rp 100.000", tokens: "~10.000 short essays" },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link href="/ai-pricing">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Topup Saldo</h1>
          <p className="text-sm text-muted-foreground">
            Deposit saldo untuk menggunakan fitur AI
          </p>
        </div>
      </div>

      {/* Current Balance */}
      <Card className="border-border/50 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[#2D79FF] to-[#8E54E9]" />
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2D79FF]/20 to-[#8E54E9]/20 flex items-center justify-center">
                <Coins className="w-7 h-7 text-[#2D79FF]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Saat Ini</p>
                {balanceLoading ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p className="text-3xl font-bold">{balanceDisplay}</p>
                )}
              </div>
            </div>
            <Badge
              variant="secondary"
              className={`${
                balanceCents > 0
                  ? "bg-green-100 text-green-700 border-0"
                  : "bg-orange-100 text-orange-700 border-0"
              }`}
            >
              {balanceCents > 0 ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Aktif
                </>
              ) : (
                <>
                  <Coins className="w-3 h-3 mr-1" />
                  Saldo Habis
                </>
              )}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Integration — Pending */}
      <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Integrasi Pembayaran Belum Aktif</h3>
              <p className="text-sm text-muted-foreground">
                Fitur topup via payment gateway (Stripe) sedang dalam proses konfigurasi.
                Untuk sementara, saldo dapat ditambahkan melalui dashboard admin.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                <p className="text-xs text-orange-600 font-medium">
                  Hubungi administrator untuk menambahkan saldo.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Topup Packages */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Paket Topup</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {TOPUP_PACKAGES.map((pkg) => (
            <Card
              key={pkg.amount}
              className={`cursor-pointer transition-all hover:shadow-md ${
                pkg.popular ? "ring-2 ring-[#2D79FF]/40 border-[#2D79FF]/20" : ""
              }`}
              onClick={() => {
                setPendingAmount(pkg.amount);
                setShowPendingForm(true);
              }}
            >
              {pkg.popular && (
                <div className="h-6 bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wide">
                    Populer
                  </span>
                </div>
              )}
              <CardContent className={`p-4 ${pkg.popular ? "pt-3" : ""}`}>
                <p className="text-xl font-bold">{pkg.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{pkg.tokens}</p>
                {pkg.popular && (
                  <Badge className="mt-2 text-[10px] bg-[#2D79FF]/10 text-[#2D79FF] border-0">
                    Best Value
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Riwayat Transaksi</h2>
        <Card className="border-border/50">
          {transactions.length === 0 ? (
            <CardContent className="p-6 text-center">
              <Coins className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">
                Belum ada transaksi.
              </p>
            </CardContent>
          ) : (
            <CardContent className="p-0 px-6">
              {transactions.slice(0, 10).map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
              {transactions.length > 10 && (
                <div className="py-3 text-center">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                    Lihat semua transaksi →
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>

      {/* Back Links */}
      <div className="text-center flex items-center justify-center gap-4">
        <Link href="/ai-pricing">
          <Button variant="ghost" className="text-muted-foreground">
            ← Lihat AI Pricing
          </Button>
        </Link>
        <Link href="/">
          <Button variant="ghost" className="text-muted-foreground">
            Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
