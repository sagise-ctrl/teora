import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, activitiesTable } from "@workspace/db";
import { ListActivitiesParams } from "@workspace/api-zod";
import { requireProjectOwnership } from "../lib/ownership.js";

const router: IRouter = Router();

// GET /projects/:projectId/activities
router.get("/projects/:projectId/activities", async (req, res): Promise<void> => {
  const params = ListActivitiesParams.safeParse(req.params);
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

  const activities = await db
    .select()
    .from(activitiesTable)
    .where(eq(activitiesTable.projectId, params.data.projectId))
    .orderBy(desc(activitiesTable.createdAt));

  res.json(activities);
});

export default router;
