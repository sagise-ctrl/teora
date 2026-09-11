import { useState } from "react";
import { format } from "date-fns";
import { History, X, Eye, Share2, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useListSimulationSessions,
  useListSimulationMessages,
  useGetLatestSimulationReport,
  type SimulationSession,
  type SimulationMessage,
  type SimulationReport,
} from "@/lib/api-client-react";
import type { SimulationPersona } from "@/lib/api-client-react/generated/api.schemas";
import { cn } from "@/lib/utils";
import { SimulasiShareModal } from "./simulasi-share-modal";

const PERSONA_LABELS: Record<string, string> = {
  dosen_strict: "Dosen Ketat",
  dosen_friendly: "Dosen Ramah",
  audience_awam: "Audiens Awam",
  audience_expert: "Audiens Ahli",
};

const PERSONA_ICONS: Record<string, string> = {
  dosen_strict: "🎓",
  dosen_friendly: "📚",
  audience_awam: "👤",
  audience_expert: "🔬",
};

function formatRupiah(cents: number): string {
  if (cents === 0) return "Rp 0";
  return `Rp ${(cents / 100).toLocaleString("id-ID", { minimumFractionDigits: 0 })}`;
}

interface SessionRowProps {
  session: SimulationSession;
  onView: () => void;
  onShare: () => void;
  isLoading?: boolean;
}

function SessionRow({ session, onView, onShare, isLoading }: SessionRowProps) {
  const isCompleted = session.status === "completed";
  const personaLabel = PERSONA_LABELS[session.persona ?? ""] ?? session.persona ?? "—";
  const personaIcon = PERSONA_ICONS[session.persona ?? ""] ?? "🎤";

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/40 transition-colors group">
      <div className="text-xl">{personaIcon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium truncate">{personaLabel}</span>
          <Badge
            variant={isCompleted ? "secondary" : "outline"}
            className={cn(
              "text-[10px] px-1.5 py-0",
              isCompleted ? "bg-green-100 text-green-700 border-green-200" : "border-green-500 text-green-600"
            )}
          >
            {isCompleted ? "Selesai" : "Aktif"}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>{session.questionsAsked ?? 0}/10 pertanyaan</span>
          <span>·</span>
          <span>{format(new Date(session.startedAt!), "dd MMM yyyy, HH:mm")}</span>
          {session.totalCostCents != null && session.totalCostCents > 0 && (
            <>
              <span>·</span>
              <span className="font-mono">{formatRupiah(session.totalCostCents)}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onView} title="Lihat sesi">
          <Eye className="w-3.5 h-3.5" />
        </Button>
        {isCompleted && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onShare} title="Bagikan">
            <Share2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface SimulasiHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  onSelectSession: (
    session: SimulationSession,
    messages: SimulationMessage[] | null,
    report: SimulationReport | null
  ) => void;
}

export function SimulasiHistoryModal({
  open,
  onOpenChange,
  projectId,
  onSelectSession,
}: SimulasiHistoryModalProps) {
  const [shareSession, setShareSession] = useState<SimulationSession | null>(null);

  const sessionsQuery = useListSimulationSessions(projectId);

  const handleView = async (session: SimulationSession) => {
    const messagesQuery = await useListSimulationMessages(projectId, session.id!);

    let report: SimulationReport | null = null;
    if (session.status === "completed") {
      const reportQuery = await useGetLatestSimulationReport(projectId);
      report = reportQuery.data ?? null;
    }

    onSelectSession(session, messagesQuery.data?.messages ?? null, report);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Riwayat Simulasi
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            {sessionsQuery.isLoading ? (
              <div className="space-y-2 p-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sessionsQuery.isError ? (
              <div className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Gagal memuat riwayat sesi.
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => sessionsQuery.refetch()}>
                  Coba Lagi
                </Button>
              </div>
            ) : sessionsQuery.data && sessionsQuery.data.length > 0 ? (
              <div className="space-y-1 p-1">
                {sessionsQuery.data.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    onView={() => handleView(session)}
                    onShare={() => setShareSession(session)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Sparkles className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium mb-1">Belum ada sesi simulasi</p>
                <p className="text-xs text-muted-foreground">
                  Mulai simulasi pertama Anda di tab Simulasi pada workspace proyek.
                </p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {shareSession && (
        <SimulasiShareModal
          open={!!shareSession}
          onOpenChange={(o) => { if (!o) setShareSession(null); }}
          session={shareSession}
          projectId={projectId}
        />
      )}
    </>
  );
}
