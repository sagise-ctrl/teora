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
  useListDocumentVersions,
  useListActivities,
  useListJobs,
  useAnalyzeProject,
  getGetLatestDocumentQueryKey,
  getListMessagesQueryKey,
  getListReferencesQueryKey,
  getListAttachmentsQueryKey,
  getListDocumentVersionsQueryKey,
  getListActivitiesQueryKey,
  getGetProjectQueryKey,
  getListJobsQueryKey
} from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { 
  ArrowLeft, 
  MessageSquare, 
  FileText, 
  BookMarked, 
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
  AlertCircle
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function ProjectWorkspace() {
  const { id } = useParams()
  const projectId = Number(id)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: project, isLoading: projectLoading } = useGetProject(projectId)
  const { data: latestDoc } = useGetLatestDocument(projectId)
  const { data: jobs } = useListJobs(projectId, { query: { queryKey: getListJobsQueryKey(projectId), refetchInterval: 5000 } })

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
          <p className="text-muted-foreground mt-2 max-w-2xl">{project.subject} &bull; {project.taskType || "General Assignment"}</p>
        </div>
        
        <div className="flex items-center gap-3">
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

      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="w-full justify-start border-b border-border rounded-none h-12 bg-transparent p-0 overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="preview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Preview
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
        </TabsList>

        <div className="mt-6">
          <TabsContent value="preview" className="m-0 focus-visible:outline-none">
            <Card className="bg-card min-h-[600px] border-none shadow-sm rounded-xl overflow-hidden">
              <CardContent className="p-8 prose prose-slate dark:prose-invert max-w-none">
                {latestDoc ? (
                  <div dangerouslySetInnerHTML={{ __html: latestDoc.content.replace(/\n/g, '<br/>') }} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-24">
                    <FileText className="w-16 h-16 mb-4 opacity-20" />
                    <p>No document generated yet.</p>
                    {project.status === "draft" && <p className="text-sm mt-2">Begin analysis to start the writing process.</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="m-0">
            <ChatTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="references" className="m-0">
            <ReferencesTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="attachments" className="m-0">
            <AttachmentsTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="history" className="m-0">
            <HistoryTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="timeline" className="m-0">
            <TimelineTab projectId={projectId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

function ChatTab({ projectId }: { projectId: number }) {
  const { data: messages, isLoading } = useListMessages(projectId, { query: { queryKey: getListMessagesQueryKey(projectId), refetchInterval: 5000 } })
  const sendMessage = useSendMessage()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  const [content, setContent] = useState("")
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
      data: { content: messageContent }
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
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-24">
            <MessageSquare className="w-12 h-12 mb-4" />
            <p>No messages yet. Ask the AI for revisions or research assistance.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages?.map(msg => (
              <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-5 py-3 text-sm shadow-sm",
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-sm" 
                    : msg.role === "system"
                    ? "bg-muted text-muted-foreground italic w-full text-center rounded-lg shadow-none"
                    : "bg-secondary text-secondary-foreground rounded-tl-sm"
                )}>
                  {msg.role === "system" ? msg.content : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                  {msg.role !== "system" && (
                    <div className={cn("text-[10px] mt-2 opacity-70", msg.role === "user" ? "text-primary-foreground/70 text-right" : "text-secondary-foreground/70")}>
                      {format(new Date(msg.createdAt), "h:mm a")}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sendMessage.isPending && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-5 py-4 bg-secondary text-secondary-foreground rounded-tl-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
      <div className="p-4 border-t border-border bg-card">
        <form onSubmit={handleSend} className="flex gap-3">
          <Input 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Discuss references, ask for revisions, or brainstorm..."
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
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({ title: "", authors: "", year: "", journal: "", doi: "" })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createRef.mutate({
      projectId,
      data: {
        title: formData.title,
        authors: formData.authors || undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        journal: formData.journal || undefined,
        doi: formData.doi || undefined
      }
    }, {
      onSuccess: () => {
        toast({ title: "Reference added" })
        setOpen(false)
        setFormData({ title: "", authors: "", year: "", journal: "", doi: "" })
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
      onSuccess: () => {
        toast({ title: "Bibliography regenerated" })
      }
    })
  }

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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Add Reference</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Reference</DialogTitle>
                <DialogDescription>Manually enter a source to be used in your document.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Authors</Label>
                  <Input value={formData.authors} onChange={e => setFormData({...formData, authors: e.target.value})} placeholder="Last, F., & Last, F." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input type="number" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Journal / Publisher</Label>
                    <Input value={formData.journal} onChange={e => setFormData({...formData, journal: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>DOI</Label>
                  <Input value={formData.doi} onChange={e => setFormData({...formData, doi: e.target.value})} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createRef.isPending}>Save</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No references found.</TableCell></TableRow>
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
          <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed rounded-lg">
            No attachments uploaded yet.
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

function HistoryTab({ projectId }: { projectId: number }) {
  const { data: versions, isLoading } = useListDocumentVersions(projectId)

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
            ) : versions?.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No versions found.</TableCell></TableRow>
            ) : versions?.map(v => (
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

      <div className="relative pl-6 border-l-2 border-border ml-2 space-y-8 mt-8">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : activities?.length === 0 ? (
          <p className="text-muted-foreground pb-8">No activity yet.</p>
        ) : activities?.map((act, i) => (
          <div key={act.id} className="relative">
            <div className="absolute -left-[35px] w-4 h-4 rounded-full bg-background border-2 border-primary" />
            <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="secondary" className="uppercase text-[10px] tracking-wider font-mono">
                  {act.eventType.replace(/_/g, ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground">{format(new Date(act.createdAt), "MMM d, h:mm a")}</span>
              </div>
              <p className="text-sm text-foreground">{act.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
