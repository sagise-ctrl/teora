import { useState, useEffect } from "react";
import { Settings, Save, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLayout from "@/components/admin-layout";
import { customFetch } from "@/lib/api-client-react";
import { useToast } from "@/hooks/use-toast";

interface TierConfig {
  name: string;
  monthlyPriceCents: number;
  tokenLimit: number;
  features: string[];
  providers: string[];
}

interface TierList {
  tiers: Record<string, TierConfig>;
}

const DEFAULT_TIERS: TierList["tiers"] = {
  free: {
    name: "Free",
    monthlyPriceCents: 0,
    tokenLimit: 1000,
    features: ["Fitur dasar Teora", "Project terbatas"],
    providers: ["openai"],
  },
  starter: {
    name: "Starter",
    monthlyPriceCents: 49000,
    tokenLimit: 50000,
    features: ["Support prioritas", "Lebih banyak project"],
    providers: ["openai", "anthropic"],
  },
  pro: {
    name: "Pro",
    monthlyPriceCents: 199000,
    tokenLimit: 200000,
    features: ["Fitur lanjutan", "Antrian prioritas"],
    providers: ["openai", "anthropic", "google"],
  },
  ultra: {
    name: "Ultra",
    monthlyPriceCents: 499000,
    tokenLimit: 1000000,
    features: ["Fitur tanpa batas", "Support khusus", "Akses awal"],
    providers: ["openai", "anthropic", "google", "deepseek"],
  },
};

export default function AdminAITiers() {
  const [tiers, setTiers] = useState<TierList["tiers"]>(DEFAULT_TIERS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    customFetch<TierList>("/api/admin/ai-tiers")
      .then((data) => { if (data?.tiers) setTiers(data.tiers); })
      .catch(() => {/* use defaults */})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await customFetch("/api/admin/ai-tiers", {
        method: "PUT",
        body: JSON.stringify({ tiers }),
      });
      toast({ title: "Berhasil", description: "Konfigurasi tier disimpan" });
    } catch {
      toast({ title: "Gagal", description: "Tidak dapat menyimpan konfigurasi", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout activeTab="/admin/ai-tiers">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-tight">Konfigurasi Tier Teora</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Konfigurasi pricing dan limit per tier
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan..." : <><Save className="w-4 h-4 mr-2" /> Simpan</>}
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(tiers).map(([key, tier]) => (
              <Card key={key}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{tier.name}</CardTitle>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-mono">{key}</span>
                  </div>
                  <CardDescription>Tier ID: {key}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Monthly Price (Rp)</Label>
                      <Input
                        type="number"
                        value={tier.monthlyPriceCents}
                        onChange={(e) => setTiers((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], monthlyPriceCents: parseInt(e.target.value) || 0 },
                        }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Token Limit</Label>
                      <Input
                        type="number"
                        value={tier.tokenLimit}
                        onChange={(e) => setTiers((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], tokenLimit: parseInt(e.target.value) || 0 },
                        }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Features (comma-separated)</Label>
                    <Input
                      value={tier.features.join(", ")}
                      onChange={(e) => setTiers((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], features: e.target.value.split(",").map((f) => f.trim()).filter(Boolean) },
                      }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Providers (comma-separated)</Label>
                    <Input
                      value={tier.providers.join(", ")}
                      onChange={(e) => setTiers((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], providers: e.target.value.split(",").map((p) => p.trim()).filter(Boolean) },
                      }))}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
