import { useState, useEffect } from "react";
import { useParams, useSearch } from "wouter";
import { ArrowLeft, Send, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  useListQuizzes,
  useSubmitQuiz,
  type Quiz,
  type QuizQuestion,
  type QuizSubmission,
} from "@/lib/api-client-react";
import { cn } from "@/lib/utils";

function QuestionMCQ({
  question,
  selectedOption,
  onSelect,
  showAnswer,
}: {
  question: QuizQuestion;
  selectedOption: string;
  onSelect: (optionId: string) => void;
  showAnswer: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="font-medium">{question.text}</p>
      <div className="space-y-2">
        {(question.options ?? []).map((opt) => {
          const isSelected = selectedOption === opt.id;
          const isCorrect = opt.id === opt.id; // no correct answer exposed in schema
          return (
            <button
              key={opt.id}
              onClick={() => !showAnswer && onSelect(opt.id ?? "")}
              disabled={showAnswer}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg border transition-colors text-sm",
                isSelected && !showAnswer
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:bg-muted/50",
                showAnswer && isSelected && "border-primary bg-primary/5"
              )}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuestionShortAnswer({
  question,
  value,
  onChange,
  showAnswer,
}: {
  question: QuizQuestion;
  value: string;
  onChange: (v: string) => void;
  showAnswer: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="font-medium">{question.text}</p>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ketik jawaban singkat Anda..."
        disabled={showAnswer}
        className="resize-none text-sm"
        rows={3}
      />
    </div>
  );
}

function QuestionEssay({
  question,
  value,
  onChange,
  showAnswer,
}: {
  question: QuizQuestion;
  value: string;
  onChange: (v: string) => void;
  showAnswer: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="font-medium">{question.text}</p>
        <Badge variant="outline" className="text-xs">
          {question.points} poin
        </Badge>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ketik jawaban esai Anda..."
        disabled={showAnswer}
        className="resize-none text-sm"
        rows={6}
      />
    </div>
  );
}

export default function PracticeQuiz() {
  const params = useParams<{ quizId: string }>();
  const [search] = useSearch();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const quizId = Number(params.quizId);
  const projectId = new URLSearchParams(search).get("projectId");
  const projectIdNum = projectId ? Number(projectId) : 0;

  const quizzesQuery = useListQuizzes(projectIdNum);
  const submitMutation = useSubmitQuiz();

  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submission, setSubmission] = useState<QuizSubmission | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Find selected quiz from list
  useEffect(() => {
    if (!quizId || !quizzesQuery.data) return;
    const found = (quizzesQuery.data as Quiz[]).find((q) => q.id === quizId);
    if (found) setSelectedQuiz(found);
  }, [quizId, quizzesQuery.data]);

  const questions: QuizQuestion[] = (selectedQuiz?.questions as QuizQuestion[]) ?? [];
  const currentQ = questions[currentIndex];
  const currentAnswer = currentQ ? (answers[currentQ.id] ?? "") : "";

  const handleSelectOption = (optionId: string) => {
    if (!currentQ) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: optionId }));
  };

  const handleTextChange = (value: string) => {
    if (!currentQ) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedQuiz) return;
    setSubmitting(true);

    const responses = questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] ?? "",
    }));

    try {
      const result = await submitMutation.mutateAsync({
        quizId: selectedQuiz.id,
        data: { responses },
      });
      setSubmission(result as QuizSubmission);
      setSubmitted(true);
      toast({ title: "Kuis disubmit!", description: "Jawaban Anda sudah disimpan." });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Gagal submit",
        description: String((err as Error).message ?? err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const allAnswered = questions.every((q) => answers[q.id]?.trim());

  // Loading state
  if (!selectedQuiz && quizzesQuery.isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!selectedQuiz) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/practice")}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Kembali ke Practice
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Kuis tidak ditemukan.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/practice")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold truncate">{selectedQuiz.title}</h1>
          <p className="text-xs text-muted-foreground">
            {(selectedQuiz.metadata && typeof selectedQuiz.metadata === "object" && "topic" in (selectedQuiz.metadata as object))
              ? String((selectedQuiz.metadata as { topic: string }).topic)
              : ""}
          </p>
        </div>
        {!submitted && (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !allAnswered}
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 mr-1" />
                Submit Kuis
              </>
            )}
          </Button>
        )}
        {submitted && (
          <Button variant="outline" size="sm" onClick={() => navigate("/practice")}>
            Kembali ke Practice
          </Button>
        )}
      </div>

      {/* Progress */}
      {!submitted && questions.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Pertanyaan {currentIndex + 1} dari {questions.length}</span>
            <span>{Object.keys(answers).filter((k) => answers[k].trim()).length}/{questions.length} dijawab</span>
          </div>
          <div className="flex gap-1">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-colors",
                  i === currentIndex
                    ? "bg-primary"
                    : answers[q.id]?.trim()
                    ? "bg-primary/50"
                    : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Submitted: show summary */}
      {submitted && submission && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h2 className="font-semibold">Kuis Disubmit!</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Jawaban Anda sudah disimpan. {questions.length} soal telah dijawab.
            </p>
            {submission.score != null && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Skor</p>
                <p className="text-2xl font-bold">
                  {submission.score}{" "}
                  <span className="text-base text-muted-foreground">
                    / {submission.maxScore ?? questions.reduce((s, q) => s + (q.points ?? 0), 0)}
                  </span>
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Note: Grading otomatis untuk pilihan ganda. Essay dan short answer memerlukan grading manual.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSubmitted(false);
                  setSubmission(null);
                  setCurrentIndex(0);
                  setAnswers({});
                }}
              >
                Coba Lagi
              </Button>
              <Button size="sm" onClick={() => navigate("/practice")}>
                Kembali ke Practice
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question card */}
      {!submitted && currentQ && (
        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Question type badge */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {currentQ.type === "multiple_choice"
                  ? "Pilihan Ganda"
                  : currentQ.type === "short_answer"
                  ? "Jawaban Singkat"
                  : "Essay"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {currentQ.points} poin
              </span>
            </div>

            {/* Question content */}
            {currentQ.type === "multiple_choice" ? (
              <QuestionMCQ
                question={currentQ}
                selectedOption={currentAnswer}
                onSelect={handleSelectOption}
                showAnswer={false}
              />
            ) : currentQ.type === "short_answer" ? (
              <QuestionShortAnswer
                question={currentQ}
                value={currentAnswer}
                onChange={handleTextChange}
                showAnswer={false}
              />
            ) : (
              <QuestionEssay
                question={currentQ}
                value={currentAnswer}
                onChange={handleTextChange}
                showAnswer={false}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      {!submitted && questions.length > 1 && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            ← Sebelumnya
          </Button>
          {currentIndex < questions.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
            >
              Selanjutnya →
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || !allAnswered}
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 mr-1" />
              )}
              Submit Kuis
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
