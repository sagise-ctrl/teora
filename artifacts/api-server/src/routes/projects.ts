import { Router, type IRouter, type Request } from "express";
import { eq, desc, sql, and, isNull } from "drizzle-orm";
import {
  db,
  projectsTable,
  jobsTable,
  activitiesTable,
  projectMetadataTable,
  messagesTable,
  documentVersionsTable,
  documentsTable,
  referencesTable,
  shareTokensTable,
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
import { logActivity } from "../lib/activity.js";
import { requireProjectOwnership } from "../lib/ownership.js";
import { callAI, buildSystemPrompt, getTierConfig, getTierForUser } from "../lib/ai.js";
import { logAIUsage } from "../lib/ai-usage-log.js";
import { checkCreditBalance, deductCredit } from "../lib/credit.js";
import { sanitizeInstructionText, sanitizeUserMessage } from "../lib/prompt-injection.js";

const router: IRouter = Router();

function getUserId(req: Request): string {
  if (!req.user?.id) throw new Error("User not authenticated");
  return req.user.id;
}

// GET /projects
router.get("/projects", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const query = ListProjectsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [eq(projectsTable.userId, userId)];
  if (query.data.status) {
    conditions.push(eq(projectsTable.status, query.data.status));
  }
  if (query.data.search) {
    conditions.push(
      sql`lower(${projectsTable.title}) like lower(${`%${query.data.search}%`})`
    );
  }

  const results = await db
    .select()
    .from(projectsTable)
    .where(sql.join(conditions.map((c, i) => (i === 0 ? c : sql` and ${c}`))));

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
  const userId = getUserId(req);
  const all = await db.select().from(projectsTable).where(eq(projectsTable.userId, userId));
  const total = all.length;
  const byStatus: Record<string, number> = {};
  for (const p of all) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
  }

  // Get recent activity for user's projects
  const projectIds = all.map((p) => p.id);
  const recent = await db
    .select()
    .from(activitiesTable)
    .where(sql`${activitiesTable.projectId} in (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`)
    .orderBy(desc(activitiesTable.createdAt))
    .limit(5);

  res.json({ total, byStatus, recentActivity: recent });
});

// GET /projects/:projectId
router.get("/projects/:projectId", async (req, res): Promise<void> => {
  const userId = getUserId(req);
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

  // Ownership check
  if (project.userId !== userId) {
    res.status(403).json({ error: "Access denied" });
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
  const userId = getUserId(req);
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .insert(projectsTable)
    .values({
      userId,
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
  const userId = getUserId(req);
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId));

  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (existing.userId !== userId) {
    res.status(403).json({ error: "Access denied" });
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
  const userId = getUserId(req);
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId));

  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (existing.userId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  await db.delete(projectsTable).where(eq(projectsTable.id, params.data.projectId));

  res.sendStatus(204);
});

// POST /projects/:projectId/analyze
router.post("/projects/:projectId/analyze", async (req, res): Promise<void> => {
  const userId = getUserId(req);
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

  if (project.userId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  // Resolve tier from request or user's preferred
  const requestedTier = typeof req.body?.tier === "string" ? req.body.tier : null;
  const selectedTier = requestedTier
    ? await getTierConfig(requestedTier)
    : await getTierForUser(project.userId, null);

  if (!selectedTier) {
    res.status(400).json({ error: "Tier tidak valid" });
    return;
  }

  // Pre-check credit for paid tiers before running the pipeline
  if (!selectedTier.isFree) {
    const estimatedCostCents = Math.max(
      100,
      selectedTier.pricePer1MInputCents + selectedTier.pricePer1MOutputCents,
    );
    const creditCheck = await checkCreditBalance(project.userId, estimatedCostCents, false);
    if (!creditCheck.allowed) {
      res.status(402).json({
        error: creditCheck.reason,
        balanceCents: creditCheck.balanceCents,
        costCents: creditCheck.costCents,
        tierName: selectedTier.name,
      });
      return;
    }
  }

  const [job] = await db
    .insert(jobsTable)
    .values({ projectId: project.id, jobType: "analyze", status: "pending" })
    .returning();

  await db
    .update(projectsTable)
    .set({ status: "analyzing" })
    .where(eq(projectsTable.id, project.id));

  await logActivity(project.id, "analysis_started", "Analisis instruksi dimulai");

  runAnalysisPipeline(project.id, job.id, selectedTier).catch((err) => {
    req.log.error({ err, projectId: project.id }, "Analysis pipeline failed");
  });

  res.status(202).json({
    ...job,
    result: job.result ?? null,
    errorMessage: job.errorMessage ?? null,
  });
});

async function runAnalysisPipeline(
  projectId: number,
  jobId: number,
  selectedTier: Awaited<ReturnType<typeof getTierConfig>>,
) {
  if (!selectedTier) throw new Error("Tier required");
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

    // Sanitize instruction text against prompt injection before it enters AI prompts
    const safeInstructionText = sanitizeInstructionText(project.instructionText ?? "");

    const systemPrompt = buildSystemPrompt({
      title: project.title,
      instructionText: safeInstructionText,
    });

    const analysisPrompt = `Analisis instruksi tugas berikut dan berikan respons dalam format JSON:

INSTRUKSI TUGAS:
${safeInstructionText || project.title}

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

    const { content: aiResponse, usage: analysisUsage, tierConfig: analysisTier } = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: analysisPrompt },
      ],
      selectedTier.id,
    );

    const analyzeUsageLog = await logAIUsage({
      userId: project.userId,
      projectId,
      requestType: "analyze",
      usage: analysisUsage,
      tierConfig: analysisTier,
    });

    if (!selectedTier.isFree && analysisUsage.costCents > 0) {
      await deductCredit({
        userId: project.userId,
        costCents: analysisUsage.costCents,
        tierIsFree: false,
        tierId: selectedTier.id,
        aiUsageLogId: analyzeUsageLog?.id,
        description: `AI analyze — ${selectedTier.name} tier`,
      });
    }

    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    let metadata: Record<string, string> = {};
    if (jsonMatch) {
      try {
        metadata = JSON.parse(jsonMatch[0]);
      } catch {
        metadata = {};
      }
    }

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

    if (metadata.outline) {
      await db.insert(messagesTable).values({
        projectId,
        role: "system",
        content: `Analisis selesai. Outline:\n\n${metadata.outline}`,
      });
    }

    const writeJob = await db
      .insert(jobsTable)
      .values({ projectId, jobType: "write_chapter", status: "running" })
      .returning();

    await logActivity(projectId, "analysis_complete", "Analisis instruksi selesai, outline dibuat");
    await logActivity(projectId, "writing_started", "Penulisan dokumen dimulai");

    const writePrompt = `Berdasarkan outline berikut, tulis dokumen akademik lengkap dalam Bahasa Indonesia:

${metadata.outline ?? "Tulis dokumen berdasarkan instruksi dosen."}

Tulis dalam format Markdown yang rapi. Sertakan semua bab dan sub-bab. Gunakan bahasa akademik yang natural dan mengalir.`;

    const { content: documentContent, usage: writeUsage, tierConfig: writeTier } = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: writePrompt },
      ],
      selectedTier.id,
    );

    const writeUsageLog = await logAIUsage({
      userId: project.userId,
      projectId,
      requestType: "write",
      usage: writeUsage,
      tierConfig: writeTier,
    });

    if (!selectedTier.isFree && writeUsage.costCents > 0) {
      await deductCredit({
        userId: project.userId,
        costCents: writeUsage.costCents,
        tierIsFree: false,
        tierId: selectedTier.id,
        aiUsageLogId: writeUsageLog?.id,
        description: `AI write — ${selectedTier.name} tier`,
      });
    }

    const versions = await db
      .select()
      .from(documentVersionsTable)
      .where(
        and(
          eq(documentVersionsTable.projectId, projectId),
          isNull(documentVersionsTable.documentId)
        )
      );

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

// POST /projects/:projectId/outline
// Regenerate document outline (from scratch or refining user-provided outline)
router.post("/projects/:projectId/outline", async (req, res): Promise<void> => {
  const userId = getUserId(req);
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

  if (project.userId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  // Resolve tier from request or user's preferred
  const requestedTier = typeof req.body?.tier === "string" ? req.body.tier : null;
  const selectedTier = requestedTier
    ? await getTierConfig(requestedTier)
    : await getTierForUser(project.userId, null);

  if (!selectedTier) {
    res.status(400).json({ error: "Tier tidak valid" });
    return;
  }

  // Pre-check credit for paid tiers
  if (!selectedTier.isFree) {
    const estimatedCostCents = Math.max(
      100,
      selectedTier.pricePer1MInputCents + selectedTier.pricePer1MOutputCents,
    );
    const creditCheck = await checkCreditBalance(project.userId, estimatedCostCents, false);
    if (!creditCheck.allowed) {
      res.status(402).json({
        error: creditCheck.reason,
        balanceCents: creditCheck.balanceCents,
        costCents: creditCheck.costCents,
        tierName: selectedTier.name,
      });
      return;
    }
  }

  const { userOutline } = req.body as { userOutline?: string };
  const sanitizedOutline = userOutline ? sanitizeUserMessage(userOutline) : undefined;

  const systemPrompt = buildSystemPrompt({
    title: project.title,
    instructionText: project.instructionText ?? undefined,
  });

  const outlinePrompt = sanitizedOutline
    ? `Tinjauan outline pengguna berikut dan perbaiki outline dokumen akademik ini:\n\nOUTLINE SAAT INI:\n${sanitizedOutline}\n\nINSTRUKSI: Buat outline yang lebih baik berdasarkan instruksi tugas berikut.\nJudul: ${project.title}\n${project.instructionText ? `\nINSTRUKSI DOSEN:\n${project.instructionText}` : ""}`
    : `Analisis instruksi tugas berikut dan hasilkan outline dokumen akademik yang lengkap.\n\nJudul: ${project.title}\n${project.instructionText ? `\nINSTRUKSI DOSEN:\n${project.instructionText}` : ""}\n\nFormat: outline lengkap dalam format markdown dengan bab dan sub-bab.`;

  const { content: outlineContent, usage, tierConfig } = await callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: outlinePrompt },
    ],
    selectedTier.id,
  );

  const usageLog = await logAIUsage({
    userId: project.userId,
    projectId: params.data.projectId,
    requestType: "outline",
    usage,
    tierConfig,
  });

  if (!selectedTier.isFree && usage.costCents > 0) {
    await deductCredit({
      userId: project.userId,
      costCents: usage.costCents,
      tierIsFree: false,
      tierId: selectedTier.id,
      aiUsageLogId: usageLog?.id,
      description: `AI outline — ${selectedTier.name} tier`,
    });
  }

  // Update metadata with new outline
  const [metadata] = await db
    .select()
    .from(projectMetadataTable)
    .where(eq(projectMetadataTable.projectId, params.data.projectId));

  if (metadata) {
    await db
      .update(projectMetadataTable)
      .set({ outline: outlineContent })
      .where(eq(projectMetadataTable.projectId, params.data.projectId));
  } else {
    await db.insert(projectMetadataTable).values({
      projectId: params.data.projectId,
      outline: outlineContent,
    });
  }

  await logActivity(params.data.projectId, "outline_regenerated", "Outline dokumen diperbarui");

  res.json({ outline: outlineContent });
});

// POST /projects/:projectId/documents/generate
// Generate a new document version from the current outline
router.post("/projects/:projectId/documents/generate", async (req, res): Promise<void> => {
  const userId = getUserId(req);
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

  if (project.userId !== userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  // Resolve tier from request or user's preferred
  const requestedTier = typeof req.body?.tier === "string" ? req.body.tier : null;
  const selectedTier = requestedTier
    ? await getTierConfig(requestedTier)
    : await getTierForUser(project.userId, null);

  if (!selectedTier) {
    res.status(400).json({ error: "Tier tidak valid" });
    return;
  }

  // Pre-check credit for paid tiers
  if (!selectedTier.isFree) {
    const estimatedCostCents = Math.max(
      100,
      selectedTier.pricePer1MInputCents + selectedTier.pricePer1MOutputCents,
    );
    const creditCheck = await checkCreditBalance(project.userId, estimatedCostCents, false);
    if (!creditCheck.allowed) {
      res.status(402).json({
        error: creditCheck.reason,
        balanceCents: creditCheck.balanceCents,
        costCents: creditCheck.costCents,
        tierName: selectedTier.name,
      });
      return;
    }
  }

  const [metadata] = await db
    .select()
    .from(projectMetadataTable)
    .where(eq(projectMetadataTable.projectId, params.data.projectId));

  const outline = metadata?.outline ?? null;
  if (!outline) {
    res.status(400).json({ error: "Silakan buat outline terlebih dahulu (klik 'Analyze')" });
    return;
  }

  // Check if there's already a running write job
  const existingJobs = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.projectId, params.data.projectId));

  const runningWrite = existingJobs.find(
    (j) => j.jobType === "write_chapter" && j.status === "running"
  );
  if (runningWrite) {
    res.status(409).json({ error: "Dokumen sedang ditulis. Tunggu sampai selesai." });
    return;
  }

  // Create a document generation job
  const [job] = await db
    .insert(jobsTable)
    .values({
      projectId: project.id,
      jobType: "write_chapter",
      status: "pending",
    })
    .returning();

  await db
    .update(projectsTable)
    .set({ status: "writing" })
    .where(eq(projectsTable.id, project.id));

  await logActivity(project.id, "document_generation_started", "Penulisan dokumen dimulai");

  runDocumentGeneration(project.id, job.id, outline, selectedTier).catch((err) => {
    req.log.error({ err, projectId: project.id }, "Document generation failed");
  });

  res.status(202).json({ jobId: job.id, status: "started" });
});

async function runDocumentGeneration(
  projectId: number,
  jobId: number,
  outline: string,
  selectedTier: NonNullable<Awaited<ReturnType<typeof getTierConfig>>>,
) {
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
      instructionText: project.instructionText ?? undefined,
      citationFormat: project.citationFormat ?? undefined,
    });

    const [metadata] = await db
      .select()
      .from(projectMetadataTable)
      .where(eq(projectMetadataTable.projectId, projectId));

    const refs = await db
      .select()
      .from(referencesTable)
      .where(eq(referencesTable.projectId, projectId));

    const refList = refs.length > 0
      ? `\nREFERENSI YANG DAPAT DIGUNAKAN:\n${refs
          .map(
            (r, i) =>
              `${i + 1}. ${r.authors ?? "Penulis"} (${r.year ?? "n.d."}). ${r.title}.`
          )
          .join("\n")}`
      : "";

    const writePrompt = `Tulis dokumen akademik lengkap dalam Bahasa Indonesia berdasarkan outline berikut:\n\nOUTLINE:\n${outline}${refList}\n\nTULIS dalam format Markdown yang rapi. Sertakan semua bab dan sub-bab. Gunakan bahasa akademik yang natural dan mengalir. Panjang dokumen: minimal 2000 kata.`;

    const { content: documentContent, usage, tierConfig } = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: writePrompt },
      ],
      selectedTier.id,
    );

    const usageLog = await logAIUsage({
      userId: project.userId,
      projectId,
      requestType: "write",
      usage,
      tierConfig,
    });

    if (!selectedTier.isFree && usage.costCents > 0) {
      await deductCredit({
        userId: project.userId,
        costCents: usage.costCents,
        tierIsFree: false,
        tierId: selectedTier.id,
        aiUsageLogId: usageLog?.id,
        description: `AI generate document — ${selectedTier.name} tier`,
      });
    }

    const versions = await db
      .select()
      .from(documentVersionsTable)
      .where(
        and(
          eq(documentVersionsTable.projectId, projectId),
          isNull(documentVersionsTable.documentId)
        )
      );

    const newVersion = versions.length + 1;

    await db.insert(documentVersionsTable).values({
      projectId,
      versionNumber: newVersion,
      content: documentContent,
      outline,
      changeDescription: `Dokumen versi ${newVersion} — Generated from outline`,
    });

    await db
      .update(projectsTable)
      .set({ status: "waiting_revision", progress: 80 })
      .where(eq(projectsTable.id, projectId));

    await db
      .update(jobsTable)
      .set({ status: "completed", result: `Dokumen versi ${newVersion} berhasil ditulis` })
      .where(eq(jobsTable.id, jobId));

    await logActivity(projectId, "document_generated", `Versi ${newVersion} dokumen berhasil ditulis`);
  } catch (err) {
    await db
      .update(jobsTable)
      .set({ status: "failed", errorMessage: String(err) })
      .where(eq(jobsTable.id, jobId));

    await db
      .update(projectsTable)
      .set({ status: "draft" })
      .where(eq(projectsTable.id, projectId));

    await logActivity(projectId, "document_generation_failed", `Penulisan gagal: ${String(err)}`);
    throw err;
  }
}

// ── Export DOCX ───────────────────────────────────────────────────────────────

import { generateDocx } from "../lib/docx-export.js";
import { generatePDF } from "../lib/pdf-export.js";

// GET /projects/:projectId/export/docx
router.get("/projects/:projectId/export/docx", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(projectId, req.user.id, res);
  if (!ok) return;

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Get all documents ordered by index
  const docs = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.projectId, projectId))
    .orderBy(documentsTable.orderIndex);

  // Get latest version for each document
  const documentsWithContent = await Promise.all(
    docs.map(async (doc) => {
      const versions = await db
        .select()
        .from(documentVersionsTable)
        .where(eq(documentVersionsTable.documentId, doc.id))
        .orderBy(desc(documentVersionsTable.versionNumber))
        .limit(1);
      return { document: doc, version: versions[0] ?? null };
    })
  );

  // Also get standalone document versions (no documentId)
  const standaloneVersions = await db
    .select()
    .from(documentVersionsTable)
    .where(and(eq(documentVersionsTable.projectId, projectId), isNull(documentVersionsTable.documentId)))
    .orderBy(desc(documentVersionsTable.versionNumber));

  const allDocuments =
    docs.length > 0
      ? documentsWithContent
      : standaloneVersions.map((v) => ({
          document: {
            id: 0,
            projectId,
            title: project.title,
            orderIndex: 0,
            createdAt: v.createdAt,
            updatedAt: v.createdAt,
          },
          version: v,
        }));

  // Get references
  const refs = await db
    .select()
    .from(referencesTable)
    .where(eq(referencesTable.projectId, projectId));

  try {
    const buffer = await generateDocx(
      project.title,
      allDocuments,
      refs.map((r) => ({
        title: r.title,
        authors: r.authors,
        year: r.year,
        journal: r.journal,
        volume: r.volume,
        issue: r.issue,
        doi: r.doi,
        url: r.url,
      })),
      {
        projectTitle: project.title,
        citationFormat: project.citationFormat ?? undefined,
        includeReferences: true,
      }
    );

    const safeName = project.title.replace(/[^a-zA-Z0-9_-]/g, "_");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.docx"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    req.log.error({ err, projectId }, "DOCX export failed");
    res.status(500).json({ error: "Gagal mengekspor dokumen" });
  }
});

// GET /projects/:projectId/export/pdf
router.get("/projects/:projectId/export/pdf", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(projectId, req.user.id, res);
  if (!ok) return;

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [metadata] = await db
    .select()
    .from(projectMetadataTable)
    .where(eq(projectMetadataTable.projectId, projectId));

  const [latestVersion] = await db
    .select()
    .from(documentVersionsTable)
    .where(eq(documentVersionsTable.projectId, projectId))
    .orderBy(desc(documentVersionsTable.versionNumber))
    .limit(1);

  const refs = await db
    .select()
    .from(referencesTable)
    .where(eq(referencesTable.projectId, projectId));

  const [user] = await db
    .select({ displayName: usersTable.displayName })
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id));

  try {
    const result = await generatePDF({
      title: project.title,
      author: user?.displayName ?? undefined,
      subject: project.subject,
      outline: metadata?.outline ?? undefined,
      content: latestVersion?.content ?? undefined,
      references: refs.map((r) => ({
        authors: r.authors,
        title: r.title,
        year: r.year,
        journal: r.journal,
        volume: r.volume,
        issue: r.issue,
        pages: r.pages,
        doi: r.doi,
        url: r.url,
      })),
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.setHeader("Content-Length", result.buffer.length);
    res.end(result.buffer);
  } catch (err) {
    req.log.error({ err, projectId }, "PDF export failed");
    res.status(500).json({ error: "Gagal mengekspor PDF" });
  }
});

// ── Share Links ──────────────────────────────────────────────────────────────

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

// GET /projects/:projectId/share
router.get("/projects/:projectId/share", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(projectId, req.user.id, res);
  if (!ok) return;

  const tokens = await db
    .select()
    .from(shareTokensTable)
    .where(eq(shareTokensTable.projectId, projectId))
    .orderBy(desc(shareTokensTable.createdAt));

  res.json(
    tokens.map((t) => ({
      ...t,
      label: t.label ?? null,
      expiresAt: t.expiresAt ?? null,
    }))
  );
});

// POST /projects/:projectId/share
router.post("/projects/:projectId/share", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(projectId, req.user.id, res);
  if (!ok) return;

  const { accessMode, label, expiresInDays } = req.body as {
    accessMode?: string;
    label?: string;
    expiresInDays?: number;
  };

  const validModes = ["view", "comment", "edit"];
  if (!accessMode || !validModes.includes(accessMode)) {
    res.status(400).json({ error: "accessMode must be one of: view, comment, edit" });
    return;
  }

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const [token] = await db
    .insert(shareTokensTable)
    .values({
      projectId,
      token: generateToken(),
      accessMode,
      label: label || null,
      expiresAt,
    })
    .returning();

  await logActivity(projectId, "share_link_created", `Link berbagi dibuat: ${accessMode}`);

  res.status(201).json({
    ...token,
    label: token.label ?? null,
    expiresAt: token.expiresAt ?? null,
  });
});

// DELETE /projects/:projectId/share/:shareId
router.delete("/projects/:projectId/share/:shareId", async (req, res): Promise<void> => {
  const projectId = Number(req.params.projectId);
  const shareId = Number(req.params.shareId);
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(projectId, req.user.id, res);
  if (!ok) return;

  const [deleted] = await db
    .delete(shareTokensTable)
    .where(eq(shareTokensTable.id, shareId))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Share link not found" });
    return;
  }

  await logActivity(projectId, "share_link_revoked", "Link berbagi dicabut");

  res.sendStatus(204);
});

export default router;
