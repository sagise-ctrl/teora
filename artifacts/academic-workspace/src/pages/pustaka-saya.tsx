import { useState, useMemo } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Edit3,
  Copy,
  FolderPlus,
  X,
  Loader2,
  AlertCircle,
  Check,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useListAccountReferences,
  useCreateAccountReference,
  useUpdateAccountReference,
  useDeleteAccountReference,
  useAssignAccountReference,
  useImportAccountReferences,
  useListProjects,
  useSearchReferences,
  type AccountReference,
  type AccountReferenceInput,
  type AccountReferenceSource,
  type CrossRefSearchResult,
  type SearchReferencesParams,
} from "../lib/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

/** Source badge colours */
const SOURCE_COLORS: Record<string, string> = {
  manual: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  crossref: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  file: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  crossref: "CrossRef",
  file: "Upload",
};

type FilterSource = "all" | AccountReferenceSource;

/** Build IEEE marker string for a single reference */
function buildCiteKey(ref: AccountReference, index: number): string {
  const authorPart = ref.authors
    ? ref.authors.split(",")[0].trim()
    : "Anon";
  return `[${index}]`;
}

/** Format author string for display — truncate to first author + "et al." */
function formatAuthors(authors: string | null | undefined): string {
  if (!authors) return "";
  const parts = authors.split(",").map((a) => a.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} et al.`;
}

// ─── Add / Edit Manual Dialog ─────────────────────────────────────────────────

interface ManualFormState {
  title: string;
  authors: string;
  year: string;
  journal: string;
  volume: string;
  issue: string;
  doi: string;
  url: string;
}

const EMPTY_FORM: ManualFormState = {
  title: "",
  authors: "",
  year: "",
  journal: "",
  volume: "",
  issue: "",
  doi: "",
  url: "",
};

function ManualDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: AccountReference | null;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const create = useCreateAccountReference();
  const update = useUpdateAccountReference();
  const [form, setForm] = useState<ManualFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Populate form when opening for edit
  const isEdit = editing !== null;
  const handleOpenChange = (o: boolean) => {
    if (o) {
      setForm(
        isEdit
          ? {
              title: editing.title,
              authors: editing.authors ?? "",
              year: String(editing.year ?? ""),
              journal: editing.journal ?? "",
              volume: editing.volume ?? "",
              issue: editing.issue ?? "",
              doi: editing.doi ?? "",
              url: editing.url ?? "",
            }
          : EMPTY_FORM
      );
    }
    onOpenChange(o);
  };

  const set = (field: keyof ManualFormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast({ title: "Judul wajib diisi.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit) {
        await update.mutateAsync({
          id: editing.id,
          data: {
            title: form.title.trim(),
            authors: form.authors.trim() || undefined,
            year: form.year ? Number(form.year) : undefined,
            journal: form.journal.trim() || undefined,
            volume: form.volume.trim() || undefined,
            issue: form.issue.trim() || undefined,
            doi: form.doi.trim() || undefined,
            url: form.url.trim() || undefined,
          },
        });
        toast({ title: "Referensi diperbarui." });
      } else {
        await create.mutateAsync({
          data: {
            title: form.title.trim(),
            authors: form.authors.trim() || undefined,
            year: form.year ? Number(form.year) : undefined,
            journal: form.journal.trim() || undefined,
            volume: form.volume.trim() || undefined,
            issue: form.issue.trim() || undefined,
            doi: form.doi.trim() || undefined,
            url: form.url.trim() || undefined,
            source: "manual",
          },
        });
        toast({ title: "Referensi ditambahkan." });
      }
      onSuccess();
      handleOpenChange(false);
    } catch (err) {
      toast({
        title: isEdit ? "Gagal memperbarui" : "Gagal menambahkan",
        description: err instanceof Error ? err.message : "Terjadi kesalahan.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Referensi" : "Tambah Referensi Manual"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ubah informasi referensimu."
              : "Masukkan detail pustaka secara manual."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="ref-title">Judul *</Label>
            <Input
              id="ref-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Contoh: The Impact of AI on Education"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ref-authors">Penulis</Label>
            <Input
              id="ref-authors"
              value={form.authors}
              onChange={(e) => set("authors", e.target.value)}
              placeholder="Contoh: John Doe, Jane Smith"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ref-year">Tahun</Label>
              <Input
                id="ref-year"
                type="number"
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
                placeholder="2024"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ref-journal">Jurnal / Publikasi</Label>
              <Input
                id="ref-journal"
                value={form.journal}
                onChange={(e) => set("journal", e.target.value)}
                placeholder="Nature"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ref-volume">Volume</Label>
              <Input
                id="ref-volume"
                value={form.volume}
                onChange={(e) => set("volume", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ref-issue">Issue</Label>
              <Input
                id="ref-issue"
                value={form.issue}
                onChange={(e) => set("issue", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ref-doi">DOI</Label>
            <Input
              id="ref-doi"
              value={form.doi}
              onChange={(e) => set("doi", e.target.value)}
              placeholder="10.1000/example"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ref-url">URL</Label>
            <Input
              id="ref-url"
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Simpan" : "Tambah"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── CrossRef Search Dialog ───────────────────────────────────────────────────

function CrossRefDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState<Set<string>>(new Set());
  const [imported, setImported] = useState<Set<string>>(new Set());

  const search = useSearchReferences({ q: query, rows: 20 });
  const importRefs = useImportAccountReferences();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || query.trim().length < 3) return;
    setSearching(true);
    search.refetch().finally(() => setSearching(false));
  };

  const handleImport = async (result: CrossRefSearchResult) => {
    const key = result.doi ?? String(Math.random());
    if (imported.has(key)) return;
    setImporting((prev) => new Set(prev).add(key));
    try {
      await importRefs.mutateAsync({
        data: { dois: result.doi ? [result.doi] : [] },
      });
      setImported((prev) => new Set(prev).add(key));
      toast({ title: `"${result.title?.slice(0, 60)}..." ditambahkan.` });
    } catch {
      toast({ title: "Gagal mengimpor referensi.", variant: "destructive" });
    } finally {
      setImporting((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (o) {
      setQuery("");
      setImported(new Set());
      queryClient.removeQueries({ queryKey: ["/api/references/search"] });
    }
    onOpenChange(o);
  };

  const results: CrossRefSearchResult[] = search.data?.results ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cari di CrossRef</DialogTitle>
          <DialogDescription>
            Cari pustaka berdasarkan judul, penulis, atau kata kunci.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Contoh: machine learning education"
            autoFocus
          />
          <Button type="submit" disabled={searching || !query.trim()}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cari"}
          </Button>
        </form>

        {search.isError && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            Gagal mengambil hasil dari CrossRef.
          </div>
        )}

        {search.isSuccess && results.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Tidak ada hasil untuk "{query}".
          </p>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {search.data?.totalResults} hasil · klik untuk menambahkan
            </p>
            {results.map((r, i) => {
              const key = r.doi ?? String(i);
              const done = imported.has(key);
              const busy = importing.has(key);
              return (
                <Card
                  key={key}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => !done && !busy && handleImport(r)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm leading-snug line-clamp-2">
                          {r.title ?? "(tanpa judul)"}
                        </p>
                        {r.authors && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {formatAuthors(r.authors)}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {r.year && <span>{r.year}</span>}
                          {r.journal && <span>· {r.journal}</span>}
                          {r.volume && <span>· Vol. {r.volume}</span>}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {done ? (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Check className="w-3 h-3" /> Ditambahkan
                          </Badge>
                        ) : busy ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Button size="sm" variant="outline">
                            <Plus className="w-3 h-3 mr-1" /> Tambah
                          </Button>
                        )}
                      </div>
                    </div>
                    {r.doi && (
                      <a
                        href={`https://doi.org/${r.doi}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        DOI: {r.doi} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Tutup
          </Button>
          {imported.size > 0 && (
            <Button
              onClick={() => {
                onSuccess();
                handleOpenChange(false);
              }}
            >
              Selesai ({imported.size} ditambahkan)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Import DOI Dialog ────────────────────────────────────────────────────────

function ImportDoiDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [dois, setDois] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    failed: number;
  } | null>(null);

  const importRefs = useImportAccountReferences();

  const handleSubmit = async () => {
    const list = dois
      .split(/[\n,]+/)
      .map((d) => d.trim())
      .filter(Boolean);
    if (list.length === 0) {
      toast({ title: "Masukkan setidaknya satu DOI.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await importRefs.mutateAsync({ data: { dois: list } });
      const r = res;
      setResult({
        imported: r.imported?.length ?? 0,
        skipped: r.skipped?.length ?? 0,
        failed: r.failed?.length ?? 0,
      });
      if (r.imported?.length === 0 && r.skipped && r.skipped.length > 0) {
        toast({ title: "Semua DOI sudah ada di pustaka." });
      }
    } catch (err) {
      toast({
        title: "Gagal mengimpor DOI",
        description: err instanceof Error ? err.message : "Terjadi kesalahan.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (o) { setDois(""); setResult(null); }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import DOI</DialogTitle>
          <DialogDescription>
            Tempelkan satu atau lebih DOI (maksimal 50). Setiap DOI di baris
            terpisah atau dipisah koma.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="doi-list">DOI</Label>
          <textarea
            id="doi-list"
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={'10.1000/xyz123\n10.1000/abc456'}
            value={dois}
            onChange={(e) => setDois(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Contoh: <code className="text-xs">10.1038/nature12373</code>
          </p>
        </div>

        {result && (
          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>{result.imported} berhasil diimpor</span>
            </div>
            {result.skipped > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>{result.skipped} sudah ada (dilewati)</span>
              </div>
            )}
            {result.failed > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span>{result.failed} gagal</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Tutup
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Impor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assign Dialog ───────────────────────────────────────────────────────────

function AssignDialog({
  open,
  onOpenChange,
  reference,
  onAssigned,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reference: AccountReference | null;
  onAssigned: () => void;
}) {
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const projects = useListProjects({});
  const assign = useAssignAccountReference();

  const projectList = projects.data ?? [];

  const handleAssign = async () => {
    const pid = Number(selectedProjectId);
    if (!pid || !reference) return;
    setSubmitting(true);
    try {
      await assign.mutateAsync({ id: reference.id, data: { projectId: pid } });
      toast({ title: "Referensi ditambahkan ke proyek." });
      onAssigned();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Gagal menambahkan ke proyek",
        description: err instanceof Error ? err.message : "Terjadi kesalahan.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (o) setSelectedProjectId("");
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Tambah ke Proyek</DialogTitle>
          <DialogDescription>
            Pilih proyek untuk "{reference?.title?.slice(0, 40)}
            {reference && reference.title && reference.title.length > 40 ? "…" : ""}".
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="assign-project">Proyek</Label>
          <select
            id="assign-project"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            <option value="">— Pilih proyek —</option>
            {projectList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Batal
          </Button>
          <Button onClick={handleAssign} disabled={!selectedProjectId || submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Tambahkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirmation ─────────────────────────────────────────────────────

function DeleteDialog({
  open,
  onOpenChange,
  reference,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reference: AccountReference | null;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const deleteRef = useDeleteAccountReference();

  const handleDelete = async () => {
    if (!reference) return;
    setSubmitting(true);
    try {
      await deleteRef.mutateAsync({ id: reference.id });
      toast({ title: "Referensi dihapus." });
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Gagal menghapus",
        description: err instanceof Error ? err.message : "Terjadi kesalahan.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus referensi ini?</AlertDialogTitle>
          <AlertDialogDescription>
            "{reference?.title}" akan dihapus dari Pustaka Saya. Tindakan ini
            tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PustakaSaya() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState<FilterSource>("all");
  const [manualOpen, setManualOpen] = useState(false);
  const [crossRefOpen, setCrossRefOpen] = useState(false);
  const [importDoiOpen, setImportDoiOpen] = useState(false);
  const [editingRef, setEditingRef] = useState<AccountReference | null>(null);
  const [assignRef, setAssignRef] = useState<AccountReference | null>(null);
  const [deleteRef, setDeleteRef] = useState<AccountReference | null>(null);

  const refs = useListAccountReferences({});

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (refs.data ?? []).filter((r) => {
      if (filterSource !== "all" && r.source !== filterSource) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.authors?.toLowerCase().includes(q) ||
        r.journal?.toLowerCase().includes(q) ||
        r.doi?.toLowerCase().includes(q)
      );
    });
  }, [refs.data, search, filterSource]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["accountReferences"] });
  };

  const handleCopyCite = (ref: AccountReference, index: number) => {
    const key = buildCiteKey(ref, index);
    navigator.clipboard.writeText(key).then(() => {
      toast({ title: `Copied: ${key}` });
    }).catch(() => {
      toast({ title: "Gagal menyalin.", variant: "destructive" });
    });
  };

  const filterChips: { value: FilterSource; label: string }[] = [
    { value: "all", label: "Semua" },
    { value: "manual", label: "Manual" },
    { value: "crossref", label: "CrossRef" },
    { value: "file", label: "Upload" },
  ];

  const isEmpty = filtered.length === 0 && !refs.isLoading;
  const isSearching = search !== "" || filterSource !== "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight">Pustaka Saya</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {refs.data
              ? `${refs.data.length} referensi di pustaka Anda`
              : "Memuat..."}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setManualOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Manual
          </Button>
          <Button variant="outline" onClick={() => setCrossRefOpen(true)}>
            <Search className="w-4 h-4 mr-2" />
            Cari di CrossRef
          </Button>
          <Button onClick={() => setImportDoiOpen(true)}>
            <BookOpen className="w-4 h-4 mr-2" />
            Import DOI
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari judul, penulis, jurnal, atau DOI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filterChips.map((chip) => (
            <Button
              key={chip.value}
              variant={filterSource === chip.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterSource(chip.value)}
              className="shrink-0"
            >
              {chip.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Reference List */}
      {refs.isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!refs.isLoading && isEmpty && (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold mb-2">
              {isSearching ? "Tidak ditemukan" : "Pustaka kosong"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isSearching
                ? `Tidak ada referensi yang cocok dengan "${search}".`
                : "Mulai tambahkan referensi ke pustaka Anda."}
            </p>
            {!isSearching && (
              <Button onClick={() => setManualOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Referensi Pertama
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!refs.isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((ref, index) => (
            <Card key={ref.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-medium text-sm leading-snug line-clamp-2">
                        {ref.title}
                      </h3>
                      <Badge
                        variant="secondary"
                        className={`shrink-0 text-xs ${SOURCE_COLORS[ref.source ?? "manual"]}`}
                      >
                        {SOURCE_LABELS[ref.source ?? "manual"]}
                      </Badge>
                    </div>

                    {ref.authors && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {formatAuthors(ref.authors)}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                      {ref.year && <span>{ref.year}</span>}
                      {ref.journal && <span>· {ref.journal}</span>}
                      {ref.volume && <span>· Vol. {ref.volume}</span>}
                      {ref.issue && <span>({ref.issue})</span>}
                      {ref.doi && (
                        <a
                          href={`https://doi.org/${ref.doi}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 hover:text-foreground"
                        >
                          DOI <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 justify-start"
                      onClick={() => handleCopyCite(ref, index + 1)}
                      title="Salin kode sitasi"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      <span className="text-xs">{buildCiteKey(ref, index + 1)}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => setAssignRef(ref)}
                      title="Tambah ke proyek"
                    >
                      <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
                      <span className="text-xs">Proyek</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => setEditingRef(ref)}
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                      <span className="text-xs">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-destructive hover:text-destructive"
                      onClick={() => setDeleteRef(ref)}
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      <span className="text-xs">Hapus</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <ManualDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        editing={null}
        onSuccess={invalidate}
      />
      <ManualDialog
        open={!!editingRef}
        onOpenChange={(o) => { if (!o) setEditingRef(null); }}
        editing={editingRef}
        onSuccess={() => { setEditingRef(null); invalidate(); }}
      />
      <CrossRefDialog
        open={crossRefOpen}
        onOpenChange={setCrossRefOpen}
        onSuccess={invalidate}
      />
      <ImportDoiDialog
        open={importDoiOpen}
        onOpenChange={setImportDoiOpen}
        onSuccess={() => { invalidate(); }}
      />
      <AssignDialog
        open={!!assignRef}
        onOpenChange={(o) => { if (!o) setAssignRef(null); }}
        reference={assignRef}
        onAssigned={() => { setAssignRef(null); }}
      />
      <DeleteDialog
        open={!!deleteRef}
        onOpenChange={(o) => { if (!o) setDeleteRef(null); }}
        reference={deleteRef}
        onDeleted={() => { setDeleteRef(null); invalidate(); }}
      />
    </div>
  );
}
