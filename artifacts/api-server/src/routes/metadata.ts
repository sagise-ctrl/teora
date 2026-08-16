import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, projectMetadataTable } from "@workspace/db";
import { GetProjectMetadataParams } from "@workspace/api-zod";
import { requireProjectOwnership } from "../lib/ownership";

const router: IRouter = Router();

// GET /projects/:projectId/metadata
router.get("/projects/:projectId/metadata", async (req, res): Promise<void> => {
  const params = GetProjectMetadataParams.safeParse(req.params);
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

  const [metadata] = await db
    .select()
    .from(projectMetadataTable)
    .where(eq(projectMetadataTable.projectId, params.data.projectId));

  if (!metadata) {
    res.status(404).json({ error: "No metadata yet" });
    return;
  }

  res.json({
    ...metadata,
    detectedTitle: metadata.detectedTitle ?? null,
    subject: metadata.subject ?? null,
    taskType: metadata.taskType ?? null,
    citationFormat: metadata.citationFormat ?? null,
    language: metadata.language ?? null,
    outline: metadata.outline ?? null,
    contextSummary: metadata.contextSummary ?? null,
  });
});

export default router;
