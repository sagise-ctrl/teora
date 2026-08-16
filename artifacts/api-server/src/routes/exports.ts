import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, exportsTable, documentVersionsTable } from "@workspace/db";
import {
  ListExportsParams,
  CreateExportParams,
  CreateExportBody,
} from "@workspace/api-zod";
import { logActivity } from "../lib/activity";
import { requireProjectOwnership } from "../lib/ownership";
import path from "path";
import fs from "fs/promises";

const EXPORT_DIR = process.env.EXPORT_DIR ?? "/tmp/academic-workspace-exports";

const router: IRouter = Router();

// GET /projects/:projectId/exports
router.get("/projects/:projectId/exports", async (req, res): Promise<void> => {
  const params = ListExportsParams.safeParse(req.params);
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

  const exports = await db
    .select()
    .from(exportsTable)
    .where(eq(exportsTable.projectId, params.data.projectId))
    .orderBy(desc(exportsTable.createdAt));

  res.json(
    exports.map((e) => ({
      ...e,
      filePath: e.filePath ?? null,
    }))
  );
});

// POST /projects/:projectId/exports
router.post("/projects/:projectId/exports", async (req, res): Promise<void> => {
  const params = CreateExportParams.safeParse(req.params);
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

  const parsed = CreateExportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Get the document to export
  let doc;
  if (parsed.data.documentVersionId) {
    [doc] = await db
      .select()
      .from(documentVersionsTable)
      .where(eq(documentVersionsTable.id, parsed.data.documentVersionId));
  } else {
    [doc] = await db
      .select()
      .from(documentVersionsTable)
      .where(eq(documentVersionsTable.projectId, params.data.projectId))
      .orderBy(desc(documentVersionsTable.versionNumber))
      .limit(1);
  }

  if (!doc) {
    res.status(404).json({ error: "No document to export" });
    return;
  }

  await fs.mkdir(EXPORT_DIR, { recursive: true });

  const timestamp = Date.now();
  const filename = `export-${params.data.projectId}-v${doc.versionNumber}-${timestamp}.${parsed.data.format}`;
  const filePath = path.join(EXPORT_DIR, filename);

  // For now, markdown export is native; DOCX and PDF are saved as markdown
  // (full DOCX/PDF conversion would require additional libraries)
  await fs.writeFile(filePath, doc.content, "utf-8");

  const [exportRecord] = await db
    .insert(exportsTable)
    .values({
      projectId: params.data.projectId,
      format: parsed.data.format,
      status: "completed",
      filePath: `/api/exports/download/${filename}`,
    })
    .returning();

  await logActivity(
    params.data.projectId,
    "export_created",
    `Dokumen diekspor sebagai ${parsed.data.format.toUpperCase()}`
  );

  res.status(201).json({
    ...exportRecord,
    filePath: exportRecord.filePath ?? null,
  });
});

export default router;
