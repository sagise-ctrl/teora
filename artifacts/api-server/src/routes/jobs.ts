import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, jobsTable } from "@workspace/db";
import { ListJobsParams } from "@workspace/api-zod";
import { requireProjectOwnership } from "../lib/ownership.js";

const router: IRouter = Router();

// GET /projects/:projectId/jobs
router.get("/projects/:projectId/jobs", async (req, res): Promise<void> => {
  const params = ListJobsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user.id, res);
  if (!ok) return;

  const jobs = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.projectId, params.data.projectId))
    .orderBy(desc(jobsTable.createdAt));

  res.json(
    jobs.map((j) => ({
      ...j,
      result: j.result ?? null,
      errorMessage: j.errorMessage ?? null,
    }))
  );
});

export default router;
