import { Router, type IRouter } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db, learningActivitiesTable, projectsTable } from "@workspace/db";
import { z } from "zod/index.js";

const router: IRouter = Router();

// GET /learning-activities
router.get("/learning-activities", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const activities = await db
    .select()
    .from(learningActivitiesTable)
    .where(eq(learningActivitiesTable.userId, req.user.id))
    .orderBy(desc(learningActivitiesTable.createdAt));

  // Collect all project IDs to batch-fetch titles
  const projectIds = [...new Set(activities.map((a) => a.sourceProjectId).filter(Boolean))];
  const projectMap: Record<number, string> = {};
  if (projectIds.length > 0) {
    const projects = await db
      .select({ id: projectsTable.id, title: projectsTable.title })
      .from(projectsTable)
      .where(sql`${projectsTable.id} = ANY(${projectIds})`);
    for (const p of projects) {
      if (p.id) projectMap[p.id] = p.title ?? "";
    }
  }

  const formatted = activities.map((a) => ({
    id: a.id,
    userId: a.userId,
    topics: JSON.parse(a.topics || "[]"),
    subject: a.subject,
    sourceProjectId: a.sourceProjectId,
    sourceProjectTitle: a.sourceProjectId ? (projectMap[a.sourceProjectId] ?? null) : null,
    extractedFrom: a.extractedFrom,
    createdAt: a.createdAt.toISOString(),
  }));

  res.json(formatted);
});

// POST /learning-activities
router.post("/learning-activities", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = req.body;
  if (!body || !body.topics || !Array.isArray(body.topics) || body.topics.length === 0) {
    res.status(400).json({ error: "topics must be a non-empty array" });
    return;
  }

  // Upsert: if same sourceProjectId already exists, update topics instead of creating new
  if (body.sourceProjectId) {
    const existing = await db
      .select()
      .from(learningActivitiesTable)
      .where(
        and(
          eq(learningActivitiesTable.userId, req.user.id),
          eq(learningActivitiesTable.sourceProjectId, body.sourceProjectId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const updated = await db
        .update(learningActivitiesTable)
        .set({
          topics: JSON.stringify(body.topics),
          subject: body.subject || null,
          extractedFrom: body.extractedFrom || "instruction",
          updatedAt: new Date(),
        })
        .where(eq(learningActivitiesTable.id, existing[0].id))
        .returning();

      res.status(200).json(updated[0]);
      return;
    }
  }

  const inserted = await db
    .insert(learningActivitiesTable)
    .values({
      userId: req.user.id,
      topics: JSON.stringify(body.topics),
      subject: body.subject || null,
      sourceProjectId: body.sourceProjectId || null,
      extractedFrom: body.extractedFrom || "instruction",
    })
    .returning();

  res.status(201).json(inserted[0]);
});

// GET /learning-activities/recommendations
router.get("/learning-activities/recommendations", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Get all activities for the user
  const rawActivities = await db
    .select()
    .from(learningActivitiesTable)
    .where(eq(learningActivitiesTable.userId, req.user.id))
    .orderBy(desc(learningActivitiesTable.createdAt));

  if (rawActivities.length === 0) {
    res.json([]);
    return;
  }

  // Batch-fetch project titles
  const projectIds = [...new Set(rawActivities.map((a) => a.sourceProjectId).filter(Boolean))];
  const projectMap: Record<number, string> = {};
  if (projectIds.length > 0) {
    const projects = await db
      .select({ id: projectsTable.id, title: projectsTable.title })
      .from(projectsTable)
      .where(sql`${projectsTable.id} = ANY(${projectIds})`);
    for (const p of projects) {
      if (p.id) projectMap[p.id] = p.title ?? "";
    }
  }

  // Format with parsed topics and project title
  const activities = rawActivities.map((a) => ({
    id: a.id,
    userId: a.userId,
    topics: JSON.parse(a.topics || "[]") as string[],
    subject: a.subject,
    sourceProjectId: a.sourceProjectId,
    sourceProjectTitle: a.sourceProjectId ? (projectMap[a.sourceProjectId] ?? null) : null,
    extractedFrom: a.extractedFrom,
    createdAt: a.createdAt.toISOString(),
  }));

  type FormattedActivity = typeof activities[0];

  // Strategy: return up to 3 recommendations
  const recommendations: Array<{
    learningActivity: FormattedActivity;
    reason: string;
    type: string;
  }> = [];

  // Recommendation 1: Most recent activity
  const recentActivity = activities[0];
  if (recentActivity) {
    const topicLabel = recentActivity.topics[0] || "topik terbaru";
    recommendations.push({
      learningActivity: recentActivity,
      reason: `Dari tugas terbaru Anda: "${topicLabel}"`,
      type: "recent_task",
    });
  }

  // Recommendation 2: Most frequent topic
  const topicCount: Record<string, FormattedActivity> = {};
  for (const activity of activities) {
    for (const topic of activity.topics) {
      if (!topicCount[topic]) {
        topicCount[topic] = activity;
      }
    }
  }
  const sortedTopics = Object.entries(topicCount).sort((a, b) => {
    const countA = activities.filter((act) => act.topics.includes(a[0])).length;
    const countB = activities.filter((act) => act.topics.includes(b[0])).length;
    return countB - countA;
  });

  if (sortedTopics.length > 1) {
    const frequentTopic = sortedTopics[0][0];
    const frequentActivity = topicCount[frequentTopic];
    if (frequentActivity && frequentActivity.id !== recentActivity?.id) {
      recommendations.push({
        learningActivity: frequentActivity,
        reason: `"${frequentTopic}" muncul di beberapa tugas Anda`,
        type: "frequent_topic",
      });
    }
  }

  // Recommendation 3: Recent project without learning activity
  const recentProjects = await db
    .select({ id: projectsTable.id, title: projectsTable.title })
    .from(projectsTable)
    .where(eq(projectsTable.userId, req.user.id))
    .orderBy(desc(projectsTable.createdAt))
    .limit(5);

  const existingProjectIds = new Set(
    activities.map((a) => a.sourceProjectId).filter(Boolean),
  );

  for (const project of recentProjects) {
    if (project.id && !existingProjectIds.has(project.id)) {
      recommendations.push({
        learningActivity: {
          id: 0,
          userId: req.user.id,
          topics: [project.title ?? ""],
          subject: null,
          sourceProjectId: project.id,
          sourceProjectTitle: project.title ?? "",
          extractedFrom: "instruction",
          createdAt: new Date().toISOString(),
        },
        reason: `Project "${project.title}" belum di-extract`,
        type: "recent_task",
      });
      break;
    }
  }

  // Deduplicate by sourceProjectId and limit to 3
  const seen = new Set<number>();
  const deduplicated = recommendations.filter((r) => {
    if (r.learningActivity.sourceProjectId === null) return true;
    if (seen.has(r.learningActivity.sourceProjectId)) return false;
    seen.add(r.learningActivity.sourceProjectId);
    return true;
  });

  res.json(deduplicated.slice(0, 3));
});

export default router;
