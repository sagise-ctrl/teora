import { useState, useRef, useEffect } from "react"
import { useParams, Link } from "wouter"
import {
  useGetProject,
  useGetLatestDocument,
  useListMessages,
  useSendMessage,
  useListReferences,
  useCreateReference,
  useDeleteReference,
  useRegenerateBibliography,
  useListAttachments,
  useUploadAttachment,
  useDeleteAttachment,
  useListDocuments,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
  useGetDocument,
  useListActivities,
  useListJobs,
  useAnalyzeProject,
  useRegenerateOutline,
  useGenerateDocument,
  useGetProjectMetadata,
  useUpdateProject,
  useFetchReferenceMetadata,
  useListShareLinks,
  useCreateShareLink,
  useDeleteShareLink,
  useListQuizzes,
  useGenerateQuiz,
  useGetQuiz,
  useSubmitQuiz,
  useListComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useGetRubric,
  useSearchReferences,
  getListQuizzesQueryKey,
  getGetQuizQueryKey,
  getGetLatestDocumentQueryKey,
  getListMessagesQueryKey,
  getListReferencesQueryKey,
  getListAttachmentsQueryKey,
  getListDocumentsQueryKey,
  getListActivitiesQueryKey,
  getGetProjectQueryKey,
  getListJobsQueryKey,
  getListShareLinksQueryKey,
  getSearchReferencesQueryKey,
  type ChatMode,
  type DocumentWithVersions,
  type Quiz,
  type QuizQuestion,
  type QuizQuestionType,
  type Comment,
  type QuizSubmission,
  type Rubric,
  type CrossRefSearchResult,
} from "../lib/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { 
  ArrowLeft,
  MessageSquare,
  FileText,
  BookMarked,
  BookOpen,
  Paperclip,
  History,
  ActivitySquare,
  Send,
  Loader2,
  Trash2,
  Plus,
  RefreshCw,
  Upload,
  File,
  Eye,
  CheckCircle2,
  AlertCircle,
  Share2,
  Link as LinkIcon,
  Copy,
  Clock,
  Loader,
  MoreHorizontal,
  Pencil,
  FilePlus,
  ChevronDown,
  ListChecks,
  MessageCircle,
  Sparkles,
  Circle,
  CheckCircle,
  CircleDot,
  XCircle,
  CheckCheck,
  Search,
  ExternalLink,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyIllustrationBook,
  EmptyIllustrationAttachment,
  EmptyIllustrationChat,
  EmptyIllustrationQuiz,
} from "@/components/ui/empty"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// ── Document Bar ────────────────────────────────────────────────────────────────

function DocumentBar({
  projectId,
  documents,
  selectedDocId,
  isLoading,
  onSelect,
  onRefresh,
}: {
  projectId: number
  documents: DocumentWithVersions[]
  selectedDocId: number | null
  isLoading: boolean
  onSelect: (id: number) => void
  onRefresh: () => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const createDoc = useCreateDocument()
  const updateDoc = useUpdateDocument()
  const deleteDoc = useDeleteDocument()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState("")

  const handleCreate = () => {
    if (!newTitle.trim()) return
    createDoc.mutate(
      { projectId, data: { title: newTitle.trim() } },
      {
        onSuccess: (doc) => {
          toast({ title: "Document created", description: doc.title })
          setNewTitle("")
          setShowCreate(false)
          onSelect(doc.id)
          onRefresh()
        },
        onError: (err) => toast({ title: "Failed to create", description: String(err), variant: "destructive" }),
      }
    )
  }

  const handleRename = (doc: DocumentWithVersions) => {
    if (!editTitle.trim() || editTitle === doc.title) {
      setEditingId(null)
      return
    }
    updateDoc.mutate(
      { projectId, documentId: doc.id, data: { title: editTitle.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Renamed", description: editTitle.trim() })
          setEditingId(null)
          onRefresh()
        },
        onError: (err) => toast({ title: "Failed to rename", description: String(err), variant: "destructive" }),
      }
    )
  }

  const handleDelete = (doc: DocumentWithVersions) => {
    if (!confirm(`Delete "${doc.title}" and all its versions?`)) return
    deleteDoc.mutate(
      { projectId, documentId: doc.id },
      {
        onSuccess: () => {
          toast({ title: "Deleted", description: doc.title })
          if (selectedDocId === doc.id) {
            const remaining = documents.filter(d => d.id !== doc.id)
            onSelect(remaining[0]?.id ?? null)
          }
          onRefresh()
        },
        onError: (err) => toast({ title: "Failed to delete", description: String(err), variant: "destructive" }),
      }
    )
  }

  const handleSetActive = (doc: DocumentWithVersions) => {
    updateDoc.mutate(
      { projectId, documentId: doc.id, data: { isActive: true } },
      {
        onSuccess: () => {
          toast({ title: "Set as active", description: doc.title })
          onSelect(doc.id)
          onRefresh()
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="flex gap-2 py-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-20" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center gap-1 shrink-0">
            {editingId === doc.id ? (
              <div className="flex items-center gap-1 bg-card border border-primary rounded-md px-2 py-1">
                <Input
                  autoFocus
                  className="h-7 w-40 text-sm"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleRename(doc)
                    if (e.key === "Escape") setEditingId(null)
                  }}
                />
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleRename(doc)}>
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingId(null)}>
                  <AlertCircle className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <DropdownMenu>
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md border cursor-pointer transition-colors text-sm font-medium",
                    selectedDocId === doc.id
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-card border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => onSelect(doc.id)}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[140px]">{doc.title}</span>
                  {doc.isActive && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 shrink-0">active</Badge>
                  )}
                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                    <button className="hover:bg-muted rounded p-0.5">
                      <MoreHorizontal className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                </div>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => { setEditingId(doc.id); setEditTitle(doc.title) }}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  {!doc.isActive && (
                    <DropdownMenuItem onClick={() => handleSetActive(doc)}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Set as Active
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleDelete(doc)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}

        {showCreate ? (
          <div className="flex items-center gap-1 shrink-0">
            <Input
              autoFocus
              placeholder="Document name..."
              className="h-9 w-44 text-sm"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleCreate()
                if (e.key === "Escape") { setShowCreate(false); setNewTitle("") }
              }}
            />
            <Button size="sm" variant="ghost" className="h-9" onClick={handleCreate} disabled={createDoc.isPending}>
              <CheckCircle2 className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-9" onClick={() => { setShowCreate(false); setNewTitle("") }}>
              <AlertCircle className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 h-9 gap-1.5 text-muted-foreground"
            onClick={() => setShowCreate(true)}
          >
            <FilePlus className="w-4 h-4" />
            New Document
          </Button>
        )}
      </div>
    </div>
  )
}

export default function ProjectWorkspace() {
  const { id } = useParams()
  const projectId = Number(id)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [selectedDocId, setSelectedDocId] = useState<number | null>(null)

  const { data: project, isLoading: projectLoading } = useGetProject(projectId)
  const { data: documents, isLoading: docsLoading } = useListDocuments(projectId)
  const { data: selectedDoc } = useGetDocument(projectId, selectedDocId ?? 0)
  const { data: latestDoc } = useGetLatestDocument(projectId)
  const { data: jobs } = useListJobs(projectId, { query: { queryKey: getListJobsQueryKey(projectId), refetchInterval: 5000 } })

  // Set default selected document
  useEffect(() => {
    if (documents && documents.length > 0 && selectedDocId === null) {
      const active = documents.find(d => d.isActive) ?? documents[0]
      setSelectedDocId(active.id)
    }
  }, [documents, selectedDocId])

  const analyzeProject = useAnalyzeProject()

  const isWorking = jobs?.some(j => j.status === "running" || j.status === "pending")
  const activeJob = jobs?.find(j => j.status === "running" || j.status === "pending")

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (!project) return <div>Project not found</div>

  const handleAnalyze = () => {
    analyzeProject.mutate({ projectId }, {
      onSuccess: () => {
        toast({ title: "Analysis started", description: "The AI is now analyzing your project requirements." })
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) })
      },
      onError: (err) => {
        toast({ title: "Failed to start", description: String(err), variant: "destructive" })
      }
    })
  }

  const updateProject = useUpdateProject()
  const handleToggleAiDisclosure = () => {
    updateProject.mutate({
      projectId,
      data: { aiDisclosure: !project.aiDisclosure },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) })
        toast({
          title: project.aiDisclosure ? "AI disclosure dimatikan" : "AI disclosure diaktifkan",
          description: project.aiDisclosure
            ? "Label AI-assisted tidak akan muncul di dokumen dan chat."
            : "Label AI-assisted akan muncul di dokumen dan chat.",
        })
      },
      onError: () => toast({ title: "Gagal mengubah setting", variant: "destructive" })
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-border pb-6">
        <div>
          <Link href="/">
            <div className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors mb-3">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif font-bold text-foreground tracking-tight">{project.title}</h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              {project.status.replace("_", " ")}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Switch
              id="ai-disclosure"
              checked={project.aiDisclosure !== false}
              onCheckedChange={handleToggleAiDisclosure}
              disabled={updateProject.isPending}
            />
            <label htmlFor="ai-disclosure" className="text-xs text-muted-foreground cursor-pointer select-none">
              Label AI-assisted: {project.aiDisclosure !== false ? "Aktif" : "Nonaktif"}
            </label>
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
                  aria-label="Penjelasan label AI-assisted"
                >
                  apa ini?
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Tentang Label AI-assisted</DialogTitle>
                  <DialogDescription>
                    Pilihan apakah akan menampilkan label "AI-assisted" di dokumen dan chat.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-sm text-foreground">
                  <div>
                    <p className="font-medium text-foreground mb-1">Kalau diaktifkan (default):</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>Badge "AI-assisted" muncul di pesan chat dari AI</li>
                      <li>Footer peringatan muncul di preview dokumen</li>
                      <li>Peringatan muncul saat lihat versi lama dokumen</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">Kalau dinonaktifkan:</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>Semua label AI-assisted disembunyikan</li>
                      <li>Dokumen dan chat tampil apa adanya</li>
                      <li>Berguna bila Anda sudah menyunting sampai tidak terasa hasil AI</li>
                    </ul>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    Catatan: pilihan ini hanya mengatur label tampilan di Teora. Bila Anda menyalin teks ke Word atau dokumen lain, label tidak ikut serta.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-muted-foreground mt-2 max-w-2xl">{project.subject} &bull; {project.taskType || "General Assignment"}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <ShareButton projectId={projectId} />
          {isWorking ? (
            <Badge variant="secondary" className="px-4 py-1.5 flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin text-primary" />
              <span className="font-medium">{activeJob?.jobType.replace("_", " ") || "Working"}...</span>
            </Badge>
          ) : project.status === "draft" ? (
            <Button onClick={handleAnalyze} disabled={analyzeProject.isPending}>
              {analyzeProject.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ActivitySquare className="w-4 h-4 mr-2" />}
              Begin Analysis
            </Button>
          ) : null}
        </div>
      </div>

      <DocumentBar
        projectId={projectId}
        documents={documents ?? []}
        selectedDocId={selectedDocId}
        isLoading={docsLoading}
        onSelect={(docId) => setSelectedDocId(docId)}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(projectId) })}
      />

      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="w-full justify-start border-b border-border rounded-none h-12 bg-transparent p-0 overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="preview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="outline" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full flex items-center">
            <BookOpen className="w-4 h-4 mr-2" />
            Outline
          </TabsTrigger>
          <TabsTrigger value="chat" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full flex items-center">
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat AI
          </TabsTrigger>
          <TabsTrigger value="references" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full flex items-center">
            <BookMarked className="w-4 h-4 mr-2" />
            Referensi
          </TabsTrigger>
          <TabsTrigger value="attachments" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full flex items-center">
            <Paperclip className="w-4 h-4 mr-2" />
            Lampiran
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full flex items-center">
            <History className="w-4 h-4 mr-2" />
            Riwayat Versi
          </TabsTrigger>
          <TabsTrigger value="timeline" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full flex items-center">
            <ActivitySquare className="w-4 h-4 mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="quiz" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full flex items-center">
            <ListChecks className="w-4 h-4 mr-2" />
            Kuis
          </TabsTrigger>
          <TabsTrigger value="comments" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full flex items-center">
            <MessageCircle className="w-4 h-4 mr-2" />
            Komentar
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="preview" className="m-0 focus-visible:outline-none">
            <Card className="bg-card min-h-[600px] border-none shadow-sm rounded-xl overflow-hidden">
              <CardContent className="p-8 prose prose-slate dark:prose-invert max-w-none">
                {selectedDoc?.versions?.[0] ? (
                  <>
                    <div dangerouslySetInnerHTML={{ __html: selectedDoc.versions[0].content.replace(/\n/g, '<br/>') }} />
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-24">
                    <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
                      <FileText className="w-10 h-10 text-muted-foreground/40" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">Document not ready</h3>
                    <p className="text-sm text-muted-foreground max-w-md text-center">
                      {project.status === "draft"
                        ? "Click Begin Analysis to start the AI writing process."
                        : "The AI is working on your document. Check back soon."}
                    </p>
                  </div>
                )}
              </CardContent>
              {selectedDoc?.versions?.[0] && project.aiDisclosure !== false && (
                <CardFooter className="px-8 pb-6 pt-0 border-t border-border/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-60">
                    <Badge variant="info" className="text-[10px]">AI-assisted</Badge>
                    <span>Dokumen ini dihasilkan dengan bantuan AI. Mohon tinjau dan sunting sesuai kebutuhan.</span>
                  </div>
                </CardFooter>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="outline" className="m-0 focus-visible:outline-none">
            <OutlineTab projectId={projectId} aiDisclosure={project.aiDisclosure !== false} />
          </TabsContent>

          <TabsContent value="chat" className="m-0">
            <ChatTab projectId={projectId} aiDisclosure={project.aiDisclosure !== false} />
          </TabsContent>

          <TabsContent value="references" className="m-0">
            <ReferencesTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="attachments" className="m-0">
            <AttachmentsTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="history" className="m-0">
            <HistoryTab projectId={projectId} aiDisclosure={project.aiDisclosure !== false} />
          </TabsContent>

          <TabsContent value="timeline" className="m-0">
            <TimelineTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="quiz" className="m-0">
            <QuizTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="comments" className="m-0">
            <CommentsTab projectId={projectId} selectedDocId={selectedDocId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

// ── Quiz Tab ─────────────────────────────────────────────────────────────────

function QuizTab({ projectId }: { projectId: number }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: quizzes, isLoading } = useListQuizzes(projectId)
  const generateQuiz = useGenerateQuiz(projectId)

  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [showGenerate, setShowGenerate] = useState(false)
  const [generateForm, setGenerateForm] = useState({
    title: "",
    topic: "",
    questionCount: 10,
    questionTypes: ["multiple_choice", "short_answer", "essay"],
    difficulty: "medium",
  })
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const submitMutation = useSubmitQuiz(selectedQuiz?.id ?? 0)

  const handleGenerate = () => {
    if (!generateForm.title.trim()) {
      toast({ title: "Judul diperlukan", variant: "destructive" })
      return
    }
    generateQuiz.mutate(
      { data: { title: generateForm.title, topic: generateForm.topic, questionCount: generateForm.questionCount, questionTypes: generateForm.questionTypes, difficulty: generateForm.difficulty } },
      {
        onSuccess: (quiz) => {
          toast({ title: "Kuis dibuat!", description: `${(quiz.questions as unknown as QuizQuestion[])?.length ?? 0} soal` })
          setShowGenerate(false)
          setGenerateForm({ title: "", topic: "", questionCount: 10, questionTypes: ["multiple_choice", "short_answer", "essay"], difficulty: "medium" })
          queryClient.invalidateQueries({ queryKey: getListQuizzesQueryKey(projectId) })
          setSelectedQuiz(quiz as unknown as Quiz)
        },
        onError: (err) => toast({ title: "Gagal generate", description: String(err), variant: "destructive" }),
      }
    )
  }

  const handleSubmit = () => {
    if (!selectedQuiz) return
    const questions = (selectedQuiz.questions as unknown as QuizQuestion[]) ?? []
    const responses = questions.map((q) => ({ questionId: q.id, answer: answers[q.id] ?? "" }))
    setSubmitting(true)
    submitMutation.mutate(
      { data: { responses } },
      {
        onSuccess: () => {
          toast({ title: "Jawaban disimpan!", description: "Submission berhasil." })
          setSubmitting(false)
        },
        onError: (err) => {
          toast({ title: "Gagal submit", description: String(err), variant: "destructive" })
          setSubmitting(false)
        },
      }
    )
  }

  const handleSelectQuiz = async (quiz: Quiz) => {
    setSelectedQuiz(quiz)
    setAnswers({})
    const full = await fetch(`/api/projects/${projectId}/quizzes/${quiz.id}`).then(r => r.json()).catch(() => quiz)
    setSelectedQuiz(full)
  }

  const questions = (selectedQuiz?.questions as unknown as QuizQuestion[]) ?? []
  const diffColors: Record<string, string> = { easy: "text-green-600", medium: "text-yellow-600", hard: "text-red-600" }
  const diffLabels: Record<string, string> = { easy: "Mudah", medium: "Sedang", hard: "Sulit" }

  return (
    <Card className="bg-card border-none shadow-sm rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg">Kuis</CardTitle>
          <CardDescription>Kelola soal kuis dan submissions</CardDescription>
        </div>
        <Button size="sm" onClick={() => setShowGenerate(true)}>
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Kuis
        </Button>
      </CardHeader>
      <CardContent>
        {/* Generate Dialog */}
        <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Generate Kuis dengan AI</DialogTitle>
              <DialogDescription>Teora akan membuat soal kuis berdasarkan topik yang Anda berikan.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Judul Kuis *</Label>
                <Input value={generateForm.title} onChange={e => setGenerateForm(f => ({ ...f, title: e.target.value }))} placeholder="Contoh: UH Bahasa Indonesia 1" />
              </div>
              <div>
                <Label>Topik / Materi</Label>
                <Textarea value={generateForm.topic} onChange={e => setGenerateForm(f => ({ ...f, topic: e.target.value }))} placeholder="Topik spesifik atau biarkan kosong untuk topik umum..." rows={2} />
              </div>
              <div>
                <Label>Jumlah Soal: {generateForm.questionCount}</Label>
                <input type="range" min={5} max={20} value={generateForm.questionCount} onChange={e => setGenerateForm(f => ({ ...f, questionCount: Number(e.target.value) }))} className="w-full" />
              </div>
              <div>
                <Label>Tipe Soal</Label>
                <div className="flex gap-4 flex-wrap">
                  {[["multiple_choice", "Pilihan Ganda"], ["short_answer", "Isian Singkat"], ["essay", "Essay"]].map(([val, label]) => (
                    <label key={val} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={generateForm.questionTypes.includes(val)} onChange={e => {
                        setGenerateForm(f => ({
                          ...f,
                          questionTypes: e.target.checked ? [...f.questionTypes, val] : f.questionTypes.filter(t => t !== val)
                        }))
                      }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Tingkat Kesulitan</Label>
                <Select value={generateForm.difficulty} onValueChange={v => setGenerateForm(f => ({ ...f, difficulty: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Mudah</SelectItem>
                    <SelectItem value="medium">Sedang</SelectItem>
                    <SelectItem value="hard">Sulit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGenerate(false)}>Batal</Button>
              <Button onClick={handleGenerate} disabled={generateQuiz.isPending}>
                {generateQuiz.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Quiz List / Viewer */}
        {!selectedQuiz ? (
          <div>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : quizzes && quizzes.length > 0 ? (
              <div className="space-y-3">
                {quizzes.map(quiz => {
                  const qs = (quiz.questions as unknown as QuizQuestion[]) ?? []
                  return (
                    <Card key={quiz.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => handleSelectQuiz(quiz as unknown as Quiz)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium">{quiz.title}</h3>
                            <p className="text-sm text-muted-foreground">{qs.length} soal</p>
                            <div className="flex gap-2 mt-1">
                              {quiz.metadata && typeof quiz.metadata === "object" && "difficulty" in (quiz.metadata as object) && (
                                <Badge variant="outline" className={diffColors[(quiz.metadata as { difficulty?: string }).difficulty ?? "medium"]}>
                                  {(quiz.metadata as { difficulty?: string }).difficulty}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">{quiz.createdAt ? format(new Date(quiz.createdAt), "dd MMM yyyy") : ""}</div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <EmptyMedia illustration="quiz" className="size-16 mx-auto mb-4">
                  <EmptyIllustrationQuiz />
                </EmptyMedia>
                <p className="text-sm font-medium text-foreground mb-1">Belum ada kuis</p>
                <p className="text-xs text-muted-foreground">Generate kuis pertama Anda!</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedQuiz(null)} className="mb-4">
              ← Kembali ke daftar
            </Button>
            <h2 className="text-xl font-semibold mb-1">{selectedQuiz.title}</h2>
            {selectedQuiz.description && <p className="text-muted-foreground mb-4">{selectedQuiz.description}</p>}
            <div className="space-y-6">
              {questions.map((q, idx) => (
                <Card key={q.id} className="bg-muted/20">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <Badge variant="outline" className="shrink-0 mt-0.5">{idx + 1}</Badge>
                      <div>
                        <p className="font-medium">{q.text}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                          {q.type === "multiple_choice" ? "Pilihan Ganda" : q.type === "short_answer" ? "Isian Singkat" : "Essay"} &bull; {q.type === "multiple_choice" && q.options ? `${q.options.length} opsi` : ""}
                        </p>
                      </div>
                    </div>
                    {q.type === "multiple_choice" && q.options ? (
                      <div className="space-y-2 ml-10">
                        {q.options.map(opt => (
                          <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              checked={answers[q.id] === opt.id}
                              onChange={() => setAnswers(a => ({ ...a, [q.id]: opt.id }))}
                              className="accent-primary"
                            />
                            <span>{opt.text}</span>
                          </label>
                        ))}
                      </div>
                    ) : q.type === "short_answer" ? (
                      <div className="ml-10">
                        <Input
                          value={answers[q.id] ?? ""}
                          onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                          placeholder="Jawaban singkat..."
                        />
                      </div>
                    ) : (
                      <div className="ml-10">
                        <Textarea
                          value={answers[q.id] ?? ""}
                          onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                          placeholder="Jawaban esai..."
                          rows={4}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button className="mt-6" onClick={handleSubmit} disabled={submitting || submitMutation.isPending}>
              {submitting || submitMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Submit Jawaban
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Comments Tab ──────────────────────────────────────────────────────────────

function CommentsTab({ projectId, selectedDocId }: { projectId: number; selectedDocId: number | null }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: comments, isLoading } = useListComments(projectId, selectedDocId ?? 0)
  const createComment = useCreateComment(projectId, selectedDocId ?? 0)
  const updateComment = useUpdateComment(projectId, 0)
  const deleteComment = useDeleteComment(projectId, 0)

  const [newContent, setNewContent] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState("")
  const [resolved, setResolved] = useState<Set<number>>(new Set())

  const handleCreate = () => {
    if (!newContent.trim() || !selectedDocId) return
    createComment.mutate(
      { data: { content: newContent.trim() } },
      {
        onSuccess: () => {
          setNewContent("")
          queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/documents/${selectedDocId}/comments`] })
        },
        onError: (err) => toast({ title: "Gagal", description: String(err), variant: "destructive" }),
      }
    )
  }

  const handleResolve = (commentId: number, currentResolved: boolean) => {
    updateComment.mutate(
      { commentId, data: { resolved: !currentResolved } },
      {
        onSuccess: () => {
          setResolved(prev => {
            const next = new Set(prev)
            if (!currentResolved) next.add(commentId)
            else next.delete(commentId)
            return next
          })
          toast({ title: currentResolved ? "Komentar dibuka" : "Komentar diselesaikan" })
        },
        onError: (err) => toast({ title: "Gagal", description: String(err), variant: "destructive" }),
      }
    )
  }

  const handleEdit = (comment: Comment) => {
    setEditingId(comment.id)
    setEditContent(comment.content)
  }

  const handleSaveEdit = (commentId: number) => {
    if (!editContent.trim()) return
    updateComment.mutate(
      { commentId, data: { content: editContent.trim() } },
      {
        onSuccess: () => {
          setEditingId(null)
          setEditContent("")
          queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/documents/${selectedDocId}/comments`] })
        },
        onError: (err) => toast({ title: "Gagal", description: String(err), variant: "destructive" }),
      }
    )
  }

  const handleDelete = (commentId: number) => {
    if (!confirm("Hapus komentar ini?")) return
    deleteComment.mutate(
      { commentId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/documents/${selectedDocId}/comments`] })
          toast({ title: "Dihapus" })
        },
        onError: (err) => toast({ title: "Gagal", description: String(err), variant: "destructive" }),
      }
    )
  }

  const sortedComments = [...(comments ?? [])].sort((a, b) => {
    const aResolved = resolved.has(a.id) || a.resolved
    const bResolved = resolved.has(b.id) || b.resolved
    if (aResolved !== bResolved) return aResolved ? 1 : -1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <Card className="bg-card border-none shadow-sm rounded-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Komentar</CardTitle>
        <CardDescription>
          {selectedDocId ? "Komentar pada dokumen yang dipilih" : "Pilih dokumen terlebih dahulu"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {selectedDocId ? (
          <>
            {/* Add Comment */}
            <div className="mb-6">
              <Textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="Tambahkan komentar..."
                rows={3}
              />
              <div className="flex justify-end mt-2">
                <Button size="sm" onClick={handleCreate} disabled={!newContent.trim() || createComment.isPending}>
                  {createComment.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
                  Kirim Komentar
                </Button>
              </div>
            </div>

            {/* Comments List */}
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : sortedComments.length > 0 ? (
              <div className="space-y-3">
                {sortedComments.map(comment => {
                  const isResolved = resolved.has(comment.id) || comment.resolved
                  return (
                    <Card key={comment.id} className={`bg-muted/20 ${isResolved ? "opacity-60" : ""}`}>
                      <CardContent className="p-4">
                        {comment.quoteText && (
                          <blockquote className="border-l-2 border-primary/40 pl-3 mb-2 text-sm text-muted-foreground italic">
                            "{comment.quoteText}"
                          </blockquote>
                        )}
                        {editingId === comment.id ? (
                          <div>
                            <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={2} className="mb-2" />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleSaveEdit(comment.id)}>Simpan</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Batal</Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium">{comment.userName}</span>
                            <span>•</span>
                            <span>{comment.createdAt ? format(new Date(comment.createdAt), "dd MMM yyyy HH:mm") : ""}</span>
                            {isResolved && <Badge variant="secondary" className="text-xs">Diselesaikan</Badge>}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleResolve(comment.id, !!comment.resolved)} title={isResolved ? "Buka" : "Selesaikan"}>
                              {isResolved ? <XCircle className="w-4 h-4 text-muted-foreground" /> : <CheckCheck className="w-4 h-4 text-green-600" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(comment)} title="Edit">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(comment.id)} title="Hapus">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Belum ada komentar. Jadilah yang pertama!</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Pilih dokumen terlebih dahulu untuk melihat komentar</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function OutlineTab({ projectId, aiDisclosure }: { projectId: number; aiDisclosure: boolean }) {
  const { data: metadata, isLoading } = useGetProjectMetadata(projectId)
  const regenerateOutline = useRegenerateOutline()
  const generateDocument = useGenerateDocument()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [editedOutline, setEditedOutline] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (metadata?.outline) {
      setEditedOutline(metadata.outline)
    }
  }, [metadata])

  const handleRegenerate = () => {
    regenerateOutline.mutate({
      projectId,
      data: { userOutline: editedOutline },
    }, {
      onSuccess: (data) => {
        toast({ title: "Outline diperbarui", description: "Outline berhasil diregenerasi." })
        setEditedOutline(data.outline ?? "")
        setIsEditing(false)
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/metadata`] })
      },
      onError: () => toast({ title: "Gagal", variant: "destructive" })
    })
  }

  const handleGenerate = () => {
    generateDocument.mutate({ projectId }, {
      onSuccess: () => {
        toast({ title: "Dokumen sedang ditulis", description: "AI sedang menulis dokumen dari outline. Cek tab Preview." })
      },
      onError: (err) => toast({ title: String(err), variant: "destructive" })
    })
  }

  if (isLoading) {
    return (
      <Card className="bg-card border-none shadow-sm rounded-xl">
        <CardContent className="p-8">
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-none shadow-sm rounded-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-serif text-lg">Document Outline</CardTitle>
            <CardDescription>Struktur dokumen — bab dan sub-bab.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              disabled={!editedOutline}
            >
              {isEditing ? "Batal" : "Edit Outline"}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerateOutline.isPending || !editedOutline}
            >
              {regenerateOutline.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Regenerate
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerate}
              disabled={generateDocument.isPending || !editedOutline}
            >
              {generateDocument.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <FileText className="w-4 h-4 mr-2" />
              Generate Document
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {editedOutline ? (
          isEditing ? (
            <Textarea
              value={editedOutline}
              onChange={(e) => setEditedOutline(e.target.value)}
              className="min-h-[400px] font-mono text-sm leading-relaxed"
              placeholder="Outline akan muncul di sini setelah analisis..."
            />
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {editedOutline}
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Belum ada outline</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Klik "Begin Analysis" untuk membuat outline otomatis dari instruksi tugas.
            </p>
          </div>
        )}
        {isEditing && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-3">
              Edit outline di atas, lalu klik "Regenerate" untuk menyempurnakan.
            </p>
          </div>
        )}
      </CardContent>
      {editedOutline && aiDisclosure && (
        <CardFooter className="border-t px-6 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-60">
            <Badge variant="info" className="text-[10px]">AI-assisted</Badge>
            <span>Outline dihasilkan dengan bantuan AI. Mohon tinjau dan sesuaikan.</span>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}

function ChatTab({ projectId, aiDisclosure }: { projectId: number; aiDisclosure: boolean }) {
  const { data: messages, isLoading } = useListMessages(projectId, { query: { queryKey: getListMessagesQueryKey(projectId), refetchInterval: 5000 } })
  const sendMessage = useSendMessage()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [content, setContent] = useState("")
  const [mode, setMode] = useState<ChatMode>("revise")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    const messageContent = content
    setContent("")

    sendMessage.mutate({
      projectId,
      data: { content: messageContent, mode }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(projectId) })
      },
      onError: () => {
        toast({ variant: "destructive", title: "Message failed", description: "Could not send message." })
        setContent(messageContent)
      }
    })
  }

  return (
    <Card className="flex flex-col h-[600px] bg-card border-border shadow-sm">
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-16 w-1/2 ml-auto" />
            <Skeleton className="h-24 w-3/4" />
          </div>
        ) : messages?.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8 py-16">
            <EmptyMedia illustration="chat" className="size-20 mb-6">
              <EmptyIllustrationChat />
            </EmptyMedia>
            <h3 className="text-lg font-medium text-foreground mb-2">Start the conversation</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Ask the AI to revise sections, clarify concepts, add citations, or help with research.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80" onClick={() => setMode("revise")}>Revise introduction</Badge>
              <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80" onClick={() => setMode("socratic")}>Explain concept</Badge>
              <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80" onClick={() => setMode("quiz")}>Test knowledge</Badge>
              <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80" onClick={() => setMode("summary")}>Summarize</Badge>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages?.map(msg => (
              <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : msg.role === "system"
                    ? "bg-muted text-muted-foreground italic w-full text-center rounded-lg shadow-none border"
                    : "bg-secondary/90 text-secondary-foreground rounded-tl-sm border-l-[3px] border-l-primary border border-border/50"
                )}>
                  {msg.role === "system" ? msg.content : (
                    <div className={cn("whitespace-pre-wrap", msg.role === "assistant" && "font-serif")}>{msg.content}</div>
                  )}
                  {msg.role === "assistant" && aiDisclosure && (
                    <div className="mt-2.5 pt-1.5 border-t border-border/30">
                      <Badge variant="info" className="text-[10px] opacity-70">AI-assisted</Badge>
                    </div>
                  )}
                  {msg.role !== "system" && (
                    <div className={cn("text-[10px] mt-1 opacity-50", msg.role === "user" ? "text-right" : "")}>
                      {format(new Date(msg.createdAt), "h:mm a")}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sendMessage.isPending && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-5 py-4 bg-secondary/90 border-l-[3px] border-l-primary border border-border/50 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" />
                  <span className="text-xs text-muted-foreground italic">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
      <div className="p-4 border-t border-border bg-card">
        {/* Mode selector */}
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {([
            ["generate", "Generate"],
            ["revise", "Revise"],
            ["reflect", "Reflect"],
            ["socratic", "Socratic"],
            ["quiz", "Quiz"],
            ["summary", "Summary"],
          ] as const).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSend} className="flex gap-3">
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={mode === "socratic" ? "Ask a question and I'll guide you with questions..." : mode === "quiz" ? "Ask me to create a quiz based on your material..." : mode === "summary" ? "Ask me to summarize your document..." : mode === "reflect" ? "Ask me to analyze your work..." : "Discuss references, ask for revisions, or brainstorm..."}
            className="flex-1 bg-background"
            disabled={sendMessage.isPending}
          />
          <Button type="submit" size="icon" disabled={!content.trim() || sendMessage.isPending}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  )
}

function ReferencesTab({ projectId }: { projectId: number }) {
  const { data: references, isLoading } = useListReferences(projectId)
  const createRef = useCreateReference()
  const deleteRef = useDeleteReference()
  const regenBib = useRegenerateBibliography()
  const fetchMeta = useFetchReferenceMetadata()
  const searchCrossRef = useSearchReferences(
    { q: searchQuery },
    { query: { enabled: false } }
  )
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"manual" | "lookup">("manual")
  const [lookupId, setLookupId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchSubmitted, setSearchSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    title: "", authors: "", year: "", journal: "", volume: "", issue: "", doi: ""
  })
  const [addedDois, setAddedDois] = useState<Set<string>>(new Set())

  const handleLookup = () => {
    if (!lookupId.trim()) return
    fetchMeta.mutate(
      { data: { identifier: lookupId.trim() } },
      {
        onSuccess: (data) => {
          setFormData({
            title: data.title ?? "",
            authors: data.authors ?? "",
            year: data.year ? String(data.year) : "",
            journal: data.journal ?? "",
            volume: data.volume ?? "",
            issue: data.issue ?? "",
            doi: data.doi ?? "",
          })
          setMode("manual")
          toast({
            title: "Metadata found",
            description: `From ${data.source}: ${data.title?.slice(0, 60)}${data.title && data.title.length > 60 ? "…" : ""}`,
          })
        },
        onError: (err) => toast({
          title: "Lookup failed",
          description: String(err),
          variant: "destructive",
        })
      }
    )
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createRef.mutate({
      projectId,
      data: {
        title: formData.title,
        authors: formData.authors || undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        journal: formData.journal || undefined,
        volume: formData.volume || undefined,
        issue: formData.issue || undefined,
        doi: formData.doi || undefined,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Reference added" })
        setOpen(false)
        setFormData({ title: "", authors: "", year: "", journal: "", volume: "", issue: "", doi: "" })
        setLookupId("")
        setMode("manual")
        queryClient.invalidateQueries({ queryKey: getListReferencesQueryKey(projectId) })
      },
      onError: () => toast({ title: "Failed to add", variant: "destructive" })
    })
  }

  const handleDelete = (refId: number) => {
    if (!confirm("Remove this reference?")) return
    deleteRef.mutate({ projectId, referenceId: refId }, {
      onSuccess: () => {
        toast({ title: "Reference removed" })
        queryClient.invalidateQueries({ queryKey: getListReferencesQueryKey(projectId) })
      }
    })
  }

  const handleRegen = () => {
    regenBib.mutate({ projectId }, {
      onSuccess: () => toast({ title: "Bibliography regenerated" })
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim() || searchQuery.trim().length < 3) return
    setSearchSubmitted(true)
    searchCrossRef.refetch()
  }

  const addSearchResult = (result: CrossRefSearchResult) => {
    if (!result.title) return
    if (result.doi && addedDois.has(result.doi)) {
      toast({ title: "Already added", description: "This reference is already in your project." })
      return
    }
    createRef.mutate({
      projectId,
      data: {
        title: result.title,
        authors: result.authors || undefined,
        year: result.year ?? undefined,
        journal: result.journal || undefined,
        volume: result.volume || undefined,
        issue: result.issue || undefined,
        doi: result.doi || undefined,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Reference added", description: result.title?.slice(0, 50) })
        if (result.doi) {
          setAddedDois(prev => new Set(prev).add(result.doi!))
        }
        queryClient.invalidateQueries({ queryKey: getListReferencesQueryKey(projectId) })
      },
      onError: () => toast({ title: "Failed to add", variant: "destructive" })
    })
  }

  const showSearchResults = searchSubmitted && (searchCrossRef.data?.results?.length ?? 0) > 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-serif font-semibold">References Database</h2>
          <p className="text-sm text-muted-foreground">Manage scholarly sources used in your project.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRegen} disabled={regenBib.isPending}>
            <RefreshCw className={cn("w-4 h-4 mr-2", regenBib.isPending && "animate-spin")} />
            Regenerate
          </Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setMode("manual"); setLookupId(""); setFormData({ title: "", authors: "", year: "", journal: "", volume: "", issue: "", doi: "" }) } }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Add Reference</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Reference</DialogTitle>
                <DialogDescription>Search by DOI/ISBN or enter manually.</DialogDescription>
              </DialogHeader>

              {/* Lookup section */}
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <LinkIcon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Auto-fill from DOI or ISBN</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 10.1038/nature12373 or 978-0-13-468599-1"
                    value={lookupId}
                    onChange={e => setLookupId(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleLookup()}
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="secondary"
                    onClick={handleLookup}
                    disabled={fetchMeta.isPending || !lookupId.trim()}
                  >
                    {fetchMeta.isPending ? <Loader className="w-4 h-4 animate-spin" /> : "Lookup"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supports DOI (e.g. 10.1000/xyz123) and ISBN-10/ISBN-13
                </p>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex gap-4 mb-4">
                  <button
                    type="button"
                    onClick={() => setMode("manual")}
                    className={cn(
                      "text-sm font-medium pb-1 border-b-2 transition-colors",
                      mode === "manual"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Manual Entry
                  </button>
                </div>

                <form onSubmit={handleCreate} className="space-y-3">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Authors</Label>
                    <Input value={formData.authors} onChange={e => setFormData({...formData, authors: e.target.value})} placeholder="Last, F., & Last, F." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Input type="number" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Journal / Publisher</Label>
                      <Input value={formData.journal} onChange={e => setFormData({...formData, journal: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Volume</Label>
                      <Input value={formData.volume} onChange={e => setFormData({...formData, volume: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Issue</Label>
                      <Input value={formData.issue} onChange={e => setFormData({...formData, issue: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>DOI</Label>
                    <Input value={formData.doi} onChange={e => setFormData({...formData, doi: e.target.value})} className="font-mono text-sm" />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createRef.isPending || !formData.title}>Save</Button>
                  </DialogFooter>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search academic papers */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Search className="w-4 h-4 text-primary" />
            Search Academic Papers
          </div>
          <Badge variant="secondary" className="text-xs">CrossRef</Badge>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search by topic, title, or author..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              setAddedDois(prev => {
                const next = new Set(prev)
                // Reset added status when query changes
                return next
              })
            }}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" disabled={searchCrossRef.isFetching || searchQuery.trim().length < 3}>
            {searchCrossRef.isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </form>

        {searchCrossRef.isError && (
          <p className="text-sm text-destructive">
            Search failed. Please try again.
          </p>
        )}

        {searchSubmitted && !searchCrossRef.isFetching && searchCrossRef.data?.results?.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No papers found for "{searchQuery}". Try different keywords.
          </p>
        )}

        {showSearchResults && (
          <div className="border rounded-lg divide-y bg-card">
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {searchCrossRef.data?.totalResults?.toLocaleString() ?? 0} results for "{searchQuery}"
              </span>
              <span className="text-xs text-muted-foreground">
                Showing {searchCrossRef.data?.results?.length} papers
              </span>
            </div>
            {searchCrossRef.data?.results?.map((result, i) => {
              const isAdded = result.doi ? addedDois.has(result.doi) : false
              const alreadyInProject = references?.some(r => r.doi === result.doi)
              return (
                <div key={i} className="px-4 py-3 hover:bg-muted/30 transition-colors flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{result.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {result.authors}
                      {result.year ? ` (${result.year})` : ''}
                      {result.journal ? ` — ${result.journal}` : ''}
                      {result.volume ? `, Vol. ${result.volume}` : ''}
                      {result.issue ? `(${result.issue})` : ''}
                      {result.page ? `, pp. ${result.page}` : ''}
                    </p>
                    {result.doi && (
                      <p className="text-xs text-primary mt-1 flex items-center gap-1">
                        DOI: {result.doi}
                        <a
                          href={`https://doi.org/${result.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline inline-flex items-center gap-0.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                    )}
                    {result.type && (
                      <Badge variant="outline" className="text-xs mt-1.5 font-normal">
                        {result.type.replace(/-/g, ' ')}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={alreadyInProject || isAdded ? "outline" : "default"}
                    onClick={() => addSearchResult(result)}
                    disabled={createRef.isPending}
                    className="shrink-0"
                  >
                    {createRef.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> :
                      alreadyInProject || isAdded ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Card className="bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead className="w-[40%]">Source</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Used In</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : references?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16">
                  <div className="flex flex-col items-center">
                    <EmptyMedia illustration="book" className="size-16 mb-4">
                      <EmptyIllustrationBook />
                    </EmptyMedia>
                    <p className="text-sm font-medium text-foreground mb-1">No references yet</p>
                    <p className="text-xs text-muted-foreground">Add sources to cite in your document</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : references?.map(ref => (
              <TableRow key={ref.id}>
                <TableCell>
                  {ref.validationStatus === 'verified' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  {ref.validationStatus === 'unverified' && <AlertCircle className="w-5 h-5 text-amber-500" />}
                  {ref.validationStatus === 'invalid' && <AlertCircle className="w-5 h-5 text-destructive" />}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-foreground">{ref.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{ref.authors} {ref.journal ? `• ${ref.journal}` : ''}</div>
                  {ref.doi && <div className="text-xs text-primary mt-1">DOI: {ref.doi}</div>}
                </TableCell>
                <TableCell>{ref.year || "-"}</TableCell>
                <TableCell>
                  {ref.usedInChapters ? (
                    <Badge variant="secondary" className="font-mono text-xs">{ref.usedInChapters}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(ref.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function AttachmentsTab({ projectId }: { projectId: number }) {
  const { data: attachments, isLoading } = useListAttachments(projectId)
  const upload = useUploadAttachment()
  const deleteAttach = useDeleteAttachment()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [type, setType] = useState<"instruction" | "supplement">("supplement")

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string).split(',')[1]
      
      upload.mutate({
        projectId,
        data: {
          filename: file.name,
          base64Content: base64,
          mimeType: file.type,
          attachmentType: type
        }
      }, {
        onSuccess: () => {
          toast({ title: "File uploaded successfully" })
          setOpen(false)
          setFile(null)
          queryClient.invalidateQueries({ queryKey: getListAttachmentsQueryKey(projectId) })
        },
        onError: () => toast({ title: "Upload failed", variant: "destructive" })
      })
    }
    reader.readAsDataURL(file)
  }

  const handleDelete = (attachId: number) => {
    if (!confirm("Delete this attachment?")) return
    deleteAttach.mutate({ projectId, attachmentId: attachId }, {
      onSuccess: () => {
        toast({ title: "Attachment deleted" })
        queryClient.invalidateQueries({ queryKey: getListAttachmentsQueryKey(projectId) })
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-serif font-semibold">Attachments & Sources</h2>
          <p className="text-sm text-muted-foreground">Upload PDFs, rubrics, or notes.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Upload className="w-4 h-4 mr-2" /> Upload File</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Attachment</DialogTitle>
              <DialogDescription>Attach materials for the AI to analyze.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label>File</Label>
                <Input type="file" required onChange={e => setFile(e.target.files?.[0] || null)} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v: "instruction"|"supplement") => setType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supplement">Reference Material (Supplement)</SelectItem>
                    <SelectItem value="instruction">Instructions / Rubric</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={!file || upload.isPending}>
                  {upload.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Upload
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : attachments?.length === 0 ? (
          <div className="col-span-full text-center py-16 border border-dashed rounded-xl">
            <EmptyMedia illustration="attachment" className="size-16 mx-auto mb-4">
              <EmptyIllustrationAttachment />
            </EmptyMedia>
            <p className="text-sm font-medium text-foreground mb-1">No attachments yet</p>
            <p className="text-xs text-muted-foreground mb-4">Upload PDFs, rubrics, or notes for the AI to analyze</p>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          </div>
        ) : attachments?.map(attach => (
          <Card key={attach.id} className="bg-card">
            <CardHeader className="p-4 pb-2 flex-row justify-between space-y-0">
              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <File className="w-5 h-5" />
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDelete(attach.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <h3 className="font-medium text-sm truncate" title={attach.originalName || attach.filename}>
                {attach.originalName || attach.filename}
              </h3>
              <div className="flex justify-between items-center mt-3">
                <Badge variant="secondary" className="text-[10px] uppercase">
                  {attach.attachmentType}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {attach.sizeBytes ? (attach.sizeBytes / 1024).toFixed(1) + ' KB' : ''}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function HistoryTab({ projectId, aiDisclosure }: { projectId: number; aiDisclosure: boolean }) {
  const { data: documents, isLoading } = useListDocuments(projectId)
  const allVersions = documents?.flatMap(d => d.versions ?? []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-serif font-semibold">Version History</h2>
        <p className="text-sm text-muted-foreground">Review previous drafts of your document.</p>
      </div>

      <Card className="bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Version</TableHead>
              <TableHead>Changes</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : allVersions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-16">
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <History className="w-7 h-7 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">No versions yet</p>
                    <p className="text-xs text-muted-foreground">Document versions will appear here after regeneration</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : allVersions.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium text-primary">v{v.versionNumber}.0</TableCell>
                <TableCell>{v.changeDescription || "System update"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{format(new Date(v.createdAt), "MMM d, yyyy h:mm a")}</TableCell>
                <TableCell className="text-right">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm"><Eye className="w-4 h-4 mr-2" /> View</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                      <DialogHeader>
                        <DialogTitle>Version {v.versionNumber}.0</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="flex-1 border rounded-md p-6 prose prose-sm dark:prose-invert max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: v.content.replace(/\n/g, '<br/>') }} />
                      </ScrollArea>
                      {aiDisclosure && (
                        <div className="flex items-center gap-2 px-1 py-2 border-t text-xs text-muted-foreground opacity-60">
                          <Badge variant="info" className="text-[10px]">AI-assisted</Badge>
                          <span>Dokumen ini dihasilkan dengan bantuan AI.</span>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function TimelineTab({ projectId }: { projectId: number }) {
  const { data: activities, isLoading } = useListActivities(projectId, { query: { queryKey: getListActivitiesQueryKey(projectId), refetchInterval: 10000 } })

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-serif font-semibold">Activity Timeline</h2>
        <p className="text-sm text-muted-foreground">Track the AI's progress and your interactions.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ActivitySquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold font-serif">{activities?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total activities</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold font-serif">{activities?.filter(a => a.eventType.includes('completed') || a.eventType.includes('started')).length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Milestones hit</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold font-serif">{activities?.filter(a => new Date(a.createdAt).toDateString() === new Date().toDateString()).length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative pl-6 border-l-2 border-border ml-2 space-y-8 mt-4">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : activities?.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <ActivitySquare className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No activity yet</p>
            <p className="text-xs text-muted-foreground">Activity will be logged here as you work</p>
          </div>
        ) : activities?.map((act) => {
          const eventColors = {
            analysis_started: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
            analysis_completed: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
            document_generation_started: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
            document_generation_completed: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
            document_generation_failed: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
            reference_added: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
            share_link_created: 'bg-primary/10 border-primary/20',
            share_link_revoked: 'bg-muted border-border',
          }
          const color = eventColors[act.eventType as keyof typeof eventColors] || 'bg-muted border-border'
          return (
            <div key={act.id} className="relative">
              <div className={cn('absolute -left-[35px] w-4 h-4 rounded-full bg-background border-2', color)} />
              <div className={cn('bg-card border rounded-lg p-4 shadow-sm', color)}>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary" className="uppercase text-[10px] tracking-wider font-mono">
                    {act.eventType.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{format(new Date(act.createdAt), 'MMM d, h:mm a')}</span>
                </div>
                <p className="text-sm text-foreground">{act.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}

// ── Share Button ─────────────────────────────────────────────────────────────

function ShareButton({ projectId }: { projectId: number }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: shareLinks, isLoading } = useListShareLinks(projectId)
  const createShare = useCreateShareLink()
  const deleteShare = useDeleteShareLink()

  const [accessMode, setAccessMode] = useState<"view" | "comment" | "edit">("view")
  const [label, setLabel] = useState("")
  const [expiresDays, setExpiresDays] = useState("")

  const handleCreate = () => {
    createShare.mutate({
      projectId,
      data: {
        accessMode,
        label: label || undefined,
        expiresInDays: expiresDays ? parseInt(expiresDays) : undefined,
      }
    }, {
      onSuccess: (link) => {
        toast({ title: "Share link created" })
        queryClient.invalidateQueries({ queryKey: getListShareLinksQueryKey(projectId) })
        setLabel("")
        setExpiresDays("")
        const url = `${window.location.origin}/shared/${link.token}`
        navigator.clipboard.writeText(url)
        toast({ title: "Link copied to clipboard!", description: url })
      },
      onError: (err) => toast({ title: String(err), variant: "destructive" })
    })
  }

  const handleDelete = (shareId: number) => {
    if (!confirm("Revoke this share link?")) return
    deleteShare.mutate({ projectId, shareId }, {
      onSuccess: () => {
        toast({ title: "Share link revoked" })
        queryClient.invalidateQueries({ queryKey: getListShareLinksQueryKey(projectId) })
      }
    })
  }

  const handleCopy = (token: string) => {
    const url = `${window.location.origin}/shared/${token}`
    navigator.clipboard.writeText(url)
    toast({ title: "Link copied to clipboard" })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
          <DialogDescription>
            Create a shareable link for this project. No account needed for recipients.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3 p-4 bg-muted/20 rounded-lg border border-border/50">
            <h4 className="text-sm font-medium">Create new link</h4>
            <div className="space-y-2">
              <Label className="text-xs">Access mode</Label>
              <div className="flex gap-2">
                {(["view", "comment", "edit"] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setAccessMode(mode)}
                    className={cn(
                      "flex-1 py-1.5 px-3 text-xs font-medium rounded-md border transition-colors capitalize",
                      accessMode === mode
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    )}
                    type="button"
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Label (optional)</Label>
                <Input
                  placeholder="e.g. untuk dosen"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Expires in (days)</Label>
                <Input
                  type="number"
                  placeholder="Never"
                  min="1"
                  value={expiresDays}
                  onChange={e => setExpiresDays(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={createShare.isPending} className="w-full">
              {createShare.isPending ? <Loader className="w-4 h-4 animate-spin mr-2" /> : <LinkIcon className="w-4 h-4 mr-2" />}
              Create & Copy Link
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : shareLinks && shareLinks.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Active links</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {shareLinks.map(link => (
                  <div key={link.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize shrink-0">
                          {link.accessMode}
                        </Badge>
                        {link.label && (
                          <span className="text-sm font-medium truncate">{link.label}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                          /shared/{link.token.slice(0, 12)}...
                        </span>
                        {link.expiresAt && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                            <Clock className="w-3 h-3" />
                            {format(new Date(link.expiresAt), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleCopy(link.token)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(link.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No active share links yet.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="w-full">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
