import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, commentsTable } from "@workspace/db";
import { requireProjectWriteAccess } from "../lib/ownership.js";
import { sanitizeInstructionText } from "../lib/prompt-injection.js";

const router: IRouter = Router();

// GET /projects/:projectId/documents/:documentId/comments
router.get("/projects/:projectId/documents/:documentId/comments", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  const documentId = Number(req.params.documentId);
  if (!projectId || isNaN(projectId) || !documentId || isNaN(documentId)) {
    res.status(400).json({ error: "ID proyek atau dokumen tidak valid." });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const ok = await requireProjectWriteAccess(projectId, req.user.id, res);
  if (!ok) return;

  const comments = await db
    .select()
    .from(commentsTable)
    .where(and(eq(commentsTable.projectId, projectId), eq(commentsTable.documentId, documentId)))
    .orderBy(desc(commentsTable.createdAt));

  res.json(comments);
});

// POST /projects/:projectId/documents/:documentId/comments
router.post("/projects/:projectId/documents/:documentId/comments", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  const documentId = Number(req.params.documentId);
  if (!projectId || isNaN(projectId) || !documentId || isNaN(documentId)) {
    res.status(400).json({ error: "ID proyek atau dokumen tidak valid." });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const ok = await requireProjectWriteAccess(projectId, req.user.id, res);
  if (!ok) return;

  const { content, quoteText, offsetStart, offsetEnd, parentId } = req.body as {
    content?: string;
    quoteText?: string;
    offsetStart?: number;
    offsetEnd?: number;
    parentId?: number;
  };

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const sanitizedContent = sanitizeInstructionText(content.trim());
  const sanitizedQuoteText = quoteText ? sanitizeInstructionText(quoteText.trim()) : null;
  const userName = req.user.email?.split("@")[0] ?? "Anonymous";

  const [comment] = await db
    .insert(commentsTable)
    .values({
      projectId,
      documentId,
      userId: req.user.id,
      userName,
      content: sanitizedContent,
      quoteText: sanitizedQuoteText,
      offsetStart: offsetStart ?? null,
      offsetEnd: offsetEnd ?? null,
      parentId: parentId ?? null,
    })
    .returning();

  res.status(201).json(comment);
});

// PATCH /projects/:projectId/comments/:commentId
router.patch("/projects/:projectId/comments/:commentId", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  const commentId = Number(req.params.commentId);
  if (!projectId || isNaN(projectId) || !commentId || isNaN(commentId)) {
    res.status(400).json({ error: "ID proyek atau komentar tidak valid." });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const ok = await requireProjectWriteAccess(projectId, req.user.id, res);
  if (!ok) return;

  const [existing] = await db
    .select()
    .from(commentsTable)
    .where(and(eq(commentsTable.id, commentId), eq(commentsTable.projectId, projectId)));

  if (!existing) {
    res.status(404).json({ error: "Komentar tidak ditemukan." });
    return;
  }

  // Only the comment author can edit content; owner can resolve
  const { content, resolved } = req.body as { content?: string; resolved?: boolean };

  if (content !== undefined) {
    if (existing.userId !== req.user.id) {
      res.status(403).json({ error: "Anda hanya bisa edit komentar sendiri." });
      return;
    }
    if (typeof content !== "string" || content.trim().length === 0) {
      res.status(400).json({ error: "Komentar tidak boleh kosong." });
      return;
    }
  }

  if (resolved !== undefined && resolved !== existing.resolved) {
    // Owner can resolve/unresolve any comment
    const [updated] = await db
      .update(commentsTable)
      .set({
        resolved,
        resolvedBy: resolved ? req.user.id : null,
        resolvedAt: resolved ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(and(eq(commentsTable.id, commentId), eq(commentsTable.projectId, projectId)))
      .returning();
    res.json(updated);
    return;
  }

  if (content !== undefined) {
    const sanitizedContent = sanitizeInstructionText(content.trim());
    const [updated] = await db
      .update(commentsTable)
      .set({ content: sanitizedContent, updatedAt: new Date() })
      .where(and(eq(commentsTable.id, commentId), eq(commentsTable.projectId, projectId)))
      .returning();
    res.json(updated);
    return;
  }

  res.json(existing);
});

// DELETE /projects/:projectId/comments/:commentId
router.delete("/projects/:projectId/comments/:commentId", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  const commentId = Number(req.params.commentId);
  if (!projectId || isNaN(projectId) || !commentId || isNaN(commentId)) {
    res.status(400).json({ error: "ID proyek atau komentar tidak valid." });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const ok = await requireProjectWriteAccess(projectId, req.user.id, res);
  if (!ok) return;

  const [existing] = await db
    .select()
    .from(commentsTable)
    .where(and(eq(commentsTable.id, commentId), eq(commentsTable.projectId, projectId)));

  if (!existing) {
    res.status(404).json({ error: "Komentar tidak ditemukan." });
    return;
  }

  // Only the comment author can delete their comment
  if (existing.userId !== req.user.id) {
    res.status(403).json({ error: "Anda hanya bisa hapus komentar sendiri." });
    return;
  }

  await db
    .delete(commentsTable)
    .where(and(eq(commentsTable.id, commentId), eq(commentsTable.projectId, projectId)));

  res.status(204).send();
});

export default router;
