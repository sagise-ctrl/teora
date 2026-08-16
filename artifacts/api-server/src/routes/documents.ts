import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, documentVersionsTable } from "@workspace/db";
import {
  ListDocumentVersionsParams,
  GetLatestDocumentParams,
} from "@workspace/api-zod";
import { requireProjectOwnership } from "../lib/ownership";

const router: IRouter = Router();

// GET /projects/:projectId/documents
router.get("/projects/:projectId/documents", async (req, res): Promise<void> => {
  const params = ListDocumentVersionsParams.safeParse(req.params);
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

  const versions = await db
    .select()
    .from(documentVersionsTable)
    .where(eq(documentVersionsTable.projectId, params.data.projectId))
    .orderBy(desc(documentVersionsTable.versionNumber));

  res.json(
    versions.map((v) => ({
      ...v,
      outline: v.outline ?? null,
      changeDescription: v.changeDescription ?? null,
    }))
  );
});

// GET /projects/:projectId/documents/latest
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

  const [doc] = await db
    .select()
    .from(documentVersionsTable)
    .where(eq(documentVersionsTable.projectId, params.data.projectId))
    .orderBy(desc(documentVersionsTable.versionNumber))
    .limit(1);

  if (!doc) {
    res.status(404).json({ error: "No document yet" });
    return;
  }

  res.json({
    ...doc,
    outline: doc.outline ?? null,
    changeDescription: doc.changeDescription ?? null,
  });
});

export default router;
