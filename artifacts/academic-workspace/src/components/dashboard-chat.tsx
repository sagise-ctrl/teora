import { useState, useEffect, useRef, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Send, Loader2, MessageSquare, Trash2, Bot, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  useListMessages,
  useSendMessage,
  useCreateProject,
  useDeleteProject,
  useGetAITiers,
  useGetMyBalance,
} from "@/lib/api-client-react";
import { TierSelector } from "@/components/tier-selector";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useInsufficientBalanceDialog } from "@/hooks/use-insufficient-balance-dialog";

interface DashboardChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Per-user scratchpad project ID stored in localStorage.
 * DECISION 023: reuses project-scoped sendMessage API instead of building a new global chat endpoint.
 */
function scratchpadKey(userId: string): string {
  return `dashboardChat.projectId.${userId}`;
}

const SUGGESTED_PROMPTS = [
  "Jelaskan konsep fotosintesis singkat",
  "Bantu bikin outline karya ilmiah",
  "Cara menulis sitasi APA yang benar",
  "Bedakan metode kualitatif dan kuantitatif",
];

export function DashboardChat({ open, onOpenChange }: DashboardChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const insufficient = useInsufficientBalanceDialog();

  const [projectId, setProjectId] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const sendMessage = useSendMessage();
  const { data: messages, isLoading: messagesLoading } = useListMessages(projectId ?? 0, {
    query: {
      queryKey: [`/api/projects/${projectId}/messages`, projectId],
      enabled: !!projectId,
      refetchInterval: 3000,
    },
  });
  const { data: tiersData } = useGetAITiers();
  const { data: balanceData } = useGetMyBalance();

  // Load scratchpad project ID from localStorage on mount / user change
  useEffect(() => {
    if (!user?.id || !open) return;
    const stored = localStorage.getItem(scratchpadKey(user.id));
    if (stored) {
      const parsed = Number(stored);
      if (!Number.isNaN(parsed) && parsed > 0) {
        setProjectId(parsed);
      }
    }
  }, [user?.id, open]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sendMessage.isPending]);

  // Auto-select preferred tier on first load (mirrors TierSelector internal logic but stateful here)
  useEffect(() => {
    if (selectedTierId || !tiersData?.tiers?.length) return;
    const preferred = tiersData.tiers.find((t) => t.id === balanceData?.preferredTierId);
    const fallback = preferred ?? tiersData.tiers[0];
    if (fallback?.id) setSelectedTierId(fallback.id);
  }, [tiersData, balanceData?.preferredTierId, selectedTierId]);

  const ensureProject = async (): Promise<number | null> => {
    if (projectId) return projectId;
    if (!user?.id) return null;
    try {
      const created = await createProject.mutateAsync({
        data: {
          title: "Dashboard Chat",
          taskType: "dashboard_chat",
          instructionText: "Scratchpad chat dari Dashboard Teora Assistant. Pesan di sini dipakai untuk percakapan AI umum.",
        } as any,
      });
      const id = (created as any).id;
      if (typeof id === "number") {
        localStorage.setItem(scratchpadKey(user.id), String(id));
        setProjectId(id);
        return id;
      }
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({
        title: "Gagal membuka chat",
        description: msg || "Tidak dapat membuat scratchpad project",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleSend = async () => {
    const text = content.trim();
    if (!text || sendMessage.isPending) return;

    const pid = await ensureProject();
    if (!pid) return;

    // Optimistic clear: input hilang SEGERA saat Enter (UX standar chat).
    // Restore di onError kalau gagal.
    const previousContent = content;
    setContent("");

    sendMessage.mutate(
      {
        projectId: pid,
        data: {
          content: text,
          mode: "generate",
          tier: selectedTierId || undefined,
        },
      },
      {
        onError: (err) => {
          if (!insufficient.handleError(err)) {
            const msg = err instanceof Error ? err.message : String(err);
            toast({
              title: "Gagal mengirim pesan",
              description: msg,
              variant: "destructive",
            });
            setContent(previousContent);
          }
        },
      }
    );
  };

  const handleClear = async () => {
    if (!user?.id) return;
    if (projectId) {
      try {
        await deleteProject.mutateAsync({ projectId });
      } catch {
        // ignore — we'll still clear local state
      }
    }
    localStorage.removeItem(scratchpadKey(user.id));
    setProjectId(null);
    setContent("");
    toast({
      title: "Riwayat chat dihapus",
      description: "Percakapan baru akan disimpan di scratchpad baru.",
    });
  };

  const handlePromptClick = (prompt: string) => {
    setContent(prompt);
  };

  const messageList = useMemo(() => (Array.isArray(messages) ? messages : []), [messages]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl p-0 flex flex-col gap-0"
        >
          <SheetHeader className="px-5 py-4 border-b border-border bg-gradient-to-br from-[#2D79FF]/5 to-[#8E54E9]/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D79FF] to-[#8E54E9] flex items-center justify-center shadow-md shadow-[#2D79FF]/20 shrink-0">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#2D79FF]" />
                  Teora Assistant
                </SheetTitle>
                <SheetDescription>
                  Tanya apa saja tentang tugas, referensi, atau penulisan akademik
                </SheetDescription>
              </div>
              {projectId && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClear}
                  disabled={deleteProject.isPending}
                  title="Hapus riwayat chat"
                  className="shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </SheetHeader>

          {/* Messages area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          >
            {messagesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="h-16 w-2/3 ml-auto" />
                <Skeleton className="h-16 w-3/4" />
              </div>
            ) : messageList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2D79FF]/10 to-[#8E54E9]/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-[#2D79FF]" />
                </div>
                <h3 className="font-semibold text-base mb-1">Mulai percakapan</h3>
                <p className="text-sm text-muted-foreground mb-5 max-w-xs">
                  Tanyakan apa saja — Teora akan menjawab dengan model AI yang
                  kamu pilih di bawah.
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <Badge
                      key={prompt}
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80 text-xs font-normal py-1.5 px-3"
                      onClick={() => handlePromptClick(prompt)}
                    >
                      {prompt}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              messageList.map((msg: any) => {
                const isUser = msg.role === "user";
                const isSystem = msg.role === "system";
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-2.5",
                      isUser ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isUser && !isSystem && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2D79FF] to-[#8E54E9] flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                        isUser
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : isSystem
                          ? "bg-muted text-muted-foreground italic w-full text-center rounded-lg shadow-none border"
                          : "bg-secondary/80 text-secondary-foreground rounded-tl-sm border border-border/50"
                      )}
                    >
                      <div className="whitespace-pre-wrap font-serif">
                        {msg.content}
                      </div>
                      <div
                        className={cn(
                          "text-[10px] mt-1.5 opacity-60",
                          isUser ? "text-right" : "text-left"
                        )}
                      >
                        {format(new Date(msg.createdAt), "h:mm a")}
                      </div>
                    </div>
                    {isUser && (
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
            {sendMessage.isPending && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2D79FF] to-[#8E54E9] flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 bg-secondary/80 border border-border/50 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" />
                  <span className="text-xs text-muted-foreground italic">
                    Thinking...
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-border bg-card px-5 py-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <TierSelector
                value={selectedTierId}
                onChange={setSelectedTierId}
                compact
              />
              {balanceData && (
                <span className="text-xs text-muted-foreground font-mono">
                  {balanceData.balanceDisplay}
                </span>
              )}
            </div>
            <div className="flex items-end gap-2">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tanya Teora..."
                className="resize-none min-h-[44px] max-h-32 text-sm"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                onClick={handleSend}
                disabled={!content.trim() || sendMessage.isPending || createProject.isPending}
                size="icon"
                className="shrink-0 bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] hover:opacity-90"
              >
                {sendMessage.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Teora bisa keliru. Verifikasi informasi penting dari sumber lain.
            </p>
          </div>
        </SheetContent>
      </Sheet>
      <insufficient.InsufficientBalanceDialog {...insufficient.dialogProps} />
    </>
  );
}
