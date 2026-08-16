import { eq } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import type { Response } from "express";
import type { AuthUser } from "../middlewares/auth";

/**
 * Check that a project belongs to the authenticated user.
 * Sends 403 and returns null if not owner.
 */
export async function requireProjectOwnership(
  projectId: number,
  userId: string,
  res: Response
): Promise<boolean> {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return false;
  }

  if (project.userId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return false;
  }

  return true;
}
