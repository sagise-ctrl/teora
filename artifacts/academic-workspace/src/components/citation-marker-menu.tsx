import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"
import {
  useListCitations,
  useUpdateCitation,
  useDeleteCitation,
  useListReferences,
  type ReferenceCitation,
} from "../lib/api-client-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowRightLeft, ExternalLink, Trash2 } from "lucide-react"

interface CitationMarkerMenuProps {
  projectId: number
  citationId: number
  onClose: () => void
}

/**
 * DECISION 014 Phase 2 — Citation action panel.
 *
 * Opens after user clicks a `<sup data-citation-id>` marker in the Preview tab.
 * Shows the citation's reference (read-only) + two actions:
 *   - Pindahkan → modal to edit paragraphIndex + offsetInParagraph
 *   - Hapus → confirmation modal → DELETE /citations/:id
 *
 * Backend `PATCH /citations/:id` (UpdateCitationRequest) does NOT support
 * changing `referenceId` — that would require a new endpoint. Out of scope for
 * Phase 2; menu deliberately omits "Edit Referensi".
 *
 * On any successful mutation, the preview + bibliography queries are invalidated
 * so the Preview tab re-renders with the new layout.
 */
export function CitationMarkerMenu({
  projectId,
  citationId,
  onClose,
}: CitationMarkerMenuProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [moveOpen, setMoveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: citations } = useListCitations(projectId)
  const { data: references } = useListReferences(projectId)
  const updateCitation = useUpdateCitation()
  const deleteCitation = useDeleteCitation()

  const citation: ReferenceCitation | undefined = citations?.find(
    (c) => c.id === citationId
  )
  const reference = references?.find((r) => r.id === citation?.referenceId)

  // ESC closes the panel.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  if (!citation) {
    // Citation might have been deleted while the panel was open; close cleanly.
    setTimeout(onClose, 0)
    return null
  }

  const handleDelete = async () => {
    try {
      await deleteCitation.mutateAsync({
        projectId,
        citationId,
      })
      toast({ title: "Sitasi dihapus", description: "Marker telah dihapus dari dokumen." })
      queryClient.invalidateQueries({ queryKey: ["citations", projectId] })
      queryClient.invalidateQueries({ queryKey: ["documentPreview", projectId] })
      queryClient.invalidateQueries({ queryKey: ["bibliography", projectId] })
      setDeleteOpen(false)
      onClose()
    } catch (err) {
      toast({
        title: "Gagal menghapus sitasi",
        description: err instanceof Error ? err.message : "Terjadi kesalahan.",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Dialog
        open={!moveOpen && !deleteOpen}
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              Detail Sitasi
            </DialogTitle>
            <DialogDescription>
              Marker: <code className="text-xs">{citation.formatMarker}</code>
              {" · "}
              Paragraph {citation.paragraphIndex}
              {", "}offset {citation.offsetInParagraph}
            </DialogDescription>
          </DialogHeader>

          {reference && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm space-y-1">
              <div className="font-medium text-foreground">
                {reference.title || "(tanpa judul)"}
              </div>
              {reference.authors && (
                <div className="text-muted-foreground">{reference.authors}</div>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {reference.year && <span>{reference.year}</span>}
                {reference.journal && <span>· {reference.journal}</span>}
                {reference.doi && (
                  <a
                    href={`https://doi.org/${reference.doi}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    DOI <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              {citation.placementReason && (
                <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                  Alasan: {citation.placementReason}
                </div>
              )}
            </div>
          )}

          {!reference && (
            <Alert>
              <AlertDescription>
                Referensi untuk sitasi ini tidak ditemukan (mungkin telah dihapus).
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => setMoveOpen(true)}
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Pindahkan posisi
            </Button>
            <Button
              variant="outline"
              className="justify-start text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Hapus sitasi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MoveCitationDialog
        open={moveOpen}
        onOpenChange={(o) => {
          setMoveOpen(o)
          if (!o) setDeleteOpen(false)
        }}
        projectId={projectId}
        citation={citation}
        onMoved={() => {
          queryClient.invalidateQueries({ queryKey: ["citations", projectId] })
          queryClient.invalidateQueries({ queryKey: ["documentPreview", projectId] })
          setMoveOpen(false)
          onClose()
        }}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus sitasi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Marker <code className="text-xs">{citation.formatMarker}</code> akan dihapus
              dari Preview dan tidak lagi muncul di Daftar Pustaka.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

interface MoveCitationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  citation: ReferenceCitation
  onMoved: () => void
}

function MoveCitationDialog({
  open,
  onOpenChange,
  projectId,
  citation,
  onMoved,
}: MoveCitationDialogProps) {
  const { toast } = useToast()
  const updateCitation = useUpdateCitation()
  const [paragraphIndex, setParagraphIndex] = useState(
    String(citation.paragraphIndex)
  )
  const [offsetInParagraph, setOffsetInParagraph] = useState(
    String(citation.offsetInParagraph)
  )
  const [submitting, setSubmitting] = useState(false)

  // Reset when re-opened for a different citation.
  useEffect(() => {
    if (open) {
      setParagraphIndex(String(citation.paragraphIndex))
      setOffsetInParagraph(String(citation.offsetInParagraph))
    }
  }, [open, citation])

  const handleSubmit = async () => {
    const newParagraph = Number(paragraphIndex)
    const newOffset = Number(offsetInParagraph)
    if (!Number.isInteger(newParagraph) || newParagraph < 0) {
      toast({
        title: "Nomor paragraf tidak valid",
        description: "Gunakan bilangan bulat >= 0.",
        variant: "destructive",
      })
      return
    }
    if (!Number.isInteger(newOffset) || newOffset < 0) {
      toast({
        title: "Offset tidak valid",
        description: "Gunakan bilangan bulat >= 0.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      await updateCitation.mutateAsync({
        projectId,
        citationId: citation.id,
        data: {
          paragraphIndex: newParagraph,
          offsetInParagraph: newOffset,
        },
      })
      toast({
        title: "Sitasi dipindahkan",
        description: `Sekarang di paragraf ${newParagraph}, offset ${newOffset}.`,
      })
      onMoved()
    } catch (err) {
      toast({
        title: "Gagal memindahkan sitasi",
        description: err instanceof Error ? err.message : "Terjadi kesalahan.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pindahkan sitasi</DialogTitle>
          <DialogDescription>
            Geser marker ini ke paragraf lain atau ubah posisi karakter dalam paragraf.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="paragraph-index">Nomor paragraf</Label>
            <Input
              id="paragraph-index"
              type="number"
              min={0}
              value={paragraphIndex}
              onChange={(e) => setParagraphIndex(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="offset-in-paragraph">Offset dalam paragraf</Label>
            <Input
              id="offset-in-paragraph"
              type="number"
              min={0}
              value={offsetInParagraph}
              onChange={(e) => setOffsetInParagraph(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Posisi karakter (0 = awal paragraf). Teks akan pindah otomatis saat Preview diperbarui.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
