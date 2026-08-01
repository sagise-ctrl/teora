import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  referencesTable,
  projectMetadataTable,
  projectsTable,
} from "@workspace/db";
import {
  ListReferencesParams,
  CreateReferenceParams,
  CreateReferenceBody,
  DeleteReferenceParams,
  RegenerateBibliographyParams,
} from "@workspace/api-zod";
import { callAI, buildSystemPrompt } from "../lib/ai";
import { logActivity } from "../lib/activity";

const router: IRouter = Router();

// GET /projects/:projectId/references
router.get("/projects/:projectId/references", async (req, res): Promise<void> => {
  const params = ListReferencesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const refs = await db
    .select()
    .from(referencesTable)
    .where(eq(referencesTable.projectId, params.data.projectId))
    .orderBy(desc(referencesTable.createdAt));

  res.json(
    refs.map((r) => ({
      ...r,
      authors: r.authors ?? null,
      year: r.year ?? null,
      journal: r.journal ?? null,
      volume: r.volume ?? null,
      issue: r.issue ?? null,
      doi: r.doi ?? null,
      url: r.url ?? null,
      usedInChapters: r.usedInChapters ?? null,
    }))
  );
});

// POST /projects/:projectId/references
router.post("/projects/:projectId/references", async (req, res): Promise<void> => {
  const params = CreateReferenceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateReferenceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [ref] = await db
    .insert(referencesTable)
    .values({
      projectId: params.data.projectId,
      title: parsed.data.title,
      authors: parsed.data.authors,
      year: parsed.data.year,
      journal: parsed.data.journal,
      volume: parsed.data.volume,
      issue: parsed.data.issue,
      doi: parsed.data.doi,
      url: parsed.data.url,
    })
    .returning();

  await logActivity(params.data.projectId, "reference_added", `Referensi ditambahkan: ${ref.title}`);

  res.status(201).json({
    ...ref,
    authors: ref.authors ?? null,
    year: ref.year ?? null,
    journal: ref.journal ?? null,
    volume: ref.volume ?? null,
    issue: ref.issue ?? null,
    doi: ref.doi ?? null,
    url: ref.url ?? null,
    usedInChapters: ref.usedInChapters ?? null,
  });
});

// DELETE /projects/:projectId/references/:referenceId
router.delete("/projects/:projectId/references/:referenceId", async (req, res): Promise<void> => {
  const params = DeleteReferenceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [ref] = await db
    .delete(referencesTable)
    .where(eq(referencesTable.id, params.data.referenceId))
    .returning();

  if (!ref) {
    res.status(404).json({ error: "Reference not found" });
    return;
  }

  res.sendStatus(204);
});

// POST /projects/:projectId/references/regenerate
router.post("/projects/:projectId/references/regenerate", async (req, res): Promise<void> => {
  const params = RegenerateBibliographyParams.safeParse(req.params);
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

  const [metadata] = await db
    .select()
    .from(projectMetadataTable)
    .where(eq(projectMetadataTable.projectId, params.data.projectId));

  const refs = await db
    .select()
    .from(referencesTable)
    .where(eq(referencesTable.projectId, params.data.projectId));

  if (refs.length === 0) {
    res.json({ bibliography: "Belum ada referensi yang tersimpan." });
    return;
  }

  const citationFormat = metadata?.citationFormat ?? project.citationFormat ?? "APA";
  const refList = refs
    .map(
      (r, i) =>
        `${i + 1}. ${r.authors ?? "Penulis"} (${r.year ?? "t.t."}). ${r.title}. ${r.journal ?? ""}${r.volume ? ` Vol. ${r.volume}` : ""}${r.issue ? ` No. ${r.issue}` : ""}${r.doi ? `. DOI: ${r.doi}` : ""}${r.url ? `. URL: ${r.url}` : ""}`
    )
    .join("\n");

  const systemPrompt = buildSystemPrompt({
    title: project.title,
    instructionText: project.instructionText,
    citationFormat,
  });

  const aiResponse = await callAI([
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Buat daftar pustaka dalam format ${citationFormat} dari referensi berikut:\n\n${refList}\n\nFormat output: daftar pustaka siap pakai dalam format ${citationFormat} yang benar.`,
    },
  ]);

  await logActivity(params.data.projectId, "bibliography_regenerated", "Daftar pustaka diperbarui");

  res.json({ bibliography: aiResponse });
});

export default router;
