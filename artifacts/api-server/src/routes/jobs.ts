import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, jobsTable } from "@workspace/db";
import { ListJobsParams } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /projects/:projectId/jobs
router.get("/projects/:projectId/jobs", async (req, res): Promise<void> => {
  const params = ListJobsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

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
