import { useState, useEffect } from "react";
import {
  useGetAdminAITiers,
  useUpdateAdminAITier,
  type AITierAdmin,
  type UpdateAITierRequest,
} from "@/lib/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Zap,
  Crown,
  Sparkles,
  Shield,
  Coins,
  Pencil,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  Gratis: "from-green-500 to-emerald-600",
  Standar: "from-[#2D79FF] to-[#8E54E9]",
  Standard: "from-[#2D79FF] to-[#8E54E9]",
  standard: "from-[#2D79FF] to-[#8E54E9]",
  Premium: "from-purple-500 to-pink-600",
  premium: "from-purple-500 to-pink-600",
  Ultra: "from-amber-500 to-orange-600",
  ultra: "from-amber-500 to-orange-600",
};

function formatIdr(cents: number): string {
  if (!cents) return "Rp 0";
  return "Rp " + (cents / 100).toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

function TierEditorCard({
  tier,
  onSaved,
}: { tier: AITierAdmin; onSaved: () => void }) {
  const { toast } = useToast();
  const updateTier = useUpdateAdminAITier();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateAITierRequest>({});

  useEffect(() => {
    if (editing) {
      setForm({
        name: tier.name,
        pricePer1MInputCents: tier.pricePer1MInputCents,
        pricePer1MOutputCents: tier.pricePer1MOutputCents,
        rateLimitRpm: tier.rateLimitRpm ?? null,
        rateLimitTpd: tier.rateLimitTpd ?? null,
        isFree: tier.isFree,
        isActive: tier.isActive,
        description: tier.description,
        usageTips: tier.usageTips ?? null,
      });
    }
  }, [editing, tier]);

  const name = tier.name ?? "Unknown";
  const Icon = TIER_ICONS[name] ?? Zap;
  const gradient = TIER_GRADIENTS[name] ?? "from-[#2D79FF] to-[#8E54E9]";

  const handleSave = () => {
    updateTier.mutate(
      { tierId: tier.id!, data: form },
      {
        onSuccess: () => {
          toast({
            title: "Tersimpan",
            description: `Tier ${name} berhasil diperbarui.`,
          });
          setEditing(false);
          onSaved();
        },
        onError: (err) => {
          toast({
            title: "Gagal menyimpan",
            description: String(err),
            variant: "destructive",
          });
        },
      }
    );
  };

  const margin = (() => {
    const sellIn = tier.pricePer1MInputCents ?? 0;
    const costIn = tier.providerCostPer1MInputCents ?? 0;
    if (costIn === 0) return null;
    const profit = sellIn - costIn;
    return {
      cents: profit,
      pct: Math.round((profit / costIn) * 100),
    };
  })();

  return (
    <Card className="overflow-hidden">
      <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {name}
                {tier.isFree && (
                  <Badge className="text-[10px] bg-green-100 text-green-700 border-0">
                    FREE
                  </Badge>
                )}
                {!tier.isActive && (
                  <Badge variant="secondary" className="text-[10px]">
                    HIDDEN
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {tier.id} · {tier.provider}
              </p>
            </div>
          </div>
          {!editing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Pencil className="w-3.5 h-3.5 mr-1" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(false)}
                disabled={updateTier.isPending}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateTier.isPending}
                className="bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] hover:opacity-90"
              >
                {updateTier.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1" />
                )}
                Simpan
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {!editing ? (
          <>
            {/* View Mode */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-muted/30 rounded p-2">
                <p className="text-muted-foreground">Harga Input</p>
                <p className="font-mono font-semibold text-sm mt-0.5">
                  {formatIdr(tier.pricePer1MInputCents ?? 0)}
                </p>
              </div>
              <div className="bg-muted/30 rounded p-2">
                <p className="text-muted-foreground">Harga Output</p>
                <p className="font-mono font-semibold text-sm mt-0.5">
                  {formatIdr(tier.pricePer1MOutputCents ?? 0)}
                </p>
              </div>
              <div className="bg-muted/30 rounded p-2">
                <p className="text-muted-foreground">Biaya Provider (In)</p>
                <p className="font-mono text-sm mt-0.5">
                  ${((tier.providerCostPer1MInputCents ?? 0) / 100).toFixed(2)}
                </p>
              </div>
              <div className="bg-muted/30 rounded p-2">
                <p className="text-muted-foreground">Margin</p>
                {margin ? (
                  <p
                    className={`font-mono font-semibold text-sm mt-0.5 ${
                      margin.pct > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {margin.pct > 0 ? "+" : ""}
                    {margin.pct}%
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">—</p>
                )}
              </div>
              <div className="bg-muted/30 rounded p-2">
                <p className="text-muted-foreground">Rate Limit</p>
                <p className="text-sm mt-0.5">
                  {tier.rateLimitRpm ?? "—"} req/menit
                </p>
              </div>
              <div className="bg-muted/30 rounded p-2">
                <p className="text-muted-foreground">Token / hari</p>
                <p className="text-sm mt-0.5">
                  {tier.rateLimitTpd
                    ? tier.rateLimitTpd.toLocaleString("id-ID")
                    : "—"}
                </p>
              </div>
            </div>
            {tier.description && (
              <p className="text-xs text-muted-foreground italic">
                "{tier.description}"
              </p>
            )}
          </>
        ) : (
          <>
            {/* Edit Mode */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Nama Tampil</Label>
                  <Input
                    value={form.name ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <Switch
                    checked={form.isFree ?? false}
                    onCheckedChange={(c) =>
                      setForm({ ...form, isFree: c })
                    }
                  />
                  <Label className="text-xs">Gratis</Label>
                  <Switch
                    checked={form.isActive ?? true}
                    onCheckedChange={(c) =>
                      setForm({ ...form, isActive: c })
                    }
                  />
                  <Label className="text-xs">Aktif</Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">
                    Harga Input (IDR cents / 1M)
                  </Label>
                  <Input
                    type="number"
                    value={form.pricePer1MInputCents ?? 0}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pricePer1MInputCents: parseInt(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-sm font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    = {formatIdr(form.pricePer1MInputCents ?? 0)}
                  </p>
                </div>
                <div>
                  <Label className="text-xs">
                    Harga Output (IDR cents / 1M)
                  </Label>
                  <Input
                    type="number"
                    value={form.pricePer1MOutputCents ?? 0}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pricePer1MOutputCents: parseInt(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-sm font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    = {formatIdr(form.pricePer1MOutputCents ?? 0)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Rate Limit (req/menit)</Label>
                  <Input
                    type="number"
                    value={form.rateLimitRpm ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        rateLimitRpm: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      })
                    }
                    placeholder="Tanpa batas"
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs">Token per hari</Label>
                  <Input
                    type="number"
                    value={form.rateLimitTpd ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        rateLimitTpd: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      })
                    }
                    placeholder="Tanpa batas"
                    className="h-8 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Deskripsi</Label>
                <Input
                  value={form.description ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Usage Tips (untuk user)</Label>
                <Textarea
                  value={form.usageTips ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, usageTips: e.target.value })
                  }
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAiTiersPanel() {
  const { data, isLoading, error, refetch } = useGetAdminAITiers();
  const { toast } = useToast();

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-6 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-sm text-destructive">
            Gagal memuat tier. Pastikan Anda adalah owner.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Coba lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Coins className="w-5 h-5" />
            AI Tier Pricing
          </h2>
          <p className="text-sm text-muted-foreground">
            Konfigurasi harga per-tier, margin, dan rate limit
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Pricing Reference Card */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Cara Menghitung Harga</p>
              <p className="text-xs text-muted-foreground">
                <strong>Harga user</strong> = (biaya provider + margin) × 16.000
                (kurs USD→IDR).{" "}
                <strong>Satuan</strong>: cents per 1M tokens.{" "}
                <strong>Saldo user</strong> dipotong sesuai tokens aktual yang
                dipakai. Lihat{" "}
                <code className="bg-muted px-1 rounded">
                  docs/ai-team/finance/ai-provider-pricing.md
                </code>{" "}
                untuk referensi.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tier cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <Skeleton className="h-1.5 rounded-t" />
              <CardHeader>
                <Skeleton className="h-10 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.tiers && data.tiers.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.tiers.map((tier) => (
            <TierEditorCard
              key={tier.id}
              tier={tier}
              onSaved={() => refetch()}
            />
          ))}
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada tier yang dikonfigurasi di database.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}