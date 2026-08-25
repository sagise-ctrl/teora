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
  ValidateReferencesParams,
  FormatCSLBibliographyParams,
  FormatCSLBibliographyQueryParams,
  BulkAddReferencesParams,
  BulkAddReferencesBody,
} from "@workspace/api-zod";
import { callAI, buildSystemPrompt, getTierConfig, getTierForUser } from "../lib/ai.js";
import { logActivity } from "../lib/activity.js";
import { requireProjectOwnership } from "../lib/ownership.js";
import { logAIUsage } from "../lib/ai-usage-log.js";
import { checkCreditBalance, deductCredit } from "../lib/credit.js";
import { sanitizeUserMessage } from "../lib/prompt-injection.js";
import { validateReference, validateDOI, validateISBN, formatBibliography, type CitationFormat } from "../lib/citation.js";
import { fetchMetadata, detectIdentifierType } from "../lib/fetch-reference-metadata.js";
import { searchCrossRef } from "../lib/crossref-search.js";

const router: IRouter = Router();

// GET /projects/:projectId/references
router.get("/projects/:projectId/references", async (req, res): Promise<void> => {
  const params = ListReferencesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user.id, res);
  if (!ok) return;

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
      isSuggested: r.isSuggested,
      source: r.source,
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

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user.id, res);
  if (!ok) return;

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
      isSuggested: parsed.data.isSuggested ?? false,
      source: (parsed.data.source as "manual" | "crossref" | "file") ?? "manual",
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
    isSuggested: ref.isSuggested,
    source: ref.source,
  });
});

// DELETE /projects/:projectId/references/:referenceId
router.delete("/projects/:projectId/references/:referenceId", async (req, res): Promise<void> => {
  const params = DeleteReferenceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user.id, res);
  if (!ok) return;

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

// POST /projects/:projectId/references/bulk
// Add multiple references at once (for auto-suggested + manual batch)
router.post("/projects/:projectId/references/bulk", async (req, res): Promise<void> => {
  const params = BulkAddReferencesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user.id, res);
  if (!ok) return;

  const parsed = BulkAddReferencesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!parsed.data.references || parsed.data.references.length === 0) {
    res.status(400).json({ error: "references array is required and cannot be empty" });
    return;
  }

  if (parsed.data.references.length > 100) {
    res.status(400).json({ error: "Maximum 100 references per bulk add" });
    return;
  }

  // Get existing DOIs to avoid duplicates
  const existing = await db
    .select({ doi: referencesTable.doi })
    .from(referencesTable)
    .where(eq(referencesTable.projectId, params.data.projectId));

  const existingDois = new Set(
    existing.map((r) => r.doi).filter((d): d is string => d !== null)
  );

  // Filter out duplicates by DOI
  const toInsert = parsed.data.references.filter(
    (r) => !r.doi || !existingDois.has(r.doi)
  );

  if (toInsert.length === 0) {
    res.status(201).json([]);
    return;
  }

  const inserted = await db
    .insert(referencesTable)
    .values(
      toInsert.map((r) => ({
        projectId: params.data.projectId,
        title: r.title,
        authors: r.authors,
        year: r.year,
        journal: r.journal,
        volume: r.volume,
        issue: r.issue,
        doi: r.doi,
        url: r.url,
        isSuggested: r.isSuggested ?? false,
        source: (r.source as "manual" | "crossref" | "file") ?? "manual",
      }))
    )
    .returning();

  await logActivity(
    params.data.projectId,
    "references_bulk_added",
    `${inserted.length} referensi ditambahkan`
  );

  res.status(201).json(
    inserted.map((r) => ({
      ...r,
      authors: r.authors ?? null,
      year: r.year ?? null,
      journal: r.journal ?? null,
      volume: r.volume ?? null,
      issue: r.issue ?? null,
      doi: r.doi ?? null,
      url: r.url ?? null,
      usedInChapters: r.usedInChapters ?? null,
      isSuggested: r.isSuggested,
      source: r.source,
    }))
  );
});

// POST /projects/:projectId/references/validate
// Validates all references against the project's citation format
router.post("/projects/:projectId/references/validate", async (req, res): Promise<void> => {
  const params = ValidateReferencesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user.id, res);
  if (!ok) return;

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId));

  const [metadata] = await db
    .select()
    .from(projectMetadataTable)
    .where(eq(projectMetadataTable.projectId, params.data.projectId));

  const refs = await db
    .select()
    .from(referencesTable)
    .where(eq(referencesTable.projectId, params.data.projectId));

  const format = (metadata?.citationFormat ?? project?.citationFormat ?? "APA") as CitationFormat;

  const results = refs.map((ref) => {
    const validation = validateReference(
      {
        title: ref.title,
        authors: ref.authors,
        year: ref.year,
        journal: ref.journal,
        volume: ref.volume,
        issue: ref.issue,
        doi: ref.doi,
        url: ref.url,
      },
      format
    );
    return {
      id: ref.id,
      title: ref.title,
      validation,
    };
  });

  const totalErrors = results.reduce(
    (sum, r) => sum + r.validation.issuesBySeverity.errors.length,
    0
  );
  const totalWarnings = results.reduce(
    (sum, r) => sum + r.validation.issuesBySeverity.warnings.length,
    0
  );

  res.json({
    format,
    totalReferences: refs.length,
    totalErrors,
    totalWarnings,
    results,
  });
});

// POST /projects/:projectId/references/format
// Formats references as a ready-to-use bibliography using CSL
router.post("/projects/:projectId/references/format", async (req, res): Promise<void> => {
  const params = FormatCSLBibliographyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user.id, res);
  if (!ok) return;

  const query = FormatCSLBibliographyQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const formatParam = (query.data.format ?? "APA") as CitationFormat;

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId));

  const [metadata] = await db
    .select()
    .from(projectMetadataTable)
    .where(eq(projectMetadataTable.projectId, params.data.projectId));

  const refs = await db
    .select()
    .from(referencesTable)
    .where(eq(referencesTable.projectId, params.data.projectId));

  const finalFormat = (formatParam ?? metadata?.citationFormat ?? project?.citationFormat ?? "APA") as CitationFormat;

  const formatted = formatBibliography(
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
    finalFormat
  );

  res.json({ bibliography: formatted, format: finalFormat });
});

// POST /projects/:projectId/references/regenerate
router.post("/projects/:projectId/references/regenerate", async (req, res): Promise<void> => {
  const params = RegenerateBibliographyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ok = await requireProjectOwnership(params.data.projectId, req.user.id, res);
  if (!ok) return;

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
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

  const [project2] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.projectId));

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

  const citationFormat = metadata?.citationFormat ?? project2?.citationFormat ?? "APA";
  const refList = refs
    .map(
      (r, i) =>
        `${i + 1}. ${sanitizeUserMessage(r.authors ?? "Penulis")} (${sanitizeUserMessage(String(r.year ?? "t.t."))}). ${sanitizeUserMessage(r.title)}. ${sanitizeUserMessage(r.journal ?? "")}${r.volume ? ` Vol. ${sanitizeUserMessage(String(r.volume))}` : ""}${r.issue ? ` No. ${sanitizeUserMessage(String(r.issue))}` : ""}${r.doi ? `. DOI: ${sanitizeUserMessage(r.doi)}` : ""}${r.url ? `. URL: ${sanitizeUserMessage(r.url)}` : ""}`
    )
    .join("\n");

  const systemPrompt = buildSystemPrompt({
    title: project2?.title ?? "",
    instructionText: project2?.instructionText,
    citationFormat,
  });

  const { content: aiResponse, usage, tierConfig } = await callAI(
    [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Buat daftar pustaka dalam format ${citationFormat} dari referensi berikut:\n\n${refList}\n\nFormat output: daftar pustaka siap pakai dalam format ${citationFormat} yang benar.`,
      },
    ],
    selectedTier.id,
  );

  const usageLog = await logAIUsage({
    userId: req.user!.id,
    projectId: params.data.projectId,
    requestType: "bibliography",
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
      description: `AI bibliography — ${selectedTier.name} tier`,
    });
  }

  await logActivity(params.data.projectId, "bibliography_regenerated", "Daftar pustaka diperbarui");

  res.json({ bibliography: aiResponse });
});

// GET /references/search
// Search CrossRef for academic papers by topic
router.get("/references/search", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const q = (req.query.q as string | undefined)?.trim();
  if (!q || q.length < 3) {
    res.status(400).json({ error: "Query must be at least 3 characters" });
    return;
  }

  const rows = Math.min(parseInt(req.query.rows as string) || 20, 50);
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const data = await searchCrossRef(q, { rows, offset });
    res.json(data);
  } catch (err) {
    console.error("[CrossRef Search]", err);
    const message = err instanceof Error ? err.message : "Search failed";
    res.status(502).json({ error: message });
  }
});

// POST /references/fetch-metadata
// Fetches reference metadata from CrossRef (DOI) or Open Library (ISBN)
router.post("/references/fetch-metadata", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { identifier } = req.body as { identifier?: string };
  if (!identifier || typeof identifier !== "string") {
    res.status(400).json({ error: "identifier is required" });
    return;
  }

  const type = detectIdentifierType(identifier);
  if (type === "unknown") {
    res.status(400).json({ error: "Identifier must be a valid DOI or ISBN-10/ISBN-13" });
    return;
  }

  const metadata = await fetchMetadata(identifier);

  if (!metadata) {
    res.status(404).json({ error: `No metadata found for this ${type.toUpperCase()}` });
    return;
  }

  res.json(metadata);
});

export default router;
