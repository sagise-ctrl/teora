import { useState, useEffect, useRef } from "react"
import { useLocation, Link } from "wouter"
import { useQueryClient } from "@tanstack/react-query"
import {
  useCreateProject,
  useSearchReferences,
  useBulkAddReferences,
  getSearchReferencesQueryKey,
  type CrossRefSearchResult,
} from "../lib/api-client-react"
import {
  ArrowLeft,
  Loader2,
  FilePlus2,
  Search,
  CheckCircle2,
  Upload,
  X,
  BookOpen,
  Zap,
  FileText,
  Lightbulb,
  GraduationCap,
  PenLine,
  ChevronRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type ProjectType = "tugas-cepat" | "karya-ilmiah"

interface SelectedRef extends CrossRefSearchResult {
  selected: boolean
  source: "crossref" | "manual" | "file"
}

// ── Type Selector ────────────────────────────────────────────────────────────────

function TypeSelector({ onSelect }: { onSelect: (type: ProjectType) => void }) {
  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <Link href="/">
          <div className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Kembali ke Dashboard
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FilePlus2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Buat Project Baru</h1>
            <p className="text-muted-foreground">
              Pilih jenis project yang ingin Anda buat.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tugas Cepat */}
        <button
          type="button"
          onClick={() => onSelect("tugas-cepat")}
          className="group text-left p-6 rounded-xl border-2 border-border hover:border-[#2D79FF]/50 hover:shadow-md transition-all bg-card"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center mb-4 group-hover:from-amber-100 group-hover:to-orange-100 transition-all">
            <Lightbulb className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Tugas Cepat</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Kumpulan pertanyaan, soal, atau tugas ringan. Tanpa judul, langsung kerja.
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 mb-4">
            <li className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-500 shrink-0" />
              Minim friksi — langsung mulai
            </li>
            <li className="flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-amber-500 shrink-0" />
              Paste soal, upload dokumen, atau chat AI
            </li>
            <li className="flex items-center gap-1.5">
              <BookOpen className="w-3 h-3 text-amber-500 shrink-0" />
              Referensi sebagai tools (opsional)
            </li>
          </ul>
          <div className="flex items-center gap-1 text-sm font-medium text-[#2D79FF]">
            Pilih Tugas Cepat
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Karya Ilmiah */}
        <button
          type="button"
          onClick={() => onSelect("karya-ilmiah")}
          className="group text-left p-6 rounded-xl border-2 border-border hover:border-[#2D79FF]/50 hover:shadow-md transition-all bg-card"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2D79FF]/10 to-[#8E54E9]/5 flex items-center justify-center mb-4 group-hover:from-[#2D79FF]/20 group-hover:to-[#8E54E9]/10 transition-all">
            <GraduationCap className="w-6 h-6 text-[#2D79FF]" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Karya Ilmiah</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Makalah, proposal, atau dokumen terstruktur dengan fitur lengkap.
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 mb-4">
            <li className="flex items-center gap-1.5">
              <PenLine className="w-3 h-3 text-[#2D79FF] shrink-0" />
              Outline builder + AI document generation
            </li>
            <li className="flex items-center gap-1.5">
              <BookOpen className="w-3 h-3 text-[#2D79FF] shrink-0" />
              Sitasi field-aware (APA/IEEE/Vancouver/Footnote)
            </li>
            <li className="flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-[#2D79FF] shrink-0" />
              Export PDF/DOCX, Mode Belajar, AI Statement
            </li>
          </ul>
          <div className="flex items-center gap-1 text-sm font-medium text-[#2D79FF]">
            Pilih Karya Ilmiah
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>
    </div>
  )
}

// ── Tugas Cepat Form ──────────────────────────────────────────────────────────

const tugasCepatSchema = {
  instructionText: "",
  subject: "",
}

type TugasCepatForm = typeof tugasCepatSchema

function TugasCepatForm({
  onBack,
  onCreated,
}: {
  onBack: () => void
  onCreated: (projectId: number) => void
}) {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const createProject = useCreateProject()

  const [instructionText, setInstructionText] = useState("")
  const [subject, setSubject] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [uploadOpen, setUploadOpen] = useState(false)

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return
    const names = Array.from(files).map((f) => f.name)
    setUploadedFiles((prev) => [...prev, ...names])
    toast({ title: `${files.length} file(s) diupload` })
  }

  const handleCreate = () => {
    createProject.mutate(
      {
        data: {
          taskType: "tugas-cepat",
          subject: subject || undefined,
          instructionText: instructionText || undefined,
        },
      },
      {
        onSuccess: (project) => {
          toast({ title: "Project Tugas Cepat dibuat" })
          setLocation(`/projects/${project.id}`)
          onCreated(project.id)
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Gagal membuat project",
            description: "Terjadi kesalahan. Silakan coba lagi.",
          })
        },
      }
    )
  }

  const hasContent = instructionText.trim().length > 0 || uploadedFiles.length > 0 || subject.trim().length > 0

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
      <div className="mb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Pilih jenis project
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                Tugas Cepat
              </Badge>
            </div>
            <h1 className="text-2xl font-serif font-bold tracking-tight">Tugas Cepat</h1>
            <p className="text-muted-foreground text-sm">
              Langsung kerja — paste soal, upload dokumen, atau mulai chat.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Subject (optional) */}
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-serif">Subjek (opsional)</CardTitle>
            <CardDescription>Mata kuliah atau topik tugas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="e.g., Bahasa Indonesia, Fisika Dasar, Pengantar Etika..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-base"
            />
          </CardContent>
        </Card>

        {/* Main Input */}
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-serif">Soal / Pertanyaan</CardTitle>
            <CardDescription>
              Paste soal, instruksi tugas, atau pertanyaan Anda di sini. Minim friksi — tidak ada format khusus.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={`Salin soal atau instruksi tugas di sini...

Contoh:
- Jelaskan perbedaan antara atom dan molekul
- Buat 10 soal pilihan ganda tentang fotosintesis
- Apa dampak media sosial terhadap remaja?`}
              value={instructionText}
              onChange={(e) => setInstructionText(e.target.value)}
              className="min-h-[240px] resize-y text-base"
            />

            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-2">
              {[
                "Buat 5 soal pilihan ganda",
                "Jelaskan konsep ini",
                "Buat rangkuman",
                "Terjemahkan ke bahasa Inggris",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() =>
                    setInstructionText((prev) =>
                      prev ? `${prev.trim()}\n\n${suggestion}:` : `${suggestion}:`
                    )
                  }
                  className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Document Upload */}
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-serif">Upload Dokumen (opsional)</CardTitle>
            <CardDescription>
              Unggah PDF atau dokumen soal jika ada lampiran.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  const input = document.createElement("input")
                  input.type = "file"
                  input.multiple = true
                  input.accept = ".pdf,.doc,.docx,.txt"
                  input.onchange = (e) => handleFileUpload((e.target as HTMLInputElement).files)
                  input.click()
                }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload PDF/DOC
              </Button>

              {uploadedFiles.map((name, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-muted-foreground">{name}</span>
                  <button
                    type="button"
                    onClick={() => setUploadedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-destructive ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              File akan dikonversi jadi referensi dan bisa digunakan di chat AI.
            </p>
          </CardContent>
        </Card>

        {/* Create Button */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            size="lg"
            onClick={handleCreate}
            disabled={createProject.isPending}
            className="flex-1"
          >
            {createProject.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Membuat...
              </>
            ) : (
              <>
                <Lightbulb className="w-5 h-5 mr-2" />
                Mulai Tugas Cepat
              </>
            )}
          </Button>
          <Button variant="outline" size="lg" onClick={onBack}>
            Batal
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Karya Ilmiah Form ──────────────────────────────────────────────────────────

const karyaIlmiahSchema = {
  title: "",
  subject: "",
  taskTypeKarya: "",
  instructionText: "",
  outputFormat: "docx" as "docx" | "pdf" | "markdown",
  citationFormat: "" as "" | "APA" | "IEEE" | "Vancouver" | "Footnote",
  minRefYear: 2018,
  minRefCount: 5,
}

type KaryaIlmiahForm = typeof karyaIlmiahSchema

function KaryaIlmiahForm({
  onBack,
  onCreated,
}: {
  onBack: () => void
  onCreated: (projectId: number) => void
}) {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const createProject = useCreateProject()
  const bulkAddRefs = useBulkAddReferences()

  const [form, setForm] = useState<KaryaIlmiahForm>(karyaIlmiahSchema)
  const [selectedRefs, setSelectedRefs] = useState<SelectedRef[]>([])
  const [manualSearchQuery, setManualSearchQuery] = useState("")
  const [manualSearchTriggered, setManualSearchTriggered] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [uploadOpen, setUploadOpen] = useState(false)

  const autoSearch = useSearchReferences({ q: "" }, { query: { enabled: false } })
  const manualSearch = useSearchReferences({ q: "" }, { query: { enabled: false } })
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const lastAutoQueryRef = useRef("")

  const titleValue = form.title

  useEffect(() => {
    if (!titleValue || titleValue.trim().length < 5) return
    if (titleValue.trim() === lastAutoQueryRef.current) return

    clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      const q = titleValue.trim()
      lastAutoQueryRef.current = q
      autoSearch.refetch({ queryKey: getSearchReferencesQueryKey({ q }) })
    }, 1200)

    return () => clearTimeout(searchTimeoutRef.current)
  }, [titleValue])

  useEffect(() => {
    if (!autoSearch.data?.results) return
    if (autoSearch.data.query !== titleValue?.trim()) return

    const existingDois = new Set(selectedRefs.map((r) => r.doi).filter(Boolean))
    const newSuggestions: SelectedRef[] = autoSearch.data.results
      .filter((r) => r.doi && !existingDois.has(r.doi))
      .map((r) => ({ ...r, selected: true, source: "crossref" as const }))

    if (newSuggestions.length > 0) {
      setSelectedRefs((prev) => {
        const prevDois = new Set(prev.map((r) => r.doi).filter(Boolean))
        const unique = newSuggestions.filter((r) => !prevDois.has(r.doi))
        return [...prev, ...unique]
      })
      toast({
        title: `${newSuggestions.length} paper ditemukan`,
        description: `Saran dari CrossRef untuk "${titleValue?.slice(0, 40)}..."`,
      })
    }
  }, [autoSearch.data])

  useEffect(() => {
    if (!manualSearch.data?.results) return
    if (!manualSearchTriggered) return

    const existingDois = new Set(selectedRefs.map((r) => r.doi).filter(Boolean))
    const newResults: SelectedRef[] = manualSearch.data.results
      .filter((r) => r.doi && !existingDois.has(r.doi))
      .map((r) => ({ ...r, selected: true, source: "crossref" as const }))

    if (newResults.length > 0) {
      setSelectedRefs((prev) => {
        const prevDois = new Set(prev.map((r) => r.doi).filter(Boolean))
        const unique = newResults.filter((r) => !prevDois.has(r.doi))
        return [...prev, ...unique]
      })
      toast({ title: `${newResults.length} paper ditambahkan dari pencarian` })
    }
    setManualSearchTriggered(false)
  }, [manualSearch.dataUpdatedAt])

  const toggleRef = (index: number) => {
    setSelectedRefs((prev) =>
      prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r))
    )
  }

  const removeRef = (index: number) => {
    setSelectedRefs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualSearchQuery.trim() || manualSearchQuery.trim().length < 3) return
    setManualSearchTriggered(true)
    manualSearch.refetch()
  }

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return
    const names = Array.from(files).map((f) => f.name)
    setUploadedFiles((prev) => [...prev, ...names])
    toast({ title: `${files.length} file(s) diupload` })
    setUploadOpen(false)
  }

  const handleCreate = () => {
    const selected = selectedRefs.filter((r) => r.selected)
    const hasTitle = form.title.trim().length >= 3

    createProject.mutate(
      {
        data: {
          title: hasTitle ? form.title.trim() : undefined,
          taskType: "karya-ilmiah",
          subject: form.subject || undefined,
          instructionText: form.instructionText || undefined,
          outputFormat: form.outputFormat,
          citationFormat: form.citationFormat || undefined,
          minRefYear: form.minRefYear || undefined,
          minRefCount: form.minRefCount || undefined,
        },
      },
      {
        onSuccess: async (project) => {
          if (selected.length > 0) {
            try {
              await bulkAddRefs.mutateAsync({
                projectId: project.id,
                data: {
                  references: selected.map((r) => ({
                    title: r.title,
                    authors: r.authors || undefined,
                    year: r.year ?? undefined,
                    journal: r.journal || undefined,
                    volume: r.volume || undefined,
                    issue: r.issue || undefined,
                    doi: r.doi || undefined,
                    url: r.url || undefined,
                    isSuggested: true,
                    source: r.source,
                  })),
                },
              })
              toast({
                title: `${selected.length} referensi disimpan`,
                description: `${selected.length} paper otomatis ditambahkan ke project.`,
              })
            } catch {
              toast({
                title: "Project dibuat",
                description: "Referensi bisa ditambahkan nanti dari tab Referensi.",
                variant: "destructive",
              })
            }
          } else {
            toast({ title: "Project dibuat" })
          }
          setLocation(`/projects/${project.id}`)
          onCreated(project.id)
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Gagal membuat project",
            description: "Terjadi kesalahan. Silakan coba lagi.",
          })
        },
      }
    )
  }

  const selectedCount = selectedRefs.filter((r) => r.selected).length
  const autoSuggestedCount = selectedRefs.filter(
    (r) => r.selected && r.source === "crossref"
  ).length
  const isValid = form.title.trim().length >= 3

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="mb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Pilih jenis project
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#2D79FF]/10 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-[#2D79FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant="outline" className="text-[10px] bg-[#2D79FF]/10 text-[#2D79FF] border-[#2D79FF]/30">
                Karya Ilmiah
              </Badge>
            </div>
            <h1 className="text-2xl font-serif font-bold tracking-tight">Karya Ilmiah</h1>
            <p className="text-muted-foreground text-sm">
              Makalah, proposal, atau dokumen terstruktur dengan fitur lengkap.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Project Details */}
        <div className="space-y-4">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-base font-serif">Detail Project</CardTitle>
              <CardDescription>Judul dan instruksi tugas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Judul <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g., Dampak Media Sosial terhadap Kesehatan Mental Remaja"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="text-base py-5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Judul akan digunakan untuk auto-search referensi.
                </p>
              </div>

              {/* Subject + Task Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Subjek</label>
                  <Input
                    placeholder="e.g., Bahasa Indonesia"
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Jenis Tugas</label>
                  <Select
                    value={form.taskTypeKarya}
                    onValueChange={(v) => setForm((f) => ({ ...f, taskTypeKarya: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="makalah">Makalah</SelectItem>
                      <SelectItem value="proposal">Proposal</SelectItem>
                      <SelectItem value="laporan">Laporan</SelectItem>
                      <SelectItem value="esai">Esai</SelectItem>
                      <SelectItem value="skripsi">Skripsi</SelectItem>
                      <SelectItem value="tesis">Tesis</SelectItem>
                      <SelectItem value="disertasi">Disertasi</SelectItem>
                      <SelectItem value="artikel">Artikel</SelectItem>
                      <SelectItem value="referat">Referat</SelectItem>
                      <SelectItem value="lainnya">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Instruction */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Instruksi Tugas</label>
                <Textarea
                  placeholder="Salin instruksi, rubrik, atau persyaratan dari dosen di sini..."
                  value={form.instructionText}
                  onChange={(e) => setForm((f) => ({ ...f, instructionText: e.target.value }))}
                  className="min-h-[120px] resize-y"
                />
              </div>

              {/* Citation Format + Output */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Format Sitasi</label>
                  <Select
                    value={form.citationFormat}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, citationFormat: v as KaryaIlmiahForm["citationFormat"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APA">APA 7th</SelectItem>
                      <SelectItem value="IEEE">IEEE</SelectItem>
                      <SelectItem value="Vancouver">Vancouver</SelectItem>
                      <SelectItem value="Footnote">Footnote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Format Export</label>
                  <Select
                    value={form.outputFormat}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, outputFormat: v as KaryaIlmiahForm["outputFormat"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="docx">Word (.docx)</SelectItem>
                      <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                      <SelectItem value="markdown">Markdown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create Button */}
          <Card className="bg-card">
            <CardContent className="pt-4 space-y-3">
              {selectedCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  {selectedCount} referensi siap digunakan
                </div>
              )}
              <Button
                size="lg"
                className="w-full font-medium"
                disabled={createProject.isPending || !isValid}
                onClick={handleCreate}
              >
                {createProject.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Membuat Project...
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-5 h-5 mr-2" />
                    Buat Karya Ilmiah{selectedCount > 0 ? ` dengan ${selectedCount} Referensi` : ""}
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Setelah dibuat, Anda bisa langsung lompat ke bab mana saja.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right: References */}
        <div className="space-y-4">
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-serif flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Referensi
                  </CardTitle>
                  <CardDescription>
                    {titleValue && titleValue.trim().length >= 5
                      ? "Auto-search aktif saat judul terisi."
                      : "Auto-search aktif saat judul ≥ 5 karakter."}
                  </CardDescription>
                </div>
                <Badge variant={selectedCount > 0 ? "default" : "secondary"} className="shrink-0">
                  {selectedCount} dipilih
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Auto-search indicator */}
              {titleValue && titleValue.trim().length >= 5 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  {autoSearch.isFetching ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                      <span>Mencari referensi untuk "{titleValue.slice(0, 40)}..."</span>
                    </>
                  ) : autoSuggestedCount > 0 ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{autoSuggestedCount} paper ditemukan — centang untuk menyertakan</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5 shrink-0" />
                      <span>Masukkan judul (≥5 karakter) untuk auto-search</span>
                    </>
                  )}
                </div>
              )}

              {/* Selected references list */}
              {selectedRefs.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {selectedRefs.map((ref, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-2 p-3 rounded-lg border transition-colors cursor-pointer",
                        ref.selected
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-muted/20 hover:bg-muted/40"
                      )}
                      onClick={() => toggleRef(i)}
                    >
                      <div className="shrink-0 mt-0.5">
                        {ref.selected ? (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug line-clamp-2">{ref.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ref.authors}
                          {ref.year ? ` (${ref.year})` : ""}
                          {ref.journal ? ` — ${ref.journal}` : ""}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          {ref.source === "crossref" && (
                            <Badge variant="outline" className="text-[10px] py-0 font-normal">
                              CrossRef
                            </Badge>
                          )}
                          {ref.source === "manual" && (
                            <Badge variant="outline" className="text-[10px] py-0 font-normal">
                              Manual
                            </Badge>
                          )}
                          {ref.source === "file" && (
                            <Badge variant="outline" className="text-[10px] py-0 font-normal">
                              File
                            </Badge>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeRef(i)
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Belum ada referensi.</p>
                  <p className="text-xs mt-1">Masukkan judul di samping untuk auto-search.</p>
                </div>
              )}

              {/* Manual search */}
              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Cari Manual
                </p>
                <form onSubmit={handleManualSearch} className="flex gap-2">
                  <Input
                    placeholder="Cari topik, penulis, atau judul..."
                    value={manualSearchQuery}
                    onChange={(e) => setManualSearchQuery(e.target.value)}
                    className="flex-1 text-sm"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    disabled={manualSearch.isFetching || manualSearchQuery.trim().length < 3}
                  >
                    {manualSearch.isFetching ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </form>
              </div>

              {/* File upload */}
              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Upload File
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      const input = document.createElement("input")
                      input.type = "file"
                      input.multiple = true
                      input.accept = ".pdf,.doc,.docx"
                      input.onchange = (e) => handleFileUpload((e.target as HTMLInputElement).files)
                      input.click()
                    }}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload PDF/DOC
                  </Button>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="space-y-1">
                    {uploadedFiles.map((name, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        {name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function NewProject() {
  const [location] = useLocation()
  const params = new URLSearchParams(location.split("?")[1] ?? "")
  const typeParam = params.get("type") as ProjectType | null

  const [selectedType, setSelectedType] = useState<ProjectType | null>(
    typeParam === "tugas-cepat" || typeParam === "karya-ilmiah" ? typeParam : null
  )

  useEffect(() => {
    if (typeParam === "tugas-cepat" || typeParam === "karya-ilmiah") {
      setSelectedType(typeParam)
    }
  }, [typeParam])

  if (!selectedType) {
    return <TypeSelector onSelect={setSelectedType} />
  }

  if (selectedType === "tugas-cepat") {
    return (
      <TugasCepatForm
        onBack={() => setSelectedType(null)}
        onCreated={() => {}}
      />
    )
  }

  return (
    <KaryaIlmiahForm
      onBack={() => setSelectedType(null)}
      onCreated={() => {}}
    />
  )
}
