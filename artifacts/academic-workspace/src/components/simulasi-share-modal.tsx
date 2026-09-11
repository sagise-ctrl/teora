import { useState } from "react";
import { Share2, Copy, Check, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { SimulationSession } from "@/lib/api-client-react";

interface SimulasiShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SimulationSession;
  projectId: number;
}

export function SimulasiShareModal({ open, onOpenChange, session }: SimulasiShareModalProps) {
  const { toast } = useToast();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateShareLink = async () => {
    setLoading(true);
    setError(null);

    try {
      const baseUrl = import.meta.env.VITE_API_URL ?? "";
      const token = localStorage.getItem("teora_token");
      const res = await fetch(`${baseUrl}/projects/${session.projectId}/simulasi/sessions/${session.id}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      const tokenId = data.tokenId ?? data.token ?? data.id;
      const url = `${window.location.origin}/shared/simulasi/${tokenId}`;
      setShareUrl(url);
    } catch (err) {
      const errMsg = (err as Error).message ?? String(err ?? "");
      setError(errMsg || "Gagal membuat link");
      toast({
        variant: "destructive",
        title: "Gagal membuat link",
        description: errMsg || "Terjadi kesalahan.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: "destructive", title: "Gagal menyalin" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Bagikan Laporan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Buat link publik untuk membagikan laporan simulasi presentasi ini. Link tidak memerlukan login.
          </p>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {shareUrl ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="flex-1 text-xs font-mono" />
                <Button size="icon" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Link berlaku 7 hari. Siapa pun dengan link ini dapat melihat laporan simulasi Anda.
              </p>
              <Button variant="outline" size="sm" className="w-full" onClick={() => { setShareUrl(null); setError(null); }}>
                Buat Link Baru
              </Button>
            </div>
          ) : (
            <Button className="w-full" onClick={handleCreateShareLink} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Membuat link...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-2" />
                  Buat Link Publik
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
