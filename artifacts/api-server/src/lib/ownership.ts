import { eq, and } from "drizzle-orm";
import { db, projectsTable, projectMembersTable } from "@workspace/db";
import type { Response } from "express";
import type { AuthUser } from "../middlewares/auth.js";

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

/**
 * Check that a project is accessible by the authenticated user.
 * Allows: project owner OR project member (collaborator/viewer).
 * Sends 403 and returns null if not authorized.
 */
export async function requireProjectAccess(
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

  if (project.userId === userId) {
    return true;
  }

  const [member] = await db
    .select()
    .from(projectMembersTable)
    .where(
      and(
        eq(projectMembersTable.projectId, projectId),
        eq(projectMembersTable.userId, userId)
      )
    );

  if (!member) {
    res.status(403).json({ error: "Access denied" });
    return false;
  }

  return true;
}

/**
 * Check that a project is writable by the authenticated user.
 * Allows: project owner OR collaborator (NOT viewer).
 * Sends 403 and returns null if not authorized.
 */
export async function requireProjectWriteAccess(
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

  if (project.userId === userId) {
    return true;
  }

  const [member] = await db
    .select()
    .from(projectMembersTable)
    .where(
      and(
        eq(projectMembersTable.projectId, projectId),
        eq(projectMembersTable.userId, userId)
      )
    );

  if (!member) {
    res.status(403).json({ error: "Access denied" });
    return false;
  }

  if (member.role === "viewer") {
    res.status(403).json({ error: "Viewers cannot modify content" });
    return false;
  }

  return true;
}
