import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Sparkles, Send, Loader2, Zap, CheckCircle, ChevronRight, History, X, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useCreateSimulationSession,
  useListSimulationSessions,
  useListSimulationMessages,
  useSendSimulationMessage,
  useCompleteSimulationSession,
  useGetAITiers,
  useGetMyBalance,
  type SimulationSession,
  type SimulationMessage,
  type SimulationReport,
} from "@/lib/api-client-react";
import type { SimulationPersona } from "@/lib/api-client-react/generated/api.schemas";
import { parseInsufficientBalance } from "@/components/parse-insufficient-balance";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Phase = "intro" | "persona-select" | "active" | "completed";

const PERSONA_OPTIONS: Array<{
  id: SimulationPersona;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    id: "dosen_strict",
    label: "Dosen Ketat",
    description: "Kritis dan menuntut. Mencari kelemahan argumen, metodologi, dan referensi.",
    icon: "🎓",
  },
  {
    id: "dosen_friendly",
    label: "Dosen Ramah",
    description: "Suportif tapi tetap akademis. Memberikan saran konstruktif dan hangat.",
    icon: "📚",
  },
  {
    id: "audience_awam",
    label: "Audiens Awam",
    description: "Bukan ahli di bidang ini. Bertanya dari perspektif orang yang ingin memahami.",
    icon: "👤",
  },
  {
    id: "audience_expert",
    label: "Audiens Ahli",
    description: "Kritis dan mendalam. Bertanya soal metodologi, data, dan klaim teknis.",
    icon: "🔬",
  },
];

function formatRupiah(cents: number): string {
  if (cents === 0) return "Rp 0";
  return `Rp ${(cents / 100).toLocaleString("id-ID", { minimumFractionDigits: 0 })}`;
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-green-600" :
    score >= 60 ? "text-yellow-600" :
    "text-red-600";
  return (
    <span className={cn("font-bold text-lg", color)}>{score}</span>
  );
}

export function SimulasiTab({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: tiersData } = useGetAITiers();
  const { data: balanceData } = useGetMyBalance();

  const [phase, setPhase] = useState<Phase>("intro");
  const [selectedPersona, setSelectedPersona] = useState<SimulationPersona | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const [activeSession, setActiveSession] = useState<SimulationSession | null>(null);
  const [messages, setMessages] = useState<SimulationMessage[]>([]);
  const [report, setReport] = useState<SimulationReport | null>(null);
  const [content, setContent] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [insufficientBalanceOpen, setInsufficientBalanceOpen] = useState(false);
  const [insufficientBalanceData, setInsufficientBalanceData] = useState<{
    error: string;
    balanceCents?: number;
    costCents?: number;
    tierName?: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const createSession = useCreateSimulationSession();
  const sendMessage = useSendSimulationMessage();
  const completeSession = useCompleteSimulationSession();

  useEffect(() => {
    if (tiersData?.tiers && tiersData.tiers.length > 0 && !selectedTierId) {
      const preferred = tiersData.tiers.find(
        (t) => t.id === balanceData?.preferredTierId
      );
      if (preferred) {
        setSelectedTierId(preferred.id!);
      } else {
        setSelectedTierId(tiersData.tiers[0].id!);
      }
    }
  }, [tiersData, balanceData, selectedTierId]);

  const selectedTier = tiersData?.tiers?.find((t) => t.id === selectedTierId);
  const runningCost = activeSession?.totalCostCents ?? 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleStart = async () => {
    if (!selectedPersona) return;

    try {
      const result = await createSession.mutateAsync({
        projectId,
        data: {
          persona: selectedPersona,
          tierId: selectedTierId || undefined,
        },
      });

      setActiveSession(result as SimulationSession);
      setMessages(result.messages ?? []);
      setPhase("active");
      queryClient.invalidateQueries({ queryKey: ["listSimulationSessions"] });
    } catch (err) {
      const insufficient = parseInsufficientBalance(err);
      if (insufficient) {
        setInsufficientBalanceData({ ...insufficient, error: insufficient.error ?? "Saldo tidak mencukupi." });
        setInsufficientBalanceOpen(true);
        return;
      }
      toast({
        variant: "destructive",
        title: "Gagal memulai simulasi",
        description: String((err as Error).message ?? err ?? "Terjadi kesalahan."),
      });
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || !activeSession || sendMessage.isPending) return;

    const messageContent = content;
    setContent("");

    sendMessage.mutate(
      {
        projectId,
        sessionId: activeSession.id!,
        data: { content: messageContent },
      },
      {
        onSuccess: (result) => {
          const resultAny = result as SimulationSession & { messages?: SimulationMessage[]; report?: SimulationReport };
          setActiveSession(resultAny);
          if (resultAny.messages) {
            setMessages(resultAny.messages);
          }
          if (resultAny.report) {
            setReport(resultAny.report);
            setPhase("completed");
          }
          queryClient.invalidateQueries({ queryKey: ["listSimulationSessions"] });
        },
        onError: (err) => {
          const insufficient = parseInsufficientBalance(err);
          if (insufficient) {
            setInsufficientBalanceData({ ...insufficient, error: insufficient.error ?? "Saldo tidak mencukupi." });
            setInsufficientBalanceOpen(true);
            return;
          }
          toast({
            variant: "destructive",
            title: "Gagal mengirim",
            description: String((err as Error).message ?? err ?? "Terjadi kesalahan."),
          });
          setContent(messageContent);
        },
      }
    );
  };

  const handleComplete = async () => {
    if (!activeSession) return;

    try {
      const result = await completeSession.mutateAsync({
        projectId,
        sessionId: activeSession.id!,
      });
      setActiveSession(result);
      if (result.report) {
        setReport(result.report);
      }
      setPhase("completed");
      queryClient.invalidateQueries({ queryKey: ["listSimulationSessions"] });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Gagal menyelesaikan sesi",
        description: String((err as Error).message ?? err ?? "Terjadi kesalahan."),
      });
    }
  };

  const handleBackToIntro = () => {
    setPhase("intro");
    setSelectedPersona(null);
    setActiveSession(null);
    setMessages([]);
    setReport(null);
  };

  return (
    <>
      {phase === "intro" && (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-2">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Simulasi Presentasi</h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                Latihan presentasi dengan AI sebagai penanya kritis. AI akan memulai dan bertanya langsung tentang project Anda, seolah-olah Anda sedang di ruang sidang atau seminar.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-primary">1</span>
                </div>
                <div>
                  <span className="font-medium">AI bertanya duluan</span>
                  <p className="text-muted-foreground text-xs mt-0.5">Tidak perlu menyiapkan pertanyaan. AI akan kritis berdasarkan konteks project Anda.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-primary">2</span>
                </div>
                <div>
                  <span className="font-medium">4 persona penanya</span>
                  <p className="text-muted-foreground text-xs mt-0.5">Dosen ketat, dosen ramah, audiens awam, atau audiens ahli, pilih sesuai kebutuhan.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-primary">3</span>
                </div>
                <div>
                  <span className="font-medium">Maksimal 10 pertanyaan</span>
                  <p className="text-muted-foreground text-xs mt-0.5">Simulasi otomatis berhenti setelah 10 pertanyaan untuk menjaga efisiensi biaya.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-primary">4</span>
                </div>
                <div>
                  <span className="font-medium">Laporan hasil</span>
                  <p className="text-muted-foreground text-xs mt-0.5">Di akhir sesi, AI memberikan laporan evaluasi dengan skor dan rekomendasi.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <Button onClick={() => setPhase("persona-select")}>
                <Sparkles className="w-4 h-4 mr-2" />
                Mulai Simulasi
              </Button>
              <Button variant="outline" onClick={() => setHistoryOpen(true)}>
                <History className="w-4 h-4 mr-2" />
                Lihat Riwayat
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {phase === "persona-select" && (
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Pilih Persona Penanya</h3>
              <p className="text-sm text-muted-foreground">
                Persona menentukan gaya dan tingkat kesulitan pertanyaan yang akan diajukan.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PERSONA_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersona(p.id)}
                  className={cn(
                    "text-left p-4 rounded-lg border-2 transition-all space-y-1.5",
                    selectedPersona === p.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{p.icon}</span>
                    <span className="font-medium text-sm">{p.label}</span>
                    {selectedPersona === p.id && (
                      <CheckCircle className="w-4 h-4 text-primary ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {p.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Model AI</label>
            <div className="flex items-center gap-3 flex-wrap">
              {tiersData?.tiers && tiersData.tiers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tiersData.tiers.map((tier) => (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTierId(tier.id!)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                        selectedTierId === tier.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                      )}
                    >
                      {tier.name}
                      {tier.isFree && (
                        <Badge
                          variant="secondary"
                          className="ml-1.5 text-[9px] px-1 py-0 bg-green-100 text-green-700 border-0"
                        >
                          FREE
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <Skeleton className="h-8 w-64" />
              )}
              {balanceData && (
                <span className="text-xs text-muted-foreground font-mono">
                  Saldo: {balanceData.balanceDisplay}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setPhase("intro")}>
              Kembali
            </Button>
            <Button
              onClick={handleStart}
              disabled={!selectedPersona || createSession.isPending}
            >
              {createSession.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memulai...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Mulai Simulasi
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {(phase === "active" || phase === "completed") && activeSession && (
        <Card className="flex flex-col h-[640px]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Simulasi</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {PERSONA_OPTIONS.find((p) => p.id === activeSession.persona)?.label ?? activeSession.persona}
              </Badge>
              {activeSession.status === "active" && (
                <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                  Aktif
                </Badge>
              )}
              {activeSession.status === "completed" && (
                <Badge variant="outline" className="text-xs border-muted-foreground/50">
                  Selesai
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {activeSession.questionsAsked}/10 pertanyaan
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="w-3.5 h-3.5" />
                <span className="font-mono">
                  {formatRupiah(runningCost)} terpakai
                </span>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setHistoryOpen(true)}
                  >
                    <History className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Riwayat sesi</TooltipContent>
              </Tooltip>

              {activeSession.status === "active" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleComplete}
                  disabled={completeSession.isPending}
                >
                  {completeSession.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5 mr-1" />
                  )}
                  Selesai
                </Button>
              )}

              {phase === "completed" && (
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleBackToIntro}>
                  Simulasi Lagi
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 p-5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <Loader2 className="w-8 h-8 text-muted-foreground/40 mb-3 animate-spin" />
                <p className="text-sm text-muted-foreground">Memuat percakapan...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : msg.role === "system"
                          ? "bg-muted text-muted-foreground italic text-xs w-full text-center rounded-lg border"
                          : "bg-secondary/90 text-secondary-foreground rounded-tl-sm border-l-[3px] border-l-primary/60 border border-border/50"
                      )}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      {msg.role !== "system" && (
                        <div
                          className={cn(
                            "text-[10px] mt-1.5 opacity-50",
                            msg.role === "user" ? "text-right" : ""
                          )}
                        >
                          {format(new Date(msg.createdAt), "h:mm a")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {sendMessage.isPending && (
                  <div className="flex justify-start">
                    <div className="max-w-[82%] rounded-2xl rounded-tl-sm px-4 py-3 bg-secondary/90 border-l-[3px] border-l-primary/60 border border-border/50 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" />
                      <span className="text-xs text-muted-foreground italic">AI sedang berpikir...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {phase === "active" && (
            <div className="p-4 border-t border-border">
              <form onSubmit={(e) => handleSend(e)} className="flex gap-3">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Ketik jawaban Anda di sini..."
                  className="flex-1 resize-none bg-background min-h-[44px]"
                  rows={1}
                  disabled={sendMessage.isPending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-[44px] w-[44px] flex-shrink-0"
                  disabled={!content.trim() || sendMessage.isPending}
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
              <p className="text-[10px] text-muted-foreground/60 mt-1.5 px-1">
                Tekan Enter untuk kirim, Shift+Enter untuk baris baru.
              </p>
            </div>
          )}
        </Card>
      )}

      {phase === "completed" && report && (
        <Card className="mt-4">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Laporan Evaluasi</h3>
              <p className="text-xs text-muted-foreground">
                Berdasarkan sesi simulasi {activeSession?.questionsAsked ?? 0} pertanyaan
              </p>
            </div>

            <div className="flex items-center gap-6 p-4 bg-muted/40 rounded-xl">
              <div className="text-center">
                <ScoreRing score={report.overallScore} />
                <p className="text-xs text-muted-foreground mt-0.5">/ 100</p>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="space-y-1.5 flex-1">
                <p className="text-sm font-medium leading-snug">{report.summary}</p>
              </div>
            </div>

            {report.scores && report.scores.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {report.scores.map((item, i) => (
                  <div key={i} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium truncate">{item.criterion}</span>
                      <ScoreRing score={item.score} />
                    </div>
                    {item.notes && (
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        {item.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {report.strengths && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  Kekuatan
                </h4>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
                  {report.strengths.split("\n").filter(Boolean).map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">+</span>
                      <span>{s.trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.weaknesses && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Area Perlu Ditingkatkan
                </h4>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
                  {report.weaknesses.split("\n").filter(Boolean).map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">-</span>
                      <span>{s.trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.recommendations && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <ChevronRight className="w-4 h-4" />
                  Rekomendasi
                </h4>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
                  {report.recommendations.split("\n").filter(Boolean).map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">{i + 1}.</span>
                      <span>{s.trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <SimulasiHistoryModal
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        projectId={projectId}
        onSelectSession={(session, msgs, simReport) => {
          setActiveSession(session);
          setMessages(msgs ?? []);
          setReport(simReport ?? null);
          setPhase(session.status === "completed" ? "completed" : "active");
        }}
      />

      <Dialog open={insufficientBalanceOpen} onOpenChange={setInsufficientBalanceOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Saldo Tidak Mencukupi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {insufficientBalanceData?.error ?? "Saldo Anda tidak mencukupi untuk simulasi ini."}
            </p>
            {insufficientBalanceData?.balanceCents != null && (
              <p className="text-xs text-muted-foreground">
                Saldo saat ini: {formatRupiah(insufficientBalanceData.balanceCents)}
              </p>
            )}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setInsufficientBalanceOpen(false)}>
                Tutup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { SimulasiHistoryModal } from "./simulasi-history-modal";
