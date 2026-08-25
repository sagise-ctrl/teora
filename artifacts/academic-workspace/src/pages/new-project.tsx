import { useState, useEffect, useRef } from "react"
import { useLocation } from "wouter"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  useCreateProject,
  useSearchReferences,
  useBulkAddReferences,
  getSearchReferencesQueryKey,
  type CrossRefSearchResult,
} from "../lib/api-client-react"
import { ArrowLeft, Loader2, FilePlus2, Search, Plus, CheckCircle2, RefreshCw, ExternalLink, BookOpen, Upload, X } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Link } from "wouter"
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

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  instructionText: z.string().optional(),
  outputFormat: z.enum(["docx", "pdf", "markdown"]).optional().default("docx"),
  minRefYear: z.coerce.number().min(1900).max(new Date().getFullYear()).optional().or(z.literal("")),
  minRefCount: z.coerce.number().min(0).optional().or(z.literal("")),
})

type FormValues = z.infer<typeof formSchema>

interface SelectedRef extends CrossRefSearchResult {
  selected: boolean
  source: "crossref" | "manual" | "file"
}

export default function NewProject() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const createProject = useCreateProject()
  const bulkAddRefs = useBulkAddReferences()

  const [selectedRefs, setSelectedRefs] = useState<SelectedRef[]>([])
  const [manualSearchQuery, setManualSearchQuery] = useState("")
  const [manualSearchTriggered, setManualSearchTriggered] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [uploadOpen, setUploadOpen] = useState(false)

  const autoSearch = useSearchReferences(
    { q: "" },
    { query: { enabled: false } }
  )

  const manualSearch = useSearchReferences(
    { q: "" },
    { query: { enabled: false } }
  )

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const lastAutoQueryRef = useRef("")

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      instructionText: "",
      outputFormat: "docx",
      minRefYear: 2018,
      minRefCount: 5,
    },
  })

  // Watch title field for auto-search
  const titleValue = form.watch("title")

  // Auto-search when title changes (debounced)
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

  // Populate auto-suggested refs when auto-search returns
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

  // Keep formValues in sync for use in submit
  useEffect(() => {
    const subscription = form.watch((values) => {
      setFormValues(values as FormValues)
    })
    return () => subscription.unsubscribe()
  }, [form.watch])

  function toggleRef(index: number) {
    setSelectedRefs((prev) =>
      prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r))
    )
  }

  function removeRef(index: number) {
    setSelectedRefs((prev) => prev.filter((_, i) => i !== index))
  }

  function handleManualSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!manualSearchQuery.trim() || manualSearchQuery.trim().length < 3) return
    setManualSearchTriggered(true)
    manualSearch.refetch()
  }

  // Populate manual search results
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

  function handleFileUpload(files: FileList | null) {
    if (!files) return
    const names = Array.from(files).map((f) => f.name)
    setUploadedFiles((prev) => [...prev, ...names])
    toast({ title: `${files.length} file(s) uploaded` })
    setUploadOpen(false)
  }

  function onSubmit(data: FormValues) {
    const selected = selectedRefs.filter((r) => r.selected)

    createProject.mutate(
      {
        data: {
          title: data.title,
          instructionText: data.instructionText,
          outputFormat: data.outputFormat,
          minRefYear: data.minRefYear ? Number(data.minRefYear) : undefined,
          minRefCount: data.minRefCount ? Number(data.minRefCount) : undefined,
        },
      },
      {
        onSuccess: async (project) => {
          // Add selected references in bulk
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
              // Non-critical — project was created, refs just didn't save
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

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="mb-6">
        <Link href="/">
          <div className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FilePlus2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">New Project</h1>
            <p className="text-muted-foreground">
              Masukkan judul dan instruksi, lalu siapkan referensi sebelum mulai menulis.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Project Details */}
        <div className="space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-serif">Detail Project</CardTitle>
              <CardDescription>Judul dan instruksi tugas.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">
                          Judul <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Dampak Media Sosial terhadap Kesehatan Mental Remaja"
                            className="text-lg py-5"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Judul akan digunakan untuk mencari referensi secara otomatis.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="instructionText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instruksi Tugas</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Salin instruksi, rubrik, atau persyaratan dari dosen di sini..."
                            className="min-h-[160px] resize-y"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          AI akan menggunakan ini untuk membimbing analisis dan penulisan.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <FormField
                      control={form.control}
                      name="outputFormat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Format</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="docx">Word (.docx)</SelectItem>
                              <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                              <SelectItem value="markdown">Markdown</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="minRefCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Min. Ref.</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="minRefYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Min. Tahun</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="2018" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Right: References */}
        <div className="space-y-4">
          <Card className="bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-serif flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Referensi
                  </CardTitle>
                  <CardDescription>
                    Referensi ditemukan otomatis dari judul. Centang yang ingin dipakai.
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
                      <span>
                        {autoSuggestedCount} paper ditemukan — centang untuk menyertakan
                      </span>
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
                        <p className="text-sm font-medium leading-snug line-clamp-2">
                          {ref.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ref.authors}
                          {ref.year ? ` (${ref.year})` : ""}
                          {ref.journal ? ` — ${ref.journal}` : ""}
                        </p>
                        {ref.doi && (
                          <p className="text-xs text-primary mt-0.5">
                            DOI: {ref.doi}
                          </p>
                        )}
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
                    disabled={
                      manualSearch.isFetching ||
                      manualSearchQuery.trim().length < 3
                    }
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
                <p className="text-xs text-muted-foreground">
                  File PDF atau DOC akan dikonversi jadi referensi otomatis.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Create button */}
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="space-y-3">
                {selectedCount > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {selectedCount} referensi siap digunakan
                  </div>
                )}
                <Button
                  type="button"
                  size="lg"
                  className="w-full font-medium"
                  disabled={createProject.isPending || !form.formState.isValid}
                  onClick={() => form.handleSubmit(onSubmit)()}
                >
                  {createProject.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Membuat Project...
                    </>
                  ) : (
                    <>
                      <FilePlus2 className="w-5 h-5 mr-2" />
                      Buat Project{selectedCount > 0 ? ` dengan ${selectedCount} Referensi` : ""}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Setelah dibuat, Anda bisa langsung lompat ke bab mana saja.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
