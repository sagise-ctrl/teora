import { useState, useEffect } from "react";
import { Loader2, Sparkles, FileQuestion, X, Plus, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useListProjects,
  useListQuizzes,
  useGenerateQuiz,
} from "@/lib/api-client-react";
import type {
  PracticeRecommendation,
  Quiz,
  GenerateQuizRequestDifficulty,
} from "@/lib/api-client-react/generated/api.schemas";

interface PracticeQuizPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendation: PracticeRecommendation | null;
  onNavigate: (quizId: number, projectId: number) => void;
}

const DIFFICULTY_OPTIONS: { value: GenerateQuizRequestDifficulty; label: string }[] = [
  { value: "easy", label: "Mudah" },
  { value: "medium", label: "Sedang" },
  { value: "hard", label: "Sulit" },
];

export function PracticeQuizPicker({
  open,
  onOpenChange,
  recommendation,
  onNavigate,
}: PracticeQuizPickerProps) {
  const { toast } = useToast();

  // Step 1: select project
  const projectsQuery = useListProjects({});
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Step 2: quizzes for selected project — only call when a project is selected
  const quizzesQuery = useListQuizzes(
    selectedProjectId ?? 0,
    { query: { enabled: selectedProjectId !== null && selectedProjectId > 0 } }
  );
  const generateQuiz = useGenerateQuiz();

  // Step 3: generate form
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateTitle, setGenerateTitle] = useState("");
  const [generateDifficulty, setGenerateDifficulty] =
    useState<GenerateQuizRequestDifficulty>("medium");

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      setSelectedProjectId(null);
      setShowGenerate(false);
      setGenerateTitle("");
      setGenerateDifficulty("medium");
    } else if (recommendation?.learningActivity.sourceProjectId) {
      setSelectedProjectId(recommendation.learningActivity.sourceProjectId);
      // Pre-fill title from recommendation topic
      const topic = recommendation.learningActivity.topics[0] ?? "";
      setGenerateTitle(`Kuis: ${topic}`);
    }
  }, [open, recommendation]);

  const handleGenerate = () => {
    if (!selectedProjectId || !generateTitle.trim()) return;

    generateQuiz.mutate(
      {
        projectId: selectedProjectId!,
        data: {
          title: generateTitle.trim(),
          topic: recommendation?.learningActivity.topics[0] ?? generateTitle.trim(),
          count: 10,
          questionTypes: ["multiple_choice", "short_answer"],
          difficulty: generateDifficulty,
        },
      },
      {
        onSuccess: (quiz) => {
          const quizData = quiz as unknown as Quiz;
          setShowGenerate(false);
          toast({ title: "Kuis dibuat!", description: `${quizData.questions?.length ?? 0} soal` });
          onNavigate(quizData.id, selectedProjectId);
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Gagal membuat kuis",
            description: String((err as Error).message ?? err),
          });
        },
      }
    );
  };

  const handleSelectQuiz = (quiz: Quiz) => {
    onNavigate(quiz.id, selectedProjectId!);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-primary" />
            {recommendation?.type === "recent_task"
              ? "Kuis dari Tugas Terbaru"
              : recommendation?.type === "frequent_topic"
              ? "Kuis dari Topik Sering Muncul"
              : "Kuis untuk Anda"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {/* Recommendation context */}
          {recommendation && (
            <div className="p-3 bg-muted/50 rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1.5">{recommendation.reason}</p>
              <div className="flex flex-wrap gap-1">
                {recommendation.learningActivity.topics.slice(0, 4).map((t: string) => (
                  <Badge key={t} variant="outline" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Pick project */}
          {!selectedProjectId ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Pilih proyek:</p>
              {projectsQuery.isLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {(projectsQuery.data ?? []).map((p: { id: number; title: string }) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProjectId(p.id)}
                      className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.title}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                  {projectsQuery.data?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Tidak ada proyek.{" "}
                      <a href="/projects/new?type=general" className="underline text-primary">
                        Buat proyek baru
                      </a>
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Selected project breadcrumb */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setSelectedProjectId(null); setShowGenerate(false); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Ganti proyek
                </button>
                <span className="text-xs text-muted-foreground">/</span>
                <span className="text-xs font-medium truncate">
                  {(projectsQuery.data as { id: number; title: string }[] | undefined)
                    ?.find((p) => p.id === selectedProjectId)
                    ?.title ?? `Proyek #${selectedProjectId}`}
                </span>
              </div>

              {/* Step 2: Quizzes list */}
              {!showGenerate && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Kuis di proyek ini:</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowGenerate(true)}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Generate AI
                    </Button>
                  </div>

                  {quizzesQuery.isLoading ? (
                    <div className="space-y-2">
                      {[0, 1].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : quizzesQuery.data && quizzesQuery.data.length > 0 ? (
                    <div className="space-y-1.5">
                      {(quizzesQuery.data as Quiz[]).map((quiz) => (
                        <button
                          key={quiz.id}
                          onClick={() => handleSelectQuiz(quiz)}
                          className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/40 transition-colors text-left"
                        >
                          <FileQuestion className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{quiz.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {quiz.questions?.length ?? 0} soal
                              {quiz.metadata &&
                                typeof quiz.metadata === "object" &&
                                "difficulty" in (quiz.metadata as object) && (
                                  <> · {(quiz.metadata as { difficulty: string }).difficulty}</>
                                )}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-4 text-center">
                        <FileQuestion className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground mb-3">
                          Belum ada kuis di proyek ini.
                        </p>
                        <Button size="sm" onClick={() => setShowGenerate(true)}>
                          <Sparkles className="w-3.5 h-3.5 mr-1" />
                          Generate Kuis AI
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Step 3: Generate quiz form */}
              {showGenerate && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Generate Kuis Baru</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Judul Kuis</label>
                      <Textarea
                        value={generateTitle}
                        onChange={(e) => setGenerateTitle(e.target.value)}
                        placeholder="Contoh: Kuis Statistik Inferensial"
                        className="resize-none text-sm"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Tingkat Kesulitan
                      </label>
                      <div className="flex gap-2">
                        {DIFFICULTY_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setGenerateDifficulty(opt.value)}
                            className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                              generateDifficulty === opt.value
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:bg-muted/50"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowGenerate(false)}
                      disabled={generateQuiz.isPending}
                    >
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleGenerate}
                      disabled={generateQuiz.isPending || !generateTitle.trim()}
                      className="flex-1"
                    >
                      {generateQuiz.isPending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 mr-1" />
                          Generate Kuis
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Close */}
        <div className="flex justify-end pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="w-3.5 h-3.5 mr-1" />
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
