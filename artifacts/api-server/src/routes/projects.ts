import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import {
  db,
  projectsTable,
  jobsTable,
  activitiesTable,
  projectMetadataTable,
  messagesTable,
  documentVersionsTable,
} from "@workspace/db";
import {
  CreateProjectBody,
  UpdateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  DeleteProjectParams,
  AnalyzeProjectParams,
  ListProjectsQueryParams,
} from "@workspace/api-zod";
import { logActivity } from "../lib/activity";
import { callAI, buildSystemPrompt } from "../lib/ai";

const router: IRouter = Router();

// GET /projects
router.get("/projects", async (req, res): Promise<void> => {
  const query = ListProjectsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let q = db.select().from(projectsTable);
  const conditions = [];
  if (query.data.status) {
    conditions.push(eq(projectsTable.status, query.data.status));
  }
  if (query.data.search) {
    conditions.push(
      sql`lower(${projectsTable.title}) like lower(${"%" + query.data.search + "%"})`
    );
  }

  const results = conditions.length
    ? await q.where(sql`${conditions.reduce((a, b) => sql`${a} and ${b}`)}`)
    : await q;

  res.json(
    results.map((p) => ({
      ...p,
      instructionText: p.instructionText ?? null,
      subject: p.subject ?? null,
      taskType: p.taskType ?? null,
      citationFormat: p.citationFormat ?? null,
      outputFormat: p.outputFormat ?? null,
      minRefYear: p.minRefYear ?? null,
      minRefCount: p.minRefCount ?? null,
    }))
  );
});

// GET /projects/stats
router.get("/projects/stats", async (req, res): Promise<void> => {
  const all = await db.select().from(projectsTable);
  const total = all.length;
  const byStatus: Record<string, number> = {};
  for (const p of all) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
  }

  const recent = await db
    .select()
    .from(activitiesTable)
    .orderBy(desc(activitiesTable.createdAt))
    .limit(5);

  res.json({ total, byStatus, recentActivity: recent });
});

// GET /projects/:projectId
router.get("/projects/:projectId", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json({
    ...project,
    instructionText: project.instructionText ?? null,
    subject: project.subject ?? null,
    taskType: project.taskType ?? null,
    citationFormat: project.citationFormat ?? null,
    outputFormat: project.outputFormat ?? null,
    minRefYear: project.minRefYear ?? null,
    minRefCount: project.minRefCount ?? null,
  });
});

// POST /projects
router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .insert(projectsTable)
    .values({
      title: parsed.data.title,
      instructionText: parsed.data.instructionText,
      outputFormat: parsed.data.outputFormat,
      minRefYear: parsed.data.minRefYear,
      minRefCount: parsed.data.minRefCount,
    })
    .returning();

  await logActivity(project.id, "project_created", `Project "${project.title}" dibuat`);

  res.status(201).json({
    ...project,
    instructionText: project.instructionText ?? null,
    subject: project.subject ?? null,
    taskType: project.taskType ?? null,
    citationFormat: project.citationFormat ?? null,
    outputFormat: project.outputFormat ?? null,
    minRefYear: project.minRefYear ?? null,
    minRefCount: project.minRefCount ?? null,
  });
});

// PATCH /projects/:projectId
router.patch("/projects/:projectId", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .update(projectsTable)
    .set(parsed.data)
    .where(eq(projectsTable.id, params.data.projectId))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json({
    ...project,
    instructionText: project.instructionText ?? null,
    subject: project.subject ?? null,
    taskType: project.taskType ?? null,
    citationFormat: project.citationFormat ?? null,
    outputFormat: project.outputFormat ?? null,
    minRefYear: project.minRefYear ?? null,
    minRefCount: project.minRefCount ?? null,
  });
});

// DELETE /projects/:projectId
router.delete("/projects/:projectId", async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .delete(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.sendStatus(204);
});

// POST /projects/:projectId/analyze
router.post("/projects/:projectId/analyze", async (req, res): Promise<void> => {
  const params = AnalyzeProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Create analyze job
  const [job] = await db
    .insert(jobsTable)
    .values({ projectId: project.id, jobType: "analyze", status: "pending" })
    .returning();

  // Update project status
  await db
    .update(projectsTable)
    .set({ status: "analyzing" })
    .where(eq(projectsTable.id, project.id));

  await logActivity(project.id, "analysis_started", "Analisis instruksi dimulai");

  // Run analyze in background (no await — respond immediately)
  runAnalysisPipeline(project.id, job.id).catch((err) => {
    req.log.error({ err, projectId: project.id }, "Analysis pipeline failed");
  });

  res.status(202).json({
    ...job,
    result: job.result ?? null,
    errorMessage: job.errorMessage ?? null,
  });
});

async function runAnalysisPipeline(projectId: number, jobId: number) {
  try {
    await db
      .update(jobsTable)
      .set({ status: "running" })
      .where(eq(jobsTable.id, jobId));

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId));

    if (!project) throw new Error("Project not found");

    const systemPrompt = buildSystemPrompt({
      title: project.title,
      instructionText: project.instructionText,
    });

    const analysisPrompt = `Analisis instruksi tugas berikut dan berikan respons dalam format JSON:

INSTRUKSI TUGAS:
${project.instructionText ?? project.title}

Hasilkan JSON dengan struktur berikut (HANYA JSON, tanpa teks lain):
{
  "detectedTitle": "judul yang tepat untuk tugas ini",
  "subject": "nama mata kuliah yang relevan",
  "taskType": "jenis tugas (makalah/skripsi/laporan/esai/dll)",
  "citationFormat": "format sitasi yang sesuai (APA/MLA/Chicago/IEEE/dll)",
  "language": "bahasa utama (Indonesia/Inggris)",
  "outline": "outline lengkap dalam format:\\nBAB I: ...\\nA. ...\\nB. ...\\n\\nBAB II: ...\\ndll",
  "contextSummary": "ringkasan konteks tugas dalam 2-3 kalimat"
}`;

    const aiResponse = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: analysisPrompt },
    ]);

    // Extract JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    let metadata: Record<string, string> = {};
    if (jsonMatch) {
      try {
        metadata = JSON.parse(jsonMatch[0]);
      } catch {
        metadata = {};
      }
    }

    // Upsert project metadata
    await db
      .insert(projectMetadataTable)
      .values({
        projectId,
        detectedTitle: metadata.detectedTitle ?? null,
        subject: metadata.subject ?? null,
        taskType: metadata.taskType ?? null,
        citationFormat: metadata.citationFormat ?? null,
        language: metadata.language ?? null,
        outline: metadata.outline ?? null,
        contextSummary: metadata.contextSummary ?? null,
      })
      .onConflictDoUpdate({
        target: projectMetadataTable.projectId,
        set: {
          detectedTitle: metadata.detectedTitle ?? null,
          subject: metadata.subject ?? null,
          taskType: metadata.taskType ?? null,
          citationFormat: metadata.citationFormat ?? null,
          language: metadata.language ?? null,
          outline: metadata.outline ?? null,
          contextSummary: metadata.contextSummary ?? null,
        },
      });

    // Update project with analyzed data
    await db
      .update(projectsTable)
      .set({
        subject: metadata.subject ?? null,
        taskType: metadata.taskType ?? null,
        citationFormat: metadata.citationFormat ?? null,
        status: "writing",
        progress: 25,
      })
      .where(eq(projectsTable.id, projectId));

    // Save the outline as a system message
    if (metadata.outline) {
      await db.insert(messagesTable).values({
        projectId,
        role: "system",
        content: `Analisis selesai. Outline:\n\n${metadata.outline}`,
      });
    }

    // Now generate the initial document
    const writeJob = await db
      .insert(jobsTable)
      .values({ projectId, jobType: "write_chapter", status: "running" })
      .returning();

    await logActivity(projectId, "analysis_complete", "Analisis instruksi selesai, outline dibuat");
    await logActivity(projectId, "writing_started", "Penulisan dokumen dimulai");

    const writePrompt = `Berdasarkan outline berikut, tulis dokumen akademik lengkap dalam Bahasa Indonesia:

${metadata.outline ?? "Tulis dokumen berdasarkan instruksi dosen."}

Tulis dalam format Markdown yang rapi. Sertakan semua bab dan sub-bab. Gunakan bahasa akademik yang natural dan mengalir.`;

    const documentContent = await callAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: writePrompt },
    ]);

    // Get current version count
    const versions = await db
      .select()
      .from(documentVersionsTable)
      .where(eq(documentVersionsTable.projectId, projectId));

    const newVersion = versions.length + 1;

    await db.insert(documentVersionsTable).values({
      projectId,
      versionNumber: newVersion,
      content: documentContent,
      outline: metadata.outline ?? null,
      changeDescription: "Dokumen awal dihasilkan dari analisis instruksi",
    });

    await db
      .update(projectsTable)
      .set({ status: "waiting_revision", progress: 80 })
      .where(eq(projectsTable.id, projectId));

    await db
      .update(jobsTable)
      .set({ status: "completed", result: "Dokumen berhasil ditulis" })
      .where(eq(jobsTable.id, writeJob[0].id));

    await db
      .update(jobsTable)
      .set({ status: "completed", result: "Analisis dan penulisan selesai" })
      .where(eq(jobsTable.id, jobId));

    await logActivity(projectId, "document_written", `Versi ${newVersion} dokumen selesai ditulis`);
  } catch (err) {
    await db
      .update(jobsTable)
      .set({ status: "failed", errorMessage: String(err) })
      .where(eq(jobsTable.id, jobId));

    await db
      .update(projectsTable)
      .set({ status: "draft" })
      .where(eq(projectsTable.id, projectId));

    await logActivity(projectId, "analysis_failed", `Analisis gagal: ${String(err)}`);
    throw err;
  }
}

export default router;
