import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sprout,
  Shield,
  Sparkles,
  Briefcase,
  Crown,
  Check,
  Clock,
  Zap,
  Calendar,
  AlertCircle,
  Coins,
  Timer,
} from "lucide-react";
import { Link } from "wouter";

type ModelType = "lama" | "campuran" | "baru";

interface QuotaSpec {
  haiku?: { per5h: number; per7d: number; max15: number; max30: number };
  sonnet?: { per5h: number; per7d: number; max15: number; max30: number };
}

interface TierConfig {
  id: string;
  name: string;
  tagline: string;
  icon: React.ElementType;
  gradient: string;
  highlight?: "best-value" | "popular";
  targetAudience: string;
  price15: number;
  price30: number;
  quota: Record<ModelType, QuotaSpec>;
  features: string[];
}

const IDR = (n: number) =>
  "Rp " + n.toLocaleString("id-ID", { maximumFractionDigits: 0 });

// Quota numbers dalam 'K' (ribu token) untuk compact display
// 5h cap = 10% × 7d cap (anchored dari first use)
// 15d max = 2 × 7d cap, 30d max = 4 × 7d cap
const TIERS: TierConfig[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Untuk coba-coba & tugas ringan",
    icon: Sprout,
    gradient: "from-green-500 to-emerald-600",
    targetAudience: "Mahasiswa semester awal, tugas harian",
    price15: 8000,
    price30: 13600,
    quota: {
      lama: {
        haiku: { per5h: 7, per7d: 70, max15: 140, max30: 280 },
      },
      campuran: {
        haiku: { per5h: 3.5, per7d: 35, max15: 70, max30: 140 },
        sonnet: { per5h: 1.8, per7d: 18, max15: 36, max30: 72 },
      },
      baru: {
        sonnet: { per5h: 3.5, per7d: 35, max15: 70, max30: 140 },
      },
    },
    features: [],
  },
  {
    id: "standar",
    name: "Standar",
    tagline: "Untuk tugas mingguan & paper singkat",
    icon: Shield,
    gradient: "from-[#2D79FF] to-[#8E54E9]",
    highlight: "popular",
    targetAudience: "Mahasiswa aktif, tugas rutin 1-2 paper/minggu",
    price15: 15000,
    price30: 25500,
    quota: {
      lama: {
        haiku: { per5h: 15, per7d: 150, max15: 300, max30: 600 },
      },
      campuran: {
        haiku: { per5h: 7.5, per7d: 75, max15: 150, max30: 300 },
        sonnet: { per5h: 3.6, per7d: 36, max15: 72, max30: 144 },
      },
      baru: {
        sonnet: { per5h: 7.4, per7d: 74, max15: 148, max30: 296 },
      },
    },
    features: [],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Untuk skripsi & paper panjang",
    icon: Sparkles,
    gradient: "from-purple-500 to-pink-600",
    highlight: "best-value",
    targetAudience: "Mahasiswa akhir, skripsi, paper jurnal",
    price15: 27000,
    price30: 45900,
    quota: {
      lama: {
        haiku: { per5h: 27, per7d: 270, max15: 540, max30: 1080 },
      },
      campuran: {
        haiku: { per5h: 13.5, per7d: 135, max15: 270, max30: 540 },
        sonnet: { per5h: 6.5, per7d: 65, max15: 130, max30: 260 },
      },
      baru: {
        sonnet: { per5h: 13.2, per7d: 132, max15: 264, max30: 528 },
      },
    },
    features: [],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Untuk thesis & riset serius",
    icon: Briefcase,
    gradient: "from-indigo-500 to-blue-700",
    targetAudience: "S2, dosen, peneliti muda",
    price15: 45000,
    price30: 76500,
    quota: {
      lama: {
        haiku: { per5h: 45, per7d: 450, max15: 900, max30: 1800 },
      },
      campuran: {
        haiku: { per5h: 22.5, per7d: 225, max15: 450, max30: 900 },
        sonnet: { per5h: 10.8, per7d: 108, max15: 216, max30: 432 },
      },
      baru: {
        sonnet: { per5h: 22.2, per7d: 222, max15: 444, max30: 888 },
      },
    },
    features: [],
  },
  {
    id: "ultra",
    name: "Ultra",
    tagline: "Untuk PhD, lab, & research team",
    icon: Crown,
    gradient: "from-amber-500 to-orange-600",
    targetAudience: "S3, lab research, tim riset, lecturer senior",
    price15: 75000,
    price30: 127500,
    quota: {
      lama: {
        haiku: { per5h: 75, per7d: 750, max15: 1500, max30: 3000 },
      },
      campuran: {
        haiku: { per5h: 37.5, per7d: 375, max15: 750, max30: 1500 },
        sonnet: { per5h: 18, per7d: 180, max15: 360, max30: 720 },
      },
      baru: {
        sonnet: { per5h: 37, per7d: 370, max15: 740, max30: 1480 },
      },
    },
    features: [],
  },
];

const MODEL_LABELS: Record<ModelType, { label: string; desc: string }> = {
  lama: {
    label: "Lama",
    desc: "Haiku 4.5 only",
  },
  campuran: {
    label: "Campuran",
    desc: "Haiku + Sonnet 5 auto-route",
  },
  baru: {
    label: "Baru",
    desc: "Sonnet 5 only",
  },
};

function formatQuota(n: number): string {
  // Convert K to readable: 7 → "7K", 3.5 → "3.5K", 1500 → "1.5M"
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n % 1 === 0) return n + "K";
  return n + "K";
}

function QuotaBox({
  quota,
  period,
}: {
  quota: QuotaSpec;
  period: "15" | "30";
}) {
  const h = quota.haiku;
  const s = quota.sonnet;
  const maxKey = period === "15" ? "max15" : "max30";
  const periodLabel = period === "15" ? "15 hari" : "30 hari";

  return (
    <div className="bg-muted/40 rounded-lg p-3 space-y-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
        Kuota Anda
      </p>

      {h && (
        <div className="flex items-start gap-2">
          <Timer className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">Batas 5 jam</p>
            <p className="text-xs text-muted-foreground">
              {formatQuota(h.per5h)} Haiku
              {s && ` + ${formatQuota(s.per5h)} Sonnet`}
            </p>
          </div>
        </div>
      )}

      {!h && s && (
        <div className="flex items-start gap-2">
          <Timer className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">Batas 5 jam</p>
            <p className="text-xs text-muted-foreground">
              {formatQuota(s.per5h)} Sonnet
            </p>
          </div>
        </div>
      )}

      {h && (
        <div className="flex items-start gap-2">
          <Calendar className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">Batas 7 hari</p>
            <p className="text-xs text-muted-foreground">
              {formatQuota(h.per7d)} Haiku
              {s && ` + ${formatQuota(s.per7d)} Sonnet`}
            </p>
          </div>
        </div>
      )}

      {!h && s && (
        <div className="flex items-start gap-2">
          <Calendar className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">Batas 7 hari</p>
            <p className="text-xs text-muted-foreground">
              {formatQuota(s.per7d)} Sonnet
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

function TierCard({
  tier,
  model,
  period,
}: {
  tier: TierConfig;
  model: ModelType;
  period: "15" | "30";
}) {
  const Icon = tier.icon;
  const price = period === "15" ? tier.price15 : tier.price30;
  const perDay = period === "15" ? price / 15 : price / 30;
  const highlightText =
    tier.highlight === "best-value"
      ? "Pilihan Terbaik"
      : tier.highlight === "popular"
      ? "Paling Populer"
      : null;

  return (
    <Card
      className={`relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all ${
        tier.highlight ? "ring-2 ring-[#2D79FF]/40" : ""
      }`}
    >
      {highlightText && (
        <div className="h-7 bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] flex items-center justify-center">
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">
            {highlightText}
          </span>
        </div>
      )}

      <div className={`h-1 ${tier.highlight ? "h-0" : ""} bg-gradient-to-r ${tier.gradient}`} />

      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tier.gradient} flex items-center justify-center shadow-sm`}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">{tier.name}</CardTitle>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {tier.targetAudience}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2 italic">
          {tier.tagline}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price */}
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight">
              {IDR(price)}
            </span>
            <span className="text-xs text-muted-foreground">
              / {period} hari
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5" />
        </div>

        {/* Quota box */}
        <QuotaBox quota={tier.quota[model]} period={period} />

        {/* Features */}
        {tier.features.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">
              Termasuk
            </p>
            <ul className="space-y-1.5">
              {tier.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <Button
          disabled
          className={`w-full bg-gradient-to-r ${tier.gradient} text-white opacity-90 cursor-not-allowed`}
          title="Backend subscription sedang dalam pengembangan"
        >
          <Coins className="w-4 h-4 mr-2" />
          Pilih {tier.name}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function LanggananPage() {
  const [period, setPeriod] = useState<"15" | "30">("15");
  const [model, setModel] = useState<ModelType>("campuran");

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-3">
        <Badge variant="secondary" className="bg-[#2D79FF]/10 text-[#2D79FF] border-0">
          Paket Berlangganan
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Pilih paket yang sesuai untuk riset Anda
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
          Berlangganan bulanan dengan kuota pasti. Semua paket sudah termasuk
          akses Claude Haiku 4.5 dan Sonnet 5. Tanpa biaya tersembunyi, berhenti
          kapan saja.
        </p>
      </div>

      {/* Period Tabs */}
      <div className="flex justify-center">
        <Tabs
          value={period}
          onValueChange={(v) => setPeriod(v as "15" | "30")}
        >
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="15" className="gap-2">
              <Calendar className="w-3.5 h-3.5" />
              15 hari
            </TabsTrigger>
            <TabsTrigger value="30" className="gap-2">
              <Calendar className="w-3.5 h-3.5" />
              30 hari
              <Badge className="ml-1 bg-green-100 text-green-700 border-0 text-[9px] px-1.5">
                Hemat 15%
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Model Type Toggle (shared) */}
      <div className="flex justify-center">
        <div className="bg-muted/50 rounded-lg p-1 inline-flex items-center gap-1">
          <span className="text-xs text-muted-foreground px-3">
            Tipe Model:
          </span>
          <ToggleGroup
            type="single"
            value={model}
            onValueChange={(v) => v && setModel(v as ModelType)}
            variant="outline"
          >
            {(Object.keys(MODEL_LABELS) as ModelType[]).map((m) => (
              <ToggleGroupItem
                key={m}
                value={m}
                aria-label={MODEL_LABELS[m].label}
                className="gap-2"
              >
                {MODEL_LABELS[m].label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <span className="text-xs text-muted-foreground px-3 hidden md:inline">
            · {MODEL_LABELS[model].desc}
          </span>
        </div>
      </div>

      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {TIERS.map((tier) => (
          <TierCard key={tier.id} tier={tier} model={model} period={period} />
        ))}
      </div>

      {/* Per-token economics */}
      {/* REMOVED per owner 2026-09-08 — features/benefits not confirmed, don't want to set expectations */}

      {/* How Quota Works - Explanation */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#2D79FF]" />
            Cara kerja kuota Anda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-blue-500" />
                <p className="font-semibold">Batas 5 jam</p>
              </div>
              <p className="text-xs text-muted-foreground">
                10% dari batas 7 hari. Cegah marathon pakai 1 sesi.
                Reset penuh setelah 5 jam dari penggunaan pertama.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <p className="font-semibold">Batas 7 hari</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Kuota utama per window. Di-anchor dari waktu pertama
                pakai. Reset penuh 7 hari setelah anchor.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-xs text-muted-foreground border border-blue-200/30">
            <p>
              <strong>Reset otomatis:</strong> Batas 5 jam dan 7 hari di-reset
              ke nilai penuh setelah window berakhir. Tidak perlu top-up
              tambahan. Hard cap langganan hanya ter-reset saat perpanjang.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Pertanyaan yang sering ditanya</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-sm">
                Kapan perhitungan 5 jam dan 7 hari dimulai?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground">
                Dimulai dari waktu pertama kali Anda menggunakan token dalam
                periode langganan. Batas 5 jam reset setelah 5 jam berlalu.
                Batas 7 hari reset setelah 7 hari berlalu dari waktu pertama pakai.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-sm">
                Berapa kali saya bisa pakai kuota 7 hari dalam langganan?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground">
                Pada langganan 15 hari, Anda mendapat <strong>2 window 7 hari</strong>.
                Pada langganan 30 hari, Anda mendapat <strong>4 window 7 hari</strong>.
                Setelah window ke-2 (atau ke-4) berakhir, langganan juga berakhir.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-sm">
                Apa beda langganan 15 hari vs 30 hari?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground">
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <strong>Total kuota</strong>: 30 hari dapat 2× lipat lebih banyak (4 windows
                    vs 2 windows).
                  </li>
                  <li>
                    <strong>Harga per token</strong>: 30 hari 15% lebih hemat per
                    token.
                  </li>
                  <li>
                    <strong>Periode</strong>: 30 hari lebih cocok untuk project
                    panjang (skripsi, paper jurnal). 15 hari untuk coba-coba.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-sm">
                Bagaimana cara berlangganan?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground">
                Sistem pembayaran sedang dalam tahap integrasi (Midtrans/Stripe).
                Untuk aktivasi awal, hubungi admin untuk aktivasi manual. Setelah
                payment gateway aktif, Anda bisa berlangganan langsung dari
                halaman ini dengan pilih paket &amp; bayar via QRIS / virtual account.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Coming Soon Notice */}
      <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1.5">
              <h3 className="font-semibold text-sm text-foreground">
                Backend subscription sedang dalam pengembangan
              </h3>
              <p className="text-xs text-muted-foreground">
                Halaman ini adalah preview desain. Tombol "Pilih paket" belum
                aktif. Setelah payment gateway (Midtrans/Stripe) diintegrasikan
                dan schema database siap, Anda bisa berlangganan langsung dari
                sini.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                <p className="text-xs text-orange-600 font-medium">
                  Estimasi aktif: 2-4 minggu setelah payment gateway ready.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Back link */}
      <div className="text-center">
        <Link href="/dashboard">
          <Button variant="ghost" className="text-muted-foreground">
            ← Kembali ke Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
