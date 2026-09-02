import { Router, type IRouter } from "express";
import { eq, desc, and, isNull } from "drizzle-orm";
import { db, shareTokensTable, projectsTable, documentVersionsTable, documentsTable } from "@workspace/db";

const router: IRouter = Router();

// GET /shared/:token — public access to shared projects
router.get("/shared/:token", async (req, res): Promise<void> => {
  const { token } = req.params;

  const [shareToken] = await db
    .select()
    .from(shareTokensTable)
    .where(eq(shareTokensTable.token, token));

  if (!shareToken) {
    res.status(404).json({ error: "Invalid or expired share link" });
    return;
  }

  if (shareToken.expiresAt && new Date(shareToken.expiresAt) < new Date()) {
    res.status(404).json({ error: "Share link has expired" });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, shareToken.projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  let latestDocument: string | null = null;

  if (shareToken.accessMode === "view" || shareToken.accessMode === "edit") {
    // Try active document first
    const [activeDoc] = await db
      .select()
      .from(documentsTable)
      .where(and(eq(documentsTable.projectId, project.id), eq(documentsTable.isActive, true)));

    if (activeDoc) {
      const [latest] = await db
        .select({ content: documentVersionsTable.content })
        .from(documentVersionsTable)
        .where(eq(documentVersionsTable.documentId, activeDoc.id))
        .orderBy(desc(documentVersionsTable.versionNumber))
        .limit(1);
      latestDocument = latest?.content ?? null;
    }

    // Fall back to any document
    if (!latestDocument) {
      const [anyDoc] = await db
        .select()
        .from(documentsTable)
        .where(eq(documentsTable.projectId, project.id))
        .orderBy(documentsTable.orderIndex)
        .limit(1);

      if (anyDoc) {
        const [latest] = await db
          .select({ content: documentVersionsTable.content })
          .from(documentVersionsTable)
          .where(eq(documentVersionsTable.documentId, anyDoc.id))
          .orderBy(desc(documentVersionsTable.versionNumber))
          .limit(1);
        latestDocument = latest?.content ?? null;
      }
    }

    // Legacy fallback: project-level versions
    if (!latestDocument) {
      const [latest] = await db
        .select({ content: documentVersionsTable.content })
        .from(documentVersionsTable)
        .where(
          and(
            eq(documentVersionsTable.projectId, project.id),
            isNull(documentVersionsTable.documentId)
          )
        )
        .orderBy(desc(documentVersionsTable.versionNumber))
        .limit(1);
      latestDocument = latest?.content ?? null;
    }
  }

  res.json({
    id: project.id,
    title: project.title,
    status: project.status,
    subject: project.subject ?? null,
    taskType: project.taskType ?? null,
    latestDocument,
    accessMode: shareToken.accessMode,
    ownerEmail: "[Owner]", // Never expose real email in public endpoint
    createdAt: project.createdAt,
  });
});

export default router;
