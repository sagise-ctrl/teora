import { Router, type IRouter } from "express";
import { eq, desc, and, isNull, sql, count } from "drizzle-orm";
import {
  db,
  documentVersionsTable,
  documentsTable,
  projectsTable,
  projectMetadataTable,
  referenceCitationsTable,
  referencesTable,
} from "@workspace/db";
import {
  ListDocumentsParams,
  CreateDocumentParams,
  CreateDocumentBody,
  GetLatestDocumentParams,
  GetDocumentParams,
  UpdateDocumentParams,
  UpdateDocumentBody,
  DeleteDocumentParams,
  GetDocumentPreviewParams,
  GetBibliographyParams,
} from "@workspace/api-zod";
import { requireProjectOwnership } from "../lib/ownership.js";
import { logActivity } from "../lib/activity.js";
import {
  renderDocument,
  type CitationForRender,
} from "../lib/citation-rendering.js";
import {
  type CitationFormat,
  formatBibliography,
} from "../lib/citation.js";

const router: IRouter = Router();

// GET /projects/:projectId/documents — list all documents with versions
router.get("/projects/:projectId/documents", async (req, res): Promise<void> => {
  const params = ListDocumentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user.id, res);
  if (!ok) return;

  const projectId = params.data.projectId;

  // Get all documents for this project
  const docs = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.projectId, projectId))
    .orderBy(documentsTable.orderIndex, documentsTable.createdAt);

  // For each document, get its versions
  const docsWithVersions = await Promise.all(
    docs.map(async (doc) => {
      const versions = await db
        .select()
        .from(documentVersionsTable)
        .where(eq(documentVersionsTable.documentId, doc.id))
        .orderBy(desc(documentVersionsTable.versionNumber));

      return {
        ...doc,
        versions: versions.map((v) => ({
          ...v,
          outline: v.outline ?? null,
          changeDescription: v.changeDescription ?? null,
        })),
      };
    })
  );

  // Backward compat: if no documents exist, fall back to legacy project-level versions
  if (docsWithVersions.length === 0) {
    const legacyVersions = await db
      .select()
      .from(documentVersionsTable)
      .where(
        and(
          eq(documentVersionsTable.projectId, projectId),
          isNull(documentVersionsTable.documentId)
        )
      )
      .orderBy(desc(documentVersionsTable.versionNumber));

    if (legacyVersions.length > 0) {
      // Wrap legacy versions in a synthetic default document
      res.json([{
        id: 0,
        projectId,
        title: "Document 1",
        orderIndex: 0,
        isActive: true,
        createdAt: legacyVersions[legacyVersions.length - 1].createdAt,
        updatedAt: legacyVersions[0].createdAt,
        versions: legacyVersions.map((v) => ({
          ...v,
          outline: v.outline ?? null,
          changeDescription: v.changeDescription ?? null,
        })),
      }]);
      return;
    }

    res.json([]);
    return;
  }

  res.json(docsWithVersions);
});

// POST /projects/:projectId/documents — create a new document
router.post("/projects/:projectId/documents", async (req, res): Promise<void> => {
  const params = CreateDocumentParams.safeParse(req.params);
  const body = CreateDocumentBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user.id, res);
  if (!ok) return;

  const projectId = params.data.projectId;

  // Determine order index — append to end if not specified
  let orderIndex = body.data.orderIndex;
  if (orderIndex === undefined) {
    const [{ maxIdx }] = await db
      .select({ maxIdx: sql<number>`COALESCE(MAX(${documentsTable.orderIndex}), -1)` })
      .from(documentsTable)
      .where(eq(documentsTable.projectId, projectId));
    orderIndex = (maxIdx ?? -1) + 1;
  }

  const [doc] = await db
    .insert(documentsTable)
    .values({
      projectId,
      title: body.data.title,
      orderIndex,
      isActive: false, // New docs are not active by default
    })
    .returning();

  await logActivity(projectId, "document_created", `Created document: ${doc.title}`);

  res.status(201).json(doc);
});

// GET /projects/:projectId/documents/latest — latest from active document
router.get("/projects/:projectId/documents/latest", async (req, res): Promise<void> => {
  const params = GetLatestDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user.id, res);
  if (!ok) return;

  const projectId = params.data.projectId;

  // Try active document first
  const [activeDoc] = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.projectId, projectId), eq(documentsTable.isActive, true)));

  if (activeDoc) {
    const [version] = await db
      .select()
      .from(documentVersionsTable)
      .where(eq(documentVersionsTable.documentId, activeDoc.id))
      .orderBy(desc(documentVersionsTable.versionNumber))
      .limit(1);

    if (version) {
      res.json({
        ...version,
        outline: version.outline ?? null,
        changeDescription: version.changeDescription ?? null,
      });
      return;
    }
  }

  // Fall back to any document or legacy versions
  const [anyDoc] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.projectId, projectId))
    .orderBy(documentsTable.orderIndex)
    .limit(1);

  if (anyDoc) {
    const [version] = await db
      .select()
      .from(documentVersionsTable)
      .where(eq(documentVersionsTable.documentId, anyDoc.id))
      .orderBy(desc(documentVersionsTable.versionNumber))
      .limit(1);

    if (version) {
      res.json({
        ...version,
        outline: version.outline ?? null,
        changeDescription: version.changeDescription ?? null,
      });
      return;
    }
  }

  // Legacy fallback: project-level versions (no documentId)
  const [legacyVersion] = await db
    .select()
    .from(documentVersionsTable)
    .where(
      and(
        eq(documentVersionsTable.projectId, projectId),
        isNull(documentVersionsTable.documentId)
      )
    )
    .orderBy(desc(documentVersionsTable.versionNumber))
    .limit(1);

  if (legacyVersion) {
    res.json({
      ...legacyVersion,
      outline: legacyVersion.outline ?? null,
      changeDescription: legacyVersion.changeDescription ?? null,
    });
    return;
  }

  res.status(404).json({ error: "No document yet" });
});

// GET /projects/:projectId/documents/:documentId — get document with all versions
router.get("/projects/:projectId/documents/:documentId", async (req, res): Promise<void> => {
  const params = GetDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user.id, res);
  if (!ok) return;

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(
      and(
        eq(documentsTable.id, params.data.documentId),
        eq(documentsTable.projectId, params.data.projectId)
      )
    );

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const versions = await db
    .select()
    .from(documentVersionsTable)
    .where(eq(documentVersionsTable.documentId, doc.id))
    .orderBy(desc(documentVersionsTable.versionNumber));

  res.json({
    ...doc,
    versions: versions.map((v) => ({
      ...v,
      outline: v.outline ?? null,
      changeDescription: v.changeDescription ?? null,
    })),
  });
});

// PATCH /projects/:projectId/documents/:documentId — update document
router.patch("/projects/:projectId/documents/:documentId", async (req, res): Promise<void> => {
  const params = UpdateDocumentParams.safeParse(req.params);
  const body = UpdateDocumentBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user.id, res);
  if (!ok) return;

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(
      and(
        eq(documentsTable.id, params.data.documentId),
        eq(documentsTable.projectId, params.data.projectId)
      )
    );

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.data.title !== undefined) updates.title = body.data.title;
  if (body.data.orderIndex !== undefined) updates.orderIndex = body.data.orderIndex;
  if (body.data.isActive !== undefined) {
    updates.isActive = body.data.isActive;
    // If setting as active, unset other active documents
    if (body.data.isActive) {
      await db
        .update(documentsTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(documentsTable.projectId, params.data.projectId),
            sql`${documentsTable.id} != ${params.data.documentId}`
          )
        );
    }
  }

  const [updated] = await db
    .update(documentsTable)
    .set(updates)
    .where(eq(documentsTable.id, params.data.documentId))
    .returning();

  res.json(updated);
});

// DELETE /projects/:projectId/documents/:documentId — delete document and versions
router.delete("/projects/:projectId/documents/:documentId", async (req, res): Promise<void> => {
  const params = DeleteDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user.id, res);
  if (!ok) return;

  const projectId = params.data.projectId;
  const documentId = params.data.documentId;

  // Verify document belongs to project
  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(
      and(
        eq(documentsTable.id, documentId),
        eq(documentsTable.projectId, projectId)
      )
    );

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  // Count remaining documents — prevent deleting last one if it has content
  const [{ total }] = await db
    .select({ total: count() })
    .from(documentsTable)
    .where(eq(documentsTable.projectId, projectId));

  const [versionCount] = await db
    .select({ total: count() })
    .from(documentVersionsTable)
    .where(eq(documentVersionsTable.documentId, documentId));

  // Prevent deleting the only document if it has versions
  if (total === 1 && (versionCount?.total ?? 0) > 0) {
    res.status(400).json({
      error: "Cannot delete the last document with content. Delete its versions first.",
    });
    return;
  }

  // Delete versions first
  await db
    .delete(documentVersionsTable)
    .where(eq(documentVersionsTable.documentId, documentId));

  // Delete document
  await db.delete(documentsTable).where(eq(documentsTable.id, documentId));

  // If this was the active document, activate the first remaining document
  if (doc.isActive) {
    const [firstRemaining] = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.projectId, projectId))
      .orderBy(documentsTable.orderIndex)
      .limit(1);

    if (firstRemaining) {
      await db
        .update(documentsTable)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(documentsTable.id, firstRemaining.id));
    }
  }

  await logActivity(projectId, "document_deleted", `Deleted document: ${doc.title}`);

  res.status(204).send();
});

// GET /projects/:projectId/document/preview
// DECISION 014 Phase 2: Return document content with citation markers rendered
// inline + auto-generated bibliography. One endpoint so frontend doesn't need to
// merge content + citations + format on the client.
router.get("/projects/:projectId/document/preview", async (req, res): Promise<void> => {
  const params = GetDocumentPreviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user.id, res);
  if (!ok) return;

  const projectId = params.data.projectId;

  // 1. Get project + metadata for citationFormat (metadata takes precedence)
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  const [metadata] = await db
    .select()
    .from(projectMetadataTable)
    .where(eq(projectMetadataTable.projectId, projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const format = (metadata?.citationFormat ??
    project.citationFormat ??
    "APA") as CitationFormat;

  // 2. Get the latest document version (any document in this project)
  const [latest] = await db
    .select()
    .from(documentVersionsTable)
    .where(eq(documentVersionsTable.projectId, projectId))
    .orderBy(desc(documentVersionsTable.versionNumber))
    .limit(1);

  if (!latest) {
    res.json({
      paragraphs: [],
      bibliography: "",
      citationFormat: format,
      citationCount: 0,
    });
    return;
  }

  // 3. Get all citations + joined references
  const rows = await db
    .select({
      citation: referenceCitationsTable,
      reference: referencesTable,
    })
    .from(referenceCitationsTable)
    .innerJoin(
      referencesTable,
      eq(referenceCitationsTable.referenceId, referencesTable.id),
    )
    .where(eq(referenceCitationsTable.projectId, projectId));

  const citations: CitationForRender[] = rows.map(({ citation, reference }) => ({
    id: citation.id,
    referenceId: citation.referenceId,
    paragraphIndex: citation.paragraphIndex,
    offsetInParagraph: citation.offsetInParagraph,
    formatMarker: citation.formatMarker,
    placementReason: citation.placementReason ?? null,
    reference: {
      title: reference.title,
      authors: reference.authors,
      year: reference.year,
      journal: reference.journal,
      doi: reference.doi,
      url: reference.url,
    },
  }));

  // 4. Render the document
  const rendered = renderDocument({
    content: latest.content ?? "",
    citations,
    format,
    formatBibliographyFn: (refs) => formatBibliography(refs, format),
  });

  res.json({
    paragraphs: rendered.paragraphs,
    bibliography: rendered.bibliography,
    citationFormat: format,
    citationCount: rendered.citationCount,
  });
});

// GET /projects/:projectId/bibliography
// DECISION 014 Phase 2: Returns the CSL-formatted bibliography for the
// project. Reuses the same logic as POST /references/format but as a GET
// so React Query can cache it cleanly.
router.get("/projects/:projectId/bibliography", async (req, res): Promise<void> => {
  const params = GetBibliographyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user.id, res);
  if (!ok) return;

  const projectId = params.data.projectId;

  // Get format with same precedence as /preview
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  const [metadata] = await db
    .select()
    .from(projectMetadataTable)
    .where(eq(projectMetadataTable.projectId, projectId));

  const format = (metadata?.citationFormat ??
    project?.citationFormat ??
    "APA") as CitationFormat;

  // Get all references that have at least one citation
  const refs = await db
    .select({ reference: referencesTable })
    .from(referenceCitationsTable)
    .innerJoin(
      referencesTable,
      eq(referenceCitationsTable.referenceId, referencesTable.id),
    )
    .where(eq(referenceCitationsTable.projectId, projectId));

  // Deduplicate references
  const seen = new Set<number>();
  const uniqueRefs = refs
    .map((r) => r.reference)
    .filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .map((r) => ({
      title: r.title,
      authors: r.authors,
      year: r.year,
      journal: r.journal,
      volume: r.volume,
      issue: r.issue,
      doi: r.doi,
      url: r.url,
    }));

  const bibliography = formatBibliography(uniqueRefs, format);

  res.json({ bibliography, format });
});

export default router;
