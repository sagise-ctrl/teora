import { useGetAITiers } from "@/lib/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Zap,
  Shield,
  Sparkles,
  Crown,
  Check,
  AlertCircle,
  Coins,
  TrendingUp,
} from "lucide-react";
import { Link } from "wouter";

const TIER_ICONS: Record<string, React.ElementType> = {
  gratis: Zap,
  free: Zap,
  Gratis: Zap,
  Standar: Shield,
  Standard: Shield,
  standard: Shield,
  Premium: Sparkles,
  premium: Sparkles,
  Ultra: Crown,
  ultra: Crown,
};

const TIER_GRADIENTS: Record<string, string> = {
  gratis: "from-green-500 to-emerald-600",
  free: "from-green-500 to-emerald-600",
  Gratis: "from-green-500 to-emerald-600",
  Standar: "from-[#2D79FF] to-[#8E54E9]",
  Standard: "from-[#2D79FF] to-[#8E54E9]",
  standard: "from-[#2D79FF] to-[#8E54E9]",
  Premium: "from-purple-500 to-pink-600",
  premium: "from-purple-500 to-pink-600",
  Ultra: "from-amber-500 to-orange-600",
  ultra: "from-amber-500 to-orange-600",
};

const PROVIDER_LABELS: Record<string, { label: string; color: string }> = {
  groq: { label: "Groq", color: "bg-orange-100 text-orange-700" },
  anthropic: { label: "Anthropic", color: "bg-orange-100 text-orange-700" },
  openai: { label: "OpenAI", color: "bg-green-100 text-green-700" },
};

function TierCard({
  tier,
  index,
}: {
  tier: {
    id?: string;
    name?: string;
    provider?: string;
    model?: string;
    pricePer1MInputCents?: number;
    pricePer1MOutputCents?: number;
    rateLimitRpm?: number | null;
    rateLimitTpd?: number | null;
    isFree?: boolean;
    description?: string;
    usageTips?: string | null;
    rateLimit?: string;
    priceDisplay?: string;
  };
  index: number;
}) {
  const name = tier.name ?? "Unknown";
  const Icon = TIER_ICONS[name] ?? Zap;
  const gradient = TIER_GRADIENTS[name] ?? "from-[#2D79FF] to-[#8E54E9]";
  const providerInfo = tier.provider
    ? PROVIDER_LABELS[tier.provider.toLowerCase()] ?? {
        label: tier.provider,
        color: "bg-muted text-muted-foreground",
      }
    : null;

  return (
    <Card
      className={`relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow ${
        index === 0 ? "ring-2 ring-green-500/30" : ""
      }`}
    >
      {/* Gradient header bar */}
      <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {name}
                {tier.isFree && (
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700 text-[10px] border-0"
                  >
                    FREE
                  </Badge>
                )}
              </CardTitle>
              {providerInfo && (
                <Badge className={`text-[10px] mt-0.5 ${providerInfo.color} border-0`}>
                  {providerInfo.label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {tier.description && (
          <p className="text-sm text-muted-foreground mt-3">{tier.description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Model */}
        {tier.model && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
              Model
            </p>
            <p className="text-sm font-mono font-medium">{tier.model}</p>
          </div>
        )}

        {/* Price */}
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
            Harga per 1M Tokens
          </p>
          {tier.isFree || tier.priceDisplay === "Rp 0" || !tier.pricePer1MInputCents ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-green-600">GRATIS</span>
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-0 text-[10px]">
                Rp 0
              </Badge>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">
                  {tier.priceDisplay ?? "Rp " + (tier.pricePer1MInputCents / 100).toFixed(0)}
                </span>
                <span className="text-xs text-muted-foreground">/ 1M tokens</span>
              </div>
              {tier.pricePer1MOutputCents && tier.pricePer1MOutputCents !== tier.pricePer1MInputCents && (
                <p className="text-xs text-muted-foreground">
                  Output: Rp {(tier.pricePer1MOutputCents / 100).toFixed(0)} / 1M tokens
                </p>
              )}
            </div>
          )}
        </div>

        {/* Rate Limits */}
        {(tier.rateLimitRpm || tier.rateLimitTpd) && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
              Batasan (Rate Limit)
            </p>
            {tier.rateLimitRpm && (
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs">
                  <strong>{tier.rateLimitRpm}</strong> req/menit
                </span>
              </div>
            )}
            {tier.rateLimitTpd && (
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs">
                  <strong>{(tier.rateLimitTpd / 1000).toFixed(0)}K</strong> tokens/hari
                </span>
              </div>
            )}
            {tier.rateLimit && (
              <p className="text-[10px] text-muted-foreground italic">{tier.rateLimit}</p>
            )}
          </div>
        )}

        {/* Usage Tips */}
        {tier.usageTips && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
            <p>{tier.usageTips}</p>
          </div>
        )}

        {/* CTA */}
        <Link href="/topup">
          <Button
            className={`w-full ${
              tier.isFree
                ? "bg-green-500 hover:bg-green-600"
                : "bg-gradient-to-r " + gradient + " hover:opacity-90"
            } text-white shadow-sm`}
          >
            {tier.isFree ? (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Gunakan Gratis
              </>
            ) : (
              <>
                <Coins className="w-4 h-4 mr-2" />
                Topup untuk Akses
              </>
            )}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function AIPricingPage() {
  const { data, isLoading, error } = useGetAITiers();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          AI Pricing
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Pilih AI tier sesuai kebutuhan Anda. Setiap tier menawarkan model dan
          kemampuan berbeda dengan harga yang transparan.
        </p>
      </div>

      {/* How it works */}
      <Card className="border-border/50">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Cara Kerja</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#2D79FF]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-[#2D79FF]">1</span>
              </div>
              <div>
                <p className="text-sm font-medium">Topup Saldo</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Deposit saldo sesuai kebutuhan Anda
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#2D79FF]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-[#2D79FF]">2</span>
              </div>
              <div>
                <p className="text-sm font-medium">Pilih Tier</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pilih model AI sesuai kebutuhan percakapan
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#2D79FF]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-[#2D79FF]">3</span>
              </div>
              <div>
                <p className="text-sm font-medium">Biaya per Penggunaan</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Saldo dipotong sesuai tokens yang digunakan
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tier Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-0 shadow-md">
              <Skeleton className="h-1.5 rounded-t" />
              <CardHeader className="pb-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-6 w-24 mt-2" />
                <Skeleton className="h-4 w-32 mt-1" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
            <p className="text-sm text-destructive">Gagal memuat daftar tier.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pastikan Anda terhubung ke internet.
            </p>
          </CardContent>
        </Card>
      ) : data?.tiers && data.tiers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.tiers.map((tier, index) => (
            <TierCard key={tier.id ?? index} tier={tier} index={index} />
          ))}
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada tier yang dikonfigurasi.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <Card className="border-border/50 bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                <strong>Catatan:</strong> Harga dihitung berdasarkan jumlah tokens
                (input + output) yang digunakan per permintaan. Token ditampilkan
                dalam hitungan per-juta (1M). Saldo dipotong sesuai penggunaan aktual.
              </p>
              <p className="text-xs text-muted-foreground">
                Tier Gratis menggunakan batasan bersama per organisasi. Tidak semua
                model tersedia di semua tier.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Back to Dashboard */}
      <div className="text-center">
        <Link href="/">
          <Button variant="ghost" className="text-muted-foreground">
            ← Kembali ke Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
