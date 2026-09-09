import { useState } from "react";
import { Link } from "wouter";
import {
  Copy,
  Check,
  Share2,
  Gift,
  TrendingUp,
  Users,
  Wallet,
  Info,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useGetMyReferralInfo } from "@/lib/api-client-react";

function CopyButton({
  text,
  className,
  onError,
}: {
  text: string;
  className?: string;
  onError?: (msg: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onError?.("Tidak dapat menyalin ke clipboard. Coba salin manual.");
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "p-2 rounded-md transition-colors",
        copied
          ? "bg-green-500/20 text-green-600"
          : "bg-muted hover:bg-muted/80 text-muted-foreground",
        className
      )}
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-4 h-4" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}

function formatRupiah(cents: number): string {
  const rupiah = cents / 100;
  return "Rp " + rupiah.toLocaleString("id-ID");
}

export default function ReferralPage() {
  const { user } = useAuth();
  const [sharing, setSharing] = useState(false);
  const { toast } = useToast();

  const { data: referralInfo, isLoading } = useGetMyReferralInfo();

  const referralCode = referralInfo?.referralCode ?? user?.referralCode ?? null;
  const referralUrl =
    referralCode && typeof window !== "undefined"
      ? `${window.location.origin}/register?ref=${referralCode}`
      : "";

  // Real data from backend
  const referredCount = referralInfo?.referredCount ?? 0;
  const totalRewardCents = referralInfo?.totalRewardEarnedCents ?? 0;
  const rewardBalanceCents = referralInfo?.rewardBalanceCents ?? 0;
  const refereeCashbackClaimed = referralInfo?.refereeCashbackClaimed ?? false;
  const txCap = referralInfo?.referrerRewardTxCap ?? 5;
  const rewardPercent = (referralInfo?.referrerRewardPercent ?? 0.03) * 100;

  async function handleShare() {
    if (!referralUrl) return;
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Bergabung dengan Teora",
          text: "Ayo gunakan Teora, asisten AI untuk riset dan tugas akademikmu. Daftar lewat link ini dan dapatkan bonus saldo Rp 5.000.",
          url: referralUrl,
        });
      } else {
        await navigator.clipboard.writeText(referralUrl);
        toast({ title: "Tersalin!", description: "Link referral berhasil disalin ke clipboard." });
      }
    } catch {
      // User cancelled
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ajak Teman, Dapat Reward</h1>
        <p className="text-muted-foreground mt-1">
          Bagikan kode referral kamu. Teman yang mendaftar akan mendapat cashback, dan
          kamu akan mendapat reward dari setiap pembayaran pertama mereka.
        </p>
      </div>

      {/* Referral Link Card */}
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#2D79FF]/20 to-[#8E54E9]/20 flex items-center justify-center">
              <Gift className="w-5 h-5 text-[#2D79FF]" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                Link Referral Kamu
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bagikan ke teman. Kode kamu:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {referralCode ?? "—"}
                </span>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                URL Referral
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-sm font-mono text-muted-foreground truncate border border-border/50">
                  {referralUrl || (isLoading ? "Memuat…" : "Tautan belum tersedia")}
                </div>
                <CopyButton
                  text={referralUrl}
                  onError={(msg) =>
                    toast({ title: "Gagal", description: msg, variant: "destructive" })
                  }
                />
              </div>
            </div>

            <Button
              onClick={handleShare}
              disabled={sharing || !referralUrl}
              className="w-full bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] hover:opacity-90 text-white"
            >
              <Share2 className="w-4 h-4 mr-2" />
              {sharing ? "Membagikan…" : "Bagikan Sekarang"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* How It Works — Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* REFERRER side */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#2D79FF]/20 to-[#8E54E9]/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#2D79FF]" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Untuk Kamu (Pengajak)</h3>
                <Badge
                  variant="secondary"
                  className="mt-0.5 bg-gradient-to-r from-[#2D79FF]/10 to-[#8E54E9]/10 text-[#2D79FF] border-0 text-xs"
                >
                  Reward {rewardPercent}% × 5 transaksi
                </Badge>
              </div>
            </div>

            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>
                  Dapatkan <strong className="text-foreground">{rewardPercent}%</strong> dari
                  setiap pembayaran teman yang kamu ajak.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>
                  Berlaku untuk <strong className="text-foreground">{txCap} pembayaran pertama</strong>{" "}
                  teman (langganan & topup).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>
                  Reward masuk ke <strong className="text-foreground">saldo reward</strong>{" "}
                  (bisa dipakai untuk AI, tidak bisa ditarik).
                </span>
              </li>
            </ul>

            {/* Reward Balance */}
            <div className="mt-5 p-4 rounded-lg bg-gradient-to-r from-[#2D79FF]/5 to-[#8E54E9]/5 border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#2D79FF]" />
                  <span className="text-sm font-medium text-foreground">Saldo Reward</span>
                </div>
                <span className="text-lg font-bold text-foreground">
                  {formatRupiah(rewardBalanceCents)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Total reward terkumpul: {formatRupiah(totalRewardCents)}
              </p>
            </div>

            {/* Referee count */}
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Teman yang sudah mendaftar</span>
              <span className="font-semibold text-foreground">{referredCount} orang</span>
            </div>
          </CardContent>
        </Card>

        {/* REFEREE side */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Untuk Teman Kamu (Yang Diajak)</h3>
                <Badge
                  variant="secondary"
                  className="mt-0.5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-700 border-0 text-xs"
                >
                  Cashback Rp 5.000
                </Badge>
              </div>
            </div>

            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>
                  Cashback <strong className="text-foreground">{formatRupiah(500_000)}</strong>{" "}
                  setelah pembayaran pertama berhasil.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>
                  Berlaku untuk pembayaran pertama (langganan atau topup).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>
                  Cashback hanya diberikan <strong className="text-foreground">sekali seumur hidup akun</strong>{" "}
                  — bukan per metode.
                </span>
              </li>
            </ul>

            <div className="mt-5 p-4 rounded-lg bg-gradient-to-r from-green-500/5 to-emerald-500/5 border border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Status cashback</span>
                {refereeCashbackClaimed ? (
                  <Badge variant="secondary" className="bg-green-500/20 text-green-700 border-0">
                    Sudah diklaim
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground border-border">
                    Belum diklaim
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {refereeCashbackClaimed
                  ? "Bonus Rp 5.000 sudah masuk ke saldo kamu."
                  : "Lakukan pembayaran pertama untuk klaim cashback Rp 5.000."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Progress (referee count) */}
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Progress Referral Kamu
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-foreground">
                  {referredCount} teman sudah mendaftar
                </span>
              </div>
              <Progress
                value={Math.min((referredCount / txCap) * 100, 100)}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Dari setiap teman, kamu mendapat reward dari {txCap} pembayaran pertama.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fine print */}
      <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong>Syarat & Ketentuan:</strong> Program referral berlaku untuk semua
            metode pembayaran (langganan dan topup). Cashback referee hanya diberikan satu
            kali per akun, pada pembayaran pertama yang berhasil. Reward pengajak
            diberikan hingga 5 transaksi pertama per teman yang diajak. Tidak ada
            penarikan saldo reward ke rekening bank. Refund hanya diproses manual
            oleh CS untuk kasus khusus.
          </p>
          <p>
            <strong>Sumber dana:</strong> Cashback referee disubsidi langsung oleh
            pemilik Teora (bukan dari revenue platform).
          </p>
        </div>
      </div>
    </div>
  );
}
