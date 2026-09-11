import { useEffect, useState, useRef } from "react";
import { useParams } from "wouter";
import { Sparkles, Send, Loader2, Zap, CheckCircle, ChevronRight, X, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useListSimulationMessages,
  useSendSimulationMessage,
  useCompleteSimulationSession,
  useGetLatestSimulationReport,
  type SimulationSession,
  type SimulationMessage,
  type SimulationReport,
} from "@/lib/api-client-react";
import type { ListSimulationMessages200 } from "@/lib/api-client-react/generated/api.schemas";
import { parseInsufficientBalance } from "@/components/parse-insufficient-balance";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PERSONA_LABELS: Record<string, string> = {
  dosen_strict: "Dosen Ketat",
  dosen_friendly: "Dosen Ramah",
  audience_awam: "Audiens Awam",
  audience_expert: "Audiens Ahli",
};

function formatRupiah(cents: number): string {
  if (cents === 0) return "Rp 0";
  return `Rp ${(cents / 100).toLocaleString("id-ID", { minimumFractionDigits: 0 })}`;
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600";
  return <span className={cn("font-bold text-lg", color)}>{score}</span>;
}

export default function SimulasiSession() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = Number(params.sessionId);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [session, setSession] = useState<SimulationSession | null>(null);
  const [messages, setMessages] = useState<SimulationMessage[]>([]);
  const [report, setReport] = useState<SimulationReport | null>(null);
  const [content, setContent] = useState("");
  const [insufficientBalanceOpen, setInsufficientBalanceOpen] = useState(false);
  const [insufficientBalanceData, setInsufficientBalanceData] = useState<{
    error: string;
    balanceCents?: number;
  } | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const projectId = session?.projectId ?? 0;

  const messagesQuery = useListSimulationMessages(projectId, sessionId);
  const reportQuery = useGetLatestSimulationReport(projectId);
  const sendMessage = useSendSimulationMessage();
  const completeSession = useCompleteSimulationSession();

  useEffect(() => {
    if (!sessionId) return;
    messagesQuery.refetch().then((result) => {
      if (result.data) {
        const data = result.data as ListSimulationMessages200;
        setSession(data as SimulationSession);
        setMessages(data.messages ?? []);
      }
      setLoadingSession(false);
    });
  }, [sessionId]);

  useEffect(() => {
    if (messagesQuery.data) {
      const data = messagesQuery.data as ListSimulationMessages200;
      setMessages(data.messages ?? []);
    }
  }, [messagesQuery.data]);

  useEffect(() => {
    if (reportQuery.data) {
      setReport(reportQuery.data);
    }
  }, [reportQuery.data]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!content.trim() || sendMessage.isPending || !session) return;
    const messageContent = content;
    setContent("");

    sendMessage.mutate(
      { projectId, sessionId, data: { content: messageContent } },
      {
        onSuccess: (result) => {
          const resultAny = result as SimulationSession & { messages?: SimulationMessage[]; report?: SimulationReport };
          if (resultAny.messages) setMessages(resultAny.messages);
          if (resultAny.report) {
            setReport(resultAny.report);
          }
        },
        onError: (err) => {
          const insufficient = parseInsufficientBalance(err);
          if (insufficient) {
            setInsufficientBalanceData({ ...insufficient, error: insufficient.error ?? "Saldo tidak mencukupi." });
            setInsufficientBalanceOpen(true);
            return;
          }
          toast({ variant: "destructive", title: "Gagal mengirim", description: String((err as Error).message ?? err) });
          setContent(messageContent);
        },
      }
    );
  };

  const handleComplete = async () => {
    if (!session) return;
    try {
      const result = await completeSession.mutateAsync({ projectId, sessionId });
      setSession(result as SimulationSession);
      if (result.report) setReport(result.report);
    } catch (err) {
      toast({ variant: "destructive", title: "Gagal menyelesaikan", description: String((err as Error).message ?? err) });
    }
  };

  const personaLabel = session?.persona ? PERSONA_LABELS[session.persona] ?? session.persona : "—";
  const isActive = session?.status === "active";

  if (loadingSession) {
    return (
      <div className="max-w-2xl mx-auto p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Simulasi Presentasi</h1>
          {session && (
            <p className="text-sm text-muted-foreground">{personaLabel} · {session.questionsAsked ?? 0}/10 pertanyaan</p>
          )}
        </div>
        {session && (
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="w-3.5 h-3.5" />
              <span className="font-mono">{formatRupiah(session.totalCostCents ?? 0)}</span>
            </div>
            {isActive && (
              <Button variant="outline" size="sm" onClick={handleComplete} disabled={completeSession.isPending}>
                <X className="w-3.5 h-3.5 mr-1" />
                Selesai
              </Button>
            )}
          </div>
        )}
      </div>

      <Card className="flex flex-col h-[500px]">
        <ScrollArea className="flex-1 p-5" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-muted-foreground/40 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
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
                      <div className={cn("text-[10px] mt-1.5 opacity-50", msg.role === "user" ? "text-right" : "")}>
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

        {isActive && (
          <div className="p-4 border-t border-border">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-3">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Ketik jawaban Anda..."
                className="flex-1 resize-none min-h-[44px]"
                rows={1}
                disabled={sendMessage.isPending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button type="submit" size="icon" className="h-[44px] w-[44px] flex-shrink-0" disabled={!content.trim() || sendMessage.isPending}>
                {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        )}
      </Card>

      {report && (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Laporan Evaluasi</h3>
              <p className="text-xs text-muted-foreground">
                Berdasarkan {session?.questionsAsked ?? 0} pertanyaan
              </p>
            </div>

            <div className="flex items-center gap-6 p-4 bg-muted/40 rounded-xl">
              <div className="text-center">
                <ScoreRing score={report.overallScore} />
                <p className="text-xs text-muted-foreground mt-0.5">/ 100</p>
              </div>
              <div className="h-12 w-px bg-border" />
              <p className="text-sm font-medium leading-snug flex-1">{report.summary}</p>
            </div>

            {report.scores && report.scores.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {report.scores.map((item, i) => (
                  <div key={i} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium truncate">{item.criterion}</span>
                      <ScoreRing score={item.score} />
                    </div>
                    {item.notes && <p className="text-[10px] text-muted-foreground">{item.notes}</p>}
                  </div>
                ))}
              </div>
            )}

            {report.strengths && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-green-700 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Kekuatan
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
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
                <h4 className="text-sm font-semibold text-amber-700 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Area Perlu Ditingkatkan
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
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
                  <ChevronRight className="w-4 h-4" /> Rekomendasi
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
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

      {insufficientBalanceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="max-w-sm w-full mx-4">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold">Saldo Tidak Mencukupi</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {insufficientBalanceData?.error ?? "Saldo Anda tidak mencukupi."}
              </p>
              {insufficientBalanceData?.balanceCents != null && (
                <p className="text-xs text-muted-foreground">
                  Saldo: {formatRupiah(insufficientBalanceData.balanceCents)}
                </p>
              )}
              <Button variant="outline" className="w-full" onClick={() => setInsufficientBalanceOpen(false)}>
                Tutup
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
