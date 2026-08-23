import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, projectMembersTable } from "@workspace/db";
import { requireProjectOwnership } from "../lib/ownership";

const router: IRouter = Router();

// GET /projects/:projectId/members
router.get("/projects/:projectId/members", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  if (!projectId || isNaN(projectId)) {
    res.status(400).json({ error: "Invalid projectId" });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(projectId, req.user.id, res);
  if (!ok) return;

  const members = await db
    .select()
    .from(projectMembersTable)
    .where(eq(projectMembersTable.projectId, projectId));

  res.json(members);
});

// POST /projects/:projectId/members
router.post("/projects/:projectId/members", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  if (!projectId || isNaN(projectId)) {
    res.status(400).json({ error: "Invalid projectId" });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(projectId, req.user.id, res);
  if (!ok) return;

  const { userId, role } = req.body as { userId?: string; role?: string };
  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const validRoles = ["collaborator", "viewer"] as const;
  const memberRole: "collaborator" | "viewer" =
    role && validRoles.includes(role as "collaborator" | "viewer") ? role as "collaborator" | "viewer" : "collaborator";

  const [member] = await db
    .insert(projectMembersTable)
    .values({
      projectId,
      userId,
      role: memberRole,
    })
    .returning();

  res.status(201).json(member);
});

// PATCH /projects/:projectId/members/:memberId
router.patch("/projects/:projectId/members/:memberId", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  const memberId = Number(req.params.memberId);
  if (!projectId || isNaN(projectId) || !memberId || isNaN(memberId)) {
    res.status(400).json({ error: "Invalid projectId or memberId" });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(projectId, req.user.id, res);
  if (!ok) return;

  const [existing] = await db
    .select()
    .from(projectMembersTable)
    .where(and(eq(projectMembersTable.id, memberId), eq(projectMembersTable.projectId, projectId)));

  if (!existing) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const { role } = req.body as { role?: string };
  const validRoles = ["collaborator", "viewer"] as const;
  if (!role || !validRoles.includes(role as "collaborator" | "viewer")) {
    res.status(400).json({ error: "role must be 'collaborator' or 'viewer'" });
    return;
  }

  const updatedRole: "collaborator" | "viewer" = role as "collaborator" | "viewer";

  const [updated] = await db
    .update(projectMembersTable)
    .set({ role: updatedRole, updatedAt: new Date() })
    .where(and(eq(projectMembersTable.id, memberId), eq(projectMembersTable.projectId, projectId)))
    .returning();

  res.json(updated);
});

// DELETE /projects/:projectId/members/:memberId
router.delete("/projects/:projectId/members/:memberId", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  const memberId = Number(req.params.memberId);
  if (!projectId || isNaN(projectId) || !memberId || isNaN(memberId)) {
    res.status(400).json({ error: "Invalid projectId or memberId" });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(projectId, req.user.id, res);
  if (!ok) return;

  const [member] = await db
    .select()
    .from(projectMembersTable)
    .where(and(eq(projectMembersTable.id, memberId), eq(projectMembersTable.projectId, projectId)));

  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  await db
    .delete(projectMembersTable)
    .where(and(eq(projectMembersTable.id, memberId), eq(projectMembersTable.projectId, projectId)));

  res.status(204).send();
});

export default router;
