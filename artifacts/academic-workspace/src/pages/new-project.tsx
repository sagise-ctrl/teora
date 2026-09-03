import { useState } from "react"
import { useLocation, useSearch } from "wouter"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useCreateProject, type ProjectInputOutputFormat } from "../lib/api-client-react"
import {
  ArrowLeft,
  Loader2,
  FilePlus2,
  Upload,
  X,
  Sparkles,
  GraduationCap,
  ListChecks,
  Quote,
  Presentation,
  FileText,
} from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type TaskType = "general" | "academic"
type CitationFormat = "APA" | "APA7" | "IEEE" | "Vancouver" | "Chicago" | "MLA" | "Harvard"

function getActiveType(search: string): TaskType {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  return params.get("type") === "academic" ? "academic" : "general"
}

const CITATION_FORMAT_OPTIONS: Array<{ value: CitationFormat; label: string; description: string }> = [
  { value: "APA", label: "APA (7th ed.)", description: "Paling populer di Indonesia" },
  { value: "APA7", label: "APA 7th Edition", description: "Versi terbaru APA" },
  { value: "IEEE", label: "IEEE", description: "Populer untuk teknik & IT" },
  { value: "Vancouver", label: "Vancouver", description: "ICMJE — populer untuk jurnal medis" },
  { value: "Chicago", label: "Chicago", description: "Humaniora dan sosial" },
  { value: "MLA", label: "MLA", description: "Sastra dan bahasa" },
  { value: "Harvard", label: "Harvard", description: "Populer di Australia dan UK" },
]

const formSchema = z.object({
  title: z.string().optional(),
  instructionText: z
    .string()
    .min(3, "Minimal 3 karakter agar Teora bisa menganalisis dengan baik."),
  citationFormat: z.enum(["APA", "APA7", "IEEE", "Vancouver", "Chicago", "MLA", "Harvard"]).optional(),
  outputFormat: z.enum(["docx", "pptx"]).optional(),
})

type FormValues = z.infer<typeof formSchema>

const COPY = {
  general: {
    pageTitle: "Task Umum Baru",
    pageSubtitle: "Mulai tugas singkat. Teora akan kerjakan langsung jadi dokumen siap export.",
    icon: ListChecks,
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    titleLabel: "Judul",
    titlePlaceholder: "Contoh: Ringkasan Jurnal Mingguan",
    titleHelper:
      "Fungsi judul hanya memberi nama dokumen, tidak tampil di file yang di-download. Kosongkan dan Teora akan generate judul otomatis di workspace.",
    instructionLabel: "Instruksi Tugas",
    instructionPlaceholder:
      "Salin instruksi, rubrik, atau requirements dari dosen di sini…",
    instructionHelper:
      "Wajib. Teora pakai ini untuk generate judul (kalau kosong), analisis awal, dan menulis dokumen.",
    uploadHelper:
      "Opsional. Bisa berisi instruksi detail, bahan acuan, atau referensi. Teora analisis di workspace.",
    cta: "Mulai Kerjakan",
    workspaceLabel: "Task Umum",
    flowBadge: "4 tahap: Idea → Writing → Revision → Done",
  },
  academic: {
    pageTitle: "Karya Ilmiah Baru",
    pageSubtitle:
      "Mulai karya ilmiah dari ide. Teora akan bantu buat kerangka awal + report pemahaman, refine bareng, baru generate.",
    icon: GraduationCap,
    iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    titleLabel: "Tema",
    titlePlaceholder: "Contoh: Dampak Teknologi Digital terhadap Kualitas Pembelajaran di PT Indonesia",
    titleHelper:
      "Opsional. Teora generate judul final dari analisis tema di workspace. Anda bisa edit manual atau minta rekomendasi judul via Teora chat.",
    instructionLabel: "Ide / Gagasan",
    instructionPlaceholder:
      "Jelaskan ide/gagasan awal, pertanyaan riset, atau arah eksplorasi yang Anda bayangkan…",
    instructionHelper:
      "Wajib. Teora pakai ini untuk buat outline/kerangka awal/Plan di workspace.",
    uploadHelper:
      "Opsional. Referensi/bahan pendukung (paper, dataset, dll). Teora analisis di workspace.",
    cta: "Mulai dengan Teora",
    workspaceLabel: "Karya Ilmiah",
    flowBadge: "5 tahap: Idea → Plan → Writing → Revision → Done",
  },
} as const

export default function NewProject() {
  const [, setLocation] = useLocation()
  // wouter 3.x: useSearch() returns the raw query string (without leading "?").
  // useLocation() returns path only: never use it for ?type= parsing.
  const searchString = useSearch() ?? ""
  const taskType = getActiveType(searchString)
  const copy = COPY[taskType]
  const isAcademic = taskType === "academic"

  const { toast } = useToast()
  const createProject = useCreateProject()

  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", instructionText: "", citationFormat: "APA", outputFormat: "docx" },
    mode: "onChange",
  })

  function handleFileUpload(files: FileList | null) {
    if (!files) return
    const names = Array.from(files).map((f) => f.name)
    setUploadedFiles((prev) => [...prev, ...names])
    toast({
      title: `${files.length} file dipilih`,
      description: "File akan dianalisis Teora di workspace.",
    })
  }

  function removeFile(index: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function onSubmit(data: FormValues) {
    const titleTrimmed = (data.title ?? "").trim()
    const baseInstruction = data.instructionText.trim()

    // For now we don't persist file binary: just keep filenames as context
    // so the workspace AI knows which files the user attached. Proper file
    // upload + extraction comes in the workspace iteration.
    const finalInstruction =
      uploadedFiles.length > 0
        ? `${baseInstruction}\n\n[File terlampir untuk dianalisis Teora di workspace: ${uploadedFiles.join(", ")}]`
        : baseInstruction

    createProject.mutate(
      {
        data: {
          title: titleTrimmed.length > 0 ? titleTrimmed : undefined,
          instructionText: finalInstruction,
          taskType,
          citationFormat: data.citationFormat,
          outputFormat: (data.outputFormat ?? "docx") as ProjectInputOutputFormat,
        },
      },
      {
        onSuccess: (project) => {
          toast({
            title: `${copy.workspaceLabel} dibuat`,
            description: "Membuka workspace…",
          })
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

  const Icon = copy.icon

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-6">
        <Link href="/projects">
          <div className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Kembali ke Daftar Task
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", copy.iconBg)}>
            <Icon className={cn("w-5 h-5", copy.iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">
              {copy.pageTitle}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{copy.pageSubtitle}</p>
          </div>
        </div>
        <div className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-full px-3 py-1">
          <Sparkles className="w-3 h-3" />
          {copy.flowBadge}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-serif">
                Detail {isAcademic ? "Karya Ilmiah" : "Task"}
              </CardTitle>
              <CardDescription>
                {isAcademic
                  ? "Mulai dari tema dan ide. Teora akan kembangkan jadi outline + kerangka awal yang siap direfine bareng."
                  : "Mulai dari instruksi. Teora akan kerjakan langsung jadi dokumen siap export."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title / Tema: OPSIONAL */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">
                      {copy.titleLabel}{" "}
                      <span className="text-muted-foreground text-xs font-normal">(opsional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={copy.titlePlaceholder}
                        className="text-lg py-5"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      {copy.titleHelper}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Output Format: Dokumen / Slide */}
              <FormField
                control={form.control}
                name="outputFormat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base flex items-center gap-1.5">
                      <Presentation className="w-4 h-4" />
                      Format Output
                    </FormLabel>
                    <div className="flex rounded-lg border border-border overflow-hidden w-fit">
                      <button
                        type="button"
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                          field.value === "docx" || !field.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:bg-muted"
                        )}
                        onClick={() => field.onChange("docx")}
                      >
                        <FileText className="w-4 h-4" />
                        Dokumen
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                          field.value === "pptx"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:bg-muted"
                        )}
                        onClick={() => field.onChange("pptx")}
                      >
                        <Presentation className="w-4 h-4" />
                        Slide
                      </button>
                    </div>
                    <FormDescription>
                      Dokumen = teks/WORD, Slide = PowerPoint presentasi.
                    </FormDescription>
                  </FormItem>
                )}
              />


              <FormField
                control={form.control}
                name="instructionText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">
                      {copy.instructionLabel} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={copy.instructionPlaceholder}
                        className="min-h-[200px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{copy.instructionHelper}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Citation Format: hanya untuk academic, opsional */}
              {isAcademic && (
                <FormField
                  control={form.control}
                  name="citationFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base flex items-center gap-1.5">
                        <Quote className="w-4 h-4" />
                        Format Sitasi
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? "APA"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih format sitasi" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CITATION_FORMAT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex flex-col">
                                <span className="font-medium">{opt.label}</span>
                                <span className="text-xs text-muted-foreground">{opt.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Format default APA. Bisa diubah kapan saja di workspace.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Upload File: OPSIONAL */}
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-sm font-medium">
                  Upload File <span className="text-muted-foreground text-xs font-normal">(opsional)</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.createElement("input")
                      input.type = "file"
                      input.multiple = true
                      input.accept = ".pdf,.doc,.docx,.txt,.md"
                      input.onchange = (e) =>
                        handleFileUpload((e.target as HTMLInputElement).files)
                      input.click()
                    }}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload PDF / DOC / TXT
                  </Button>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {uploadedFiles.map((name, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2"
                      >
                        <span className="truncate flex-1">{name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="shrink-0 hover:text-destructive transition-colors"
                          aria-label={`Hapus ${name}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{copy.uploadHelper}</p>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              size="lg"
              className={cn(
                "w-full font-medium shadow-md",
                isAcademic
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 shadow-indigo-600/20"
                  : "bg-gradient-to-r from-[#2D79FF] to-[#8E54E9] hover:opacity-90 shadow-[#2D79FF]/20"
              )}
              disabled={createProject.isPending || !form.formState.isValid}
            >
              {createProject.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Membuat {copy.workspaceLabel}…
                </>
              ) : (
                <>
                  <FilePlus2 className="w-5 h-5 mr-2" />
                  {copy.cta}
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Setelah dibuat, Teora akan membuka workspace {copy.workspaceLabel} Anda.
            </p>
          </div>
        </form>
      </Form>
    </div>
  )
}
