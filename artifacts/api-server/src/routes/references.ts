import { Router, type IRouter } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  db,
  referencesTable,
  referenceCitationsTable,
  projectMetadataTable,
  projectsTable,
  documentVersionsTable,
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
  // DECISION 014 — Reference Tool + Auto-Cite
  AutoCiteReferencesParams,
  AutoCiteReferencesBody,
  ToggleReferenceSelectionParams,
  ToggleReferenceSelectionBody,
  ListCitationsParams,
  CreateCitationParams,
  CreateCitationBody,
  UpdateCitationParams,
  UpdateCitationBody,
  DeleteCitationParams,
  SetProjectCitationFormatParams,
  SetProjectCitationFormatBody,
} from "@workspace/api-zod";
import { callAI, buildSystemPrompt, getTierConfig, getTierForUser } from "../lib/ai.js";
import { logActivity } from "../lib/activity.js";
import { requireProjectOwnership } from "../lib/ownership.js";
import { logAIUsage } from "../lib/ai-usage-log.js";
import { checkCreditBalance, deductCredit } from "../lib/credit.js";
import { sanitizeUserMessage } from "../lib/prompt-injection.js";
import { validateReference, validateDOI, validateISBN, formatBibliography, formatCitationMarker, type CitationFormat } from "../lib/citation.js";
import { computeSequentialNumbers } from "../lib/citation-rendering.js";
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

// ──────────────────────────────────────────────────────────────────
// DECISION 014 — Reference Tool + Auto-Cite + Pustaka Saya
// Phase 1: Citation management (CRUD) + ceklist toggle + citation-format
// + AI auto-cite endpoint
// ──────────────────────────────────────────────────────────────────

// PATCH /projects/:projectId/references/:referenceId/select
// Toggle the ceklist status of a single reference. When true, the reference is
// included in the bibliography and eligible for AI auto-cite.
router.patch("/projects/:projectId/references/:referenceId/select", async (req, res): Promise<void> => {
  const params = ToggleReferenceSelectionParams.safeParse(req.params);
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

  const body = ToggleReferenceSelectionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [ref] = await db
    .update(referencesTable)
    .set({ isSelected: body.data.isSelected })
    .where(
      and(
        eq(referencesTable.id, params.data.referenceId),
        eq(referencesTable.projectId, params.data.projectId),
      ),
    )
    .returning();

  if (!ref) {
    res.status(404).json({ error: "Reference not found" });
    return;
  }

  await logActivity(
    params.data.projectId,
    "reference_selection_toggled",
    `Referensi "${ref.title}" ${body.data.isSelected ? "dicentang" : "dihilangkan"} dari daftar pustaka`,
  );

  res.json({
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
    isSelected: ref.isSelected,
    source: ref.source,
  });
});

// GET /projects/:projectId/citations
// List all citation marker positions for a project.
router.get("/projects/:projectId/citations", async (req, res): Promise<void> => {
  const params = ListCitationsParams.safeParse(req.params);
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

  const rows = await db
    .select()
    .from(referenceCitationsTable)
    .where(eq(referenceCitationsTable.projectId, params.data.projectId));

  res.json(
    rows.map((c) => ({
      id: c.id,
      projectId: c.projectId,
      referenceId: c.referenceId,
      paragraphIndex: c.paragraphIndex,
      offsetInParagraph: c.offsetInParagraph,
      formatMarker: c.formatMarker,
      placementReason: c.placementReason ?? null,
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
      updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
    })),
  );
});

// POST /projects/:projectId/citations
// Manually add a citation marker at a specific position. Used when user inserts
// citation manually (not via AI auto-cite).
router.post("/projects/:projectId/citations", async (req, res): Promise<void> => {
  const params = CreateCitationParams.safeParse(req.params);
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

  const body = CreateCitationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  // Verify the reference belongs to the project
  const [ref] = await db
    .select()
    .from(referencesTable)
    .where(
      and(
        eq(referencesTable.id, body.data.referenceId),
        eq(referencesTable.projectId, params.data.projectId),
      ),
    );

  if (!ref) {
    res.status(404).json({ error: "Reference not found in this project" });
    return;
  }

  const [citation] = await db
    .insert(referenceCitationsTable)
    .values({
      projectId: params.data.projectId,
      referenceId: body.data.referenceId,
      paragraphIndex: body.data.paragraphIndex,
      offsetInParagraph: body.data.offsetInParagraph ?? 0,
      formatMarker: body.data.formatMarker,
      placementReason: body.data.placementReason ?? null,
    })
    .returning();

  await logActivity(
    params.data.projectId,
    "citation_added",
    `Sitasi manual ditambahkan untuk referensi "${ref.title}" di paragraf ${body.data.paragraphIndex}`,
  );

  res.status(201).json({
    id: citation.id,
    projectId: citation.projectId,
    referenceId: citation.referenceId,
    paragraphIndex: citation.paragraphIndex,
    offsetInParagraph: citation.offsetInParagraph,
    formatMarker: citation.formatMarker,
    placementReason: citation.placementReason ?? null,
    createdAt: citation.createdAt instanceof Date ? citation.createdAt.toISOString() : citation.createdAt,
    updatedAt: citation.updatedAt instanceof Date ? citation.updatedAt.toISOString() : citation.updatedAt,
  });
});

// PATCH /projects/:projectId/citations/:citationId
// Update citation position (drag) or format marker (after format change).
router.patch("/projects/:projectId/citations/:citationId", async (req, res): Promise<void> => {
  const params = UpdateCitationParams.safeParse(req.params);
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

  const body = UpdateCitationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  // Verify the citation belongs to the project
  const [existing] = await db
    .select()
    .from(referenceCitationsTable)
    .where(
      and(
        eq(referenceCitationsTable.id, params.data.citationId),
        eq(referenceCitationsTable.projectId, params.data.projectId),
      ),
    );

  if (!existing) {
    res.status(404).json({ error: "Citation not found" });
    return;
  }

  const [updated] = await db
    .update(referenceCitationsTable)
    .set({
      paragraphIndex: body.data.paragraphIndex ?? existing.paragraphIndex,
      offsetInParagraph: body.data.offsetInParagraph ?? existing.offsetInParagraph,
      formatMarker: body.data.formatMarker ?? existing.formatMarker,
      placementReason: body.data.placementReason ?? existing.placementReason,
    })
    .where(eq(referenceCitationsTable.id, params.data.citationId))
    .returning();

  res.json({
    id: updated.id,
    projectId: updated.projectId,
    referenceId: updated.referenceId,
    paragraphIndex: updated.paragraphIndex,
    offsetInParagraph: updated.offsetInParagraph,
    formatMarker: updated.formatMarker,
    placementReason: updated.placementReason ?? null,
    createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : updated.createdAt,
    updatedAt: updated.updatedAt instanceof Date ? updated.updatedAt.toISOString() : updated.updatedAt,
  });
});

// DELETE /projects/:projectId/citations/:citationId
// Remove a citation marker.
router.delete("/projects/:projectId/citations/:citationId", async (req, res): Promise<void> => {
  const params = DeleteCitationParams.safeParse(req.params);
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

  const [deleted] = await db
    .delete(referenceCitationsTable)
    .where(
      and(
        eq(referenceCitationsTable.id, params.data.citationId),
        eq(referenceCitationsTable.projectId, params.data.projectId),
      ),
    )
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Citation not found" });
    return;
  }

  await logActivity(
    params.data.projectId,
    "citation_removed",
    `Sitasi dihapus dari paragraf ${deleted.paragraphIndex}`,
  );

  res.sendStatus(204);
});

// PATCH /projects/:projectId/citation-format
// Set the citation format for a project. Triggers re-render of all citation
// markers using the new format (so APA → IEEE changes all "(Smith, 2023)"
// markers to "[42]").
router.patch("/projects/:projectId/citation-format", async (req, res): Promise<void> => {
  const params = SetProjectCitationFormatParams.safeParse(req.params);
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

  const body = SetProjectCitationFormatBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const newFormat = body.data.citationFormat as CitationFormat;

  // Update project
  const [project] = await db
    .update(projectsTable)
    .set({ citationFormat: newFormat, updatedAt: new Date() })
    .where(eq(projectsTable.id, params.data.projectId))
    .returning();

  // Mirror to projectMetadataTable
  await db
    .insert(projectMetadataTable)
    .values({
      projectId: params.data.projectId,
      citationFormat: newFormat,
    })
    .onConflictDoUpdate({
      target: projectMetadataTable.projectId,
      set: { citationFormat: newFormat, updatedAt: new Date() },
    });

  // Re-render all existing citation markers using the new format
  const citations = await db
    .select({
      citation: referenceCitationsTable,
      reference: referencesTable,
    })
    .from(referenceCitationsTable)
    .innerJoin(
      referencesTable,
      eq(referenceCitationsTable.referenceId, referencesTable.id),
    )
    .where(eq(referenceCitationsTable.projectId, params.data.projectId));

  // DECISION 014 Phase 2: For numbered formats (IEEE, Vancouver, Chicago),
  // use sequential numbers based on order of appearance in the document
  // (not reference.id which doesn't follow IEEE convention).
  const sequentialNumbers = computeSequentialNumbers(
    citations.map(({ citation, reference }) => ({
      id: citation.id,
      referenceId: citation.referenceId,
      paragraphIndex: citation.paragraphIndex,
      offsetInParagraph: citation.offsetInParagraph,
      formatMarker: citation.formatMarker,
      placementReason: citation.placementReason ?? null,
      reference: {
        title: reference.title,
        authors: reference.authors,
        year: reference.year,
        journal: reference.journal,
        doi: reference.doi,
        url: reference.url,
      },
    })),
  );

  const NUMBERED_FORMATS: ReadonlySet<CitationFormat> = new Set([
    "IEEE",
    "Vancouver",
    "Chicago",
  ]);

  for (const { citation, reference } of citations) {
    let newMarker: string;
    if (
      NUMBERED_FORMATS.has(newFormat) &&
      sequentialNumbers.has(citation.referenceId)
    ) {
      newMarker = `[${sequentialNumbers.get(citation.referenceId)}]`;
    } else {
      newMarker = formatCitationMarker(
        {
          title: reference.title,
          authors: reference.authors,
          year: reference.year,
          journal: reference.journal,
          volume: reference.volume,
          issue: reference.issue,
          doi: reference.doi,
          url: reference.url,
        },
        newFormat,
        reference.id,
      );
    }
    if (newMarker !== citation.formatMarker) {
      await db
        .update(referenceCitationsTable)
        .set({ formatMarker: newMarker, updatedAt: new Date() })
        .where(eq(referenceCitationsTable.id, citation.id));
    }
  }

  await logActivity(
    params.data.projectId,
    "citation_format_changed",
    `Format sitasi diubah ke ${newFormat}, ${citations.length} marker diperbarui`,
  );

  res.json({
    ...project,
    instructionText: project.instructionText ?? null,
    subject: project.subject ?? null,
    taskType: project.taskType ?? null,
    citationFormat: project.citationFormat ?? null,
    outputFormat: project.outputFormat ?? null,
    minRefYear: project.minRefYear ?? null,
    minRefCount: project.minRefCount ?? null,
    aiDisclosure: project.aiDisclosure,
    status: project.status,
    progress: project.progress,
  });
});

// POST /projects/:projectId/references/auto-cite
// AI suggests citation positions for selected references. The AI reads the
// document + references, then returns structured JSON with positions to cite
// each reference. Suggestions are returned to the frontend for user review
// before being persisted (user clicks "Apply" → frontend POSTs each accepted
// one to /citations).
router.post("/projects/:projectId/references/auto-cite", async (req, res): Promise<void> => {
  const params = AutoCiteReferencesParams.safeParse(req.params);
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

  const body = AutoCiteReferencesBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  // Load project + metadata for citation format
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

  const citationFormat = (metadata?.citationFormat ?? project.citationFormat ?? "APA") as CitationFormat;

  // Determine which references to consider:
  // - If body.referenceIds provided AND non-empty, use those
  // - Otherwise, use ceklist-selected references (isSelected = true)
  let candidateReferences;
  if (body.data.referenceIds && body.data.referenceIds.length > 0) {
    candidateReferences = await db
      .select()
      .from(referencesTable)
      .where(
        and(
          eq(referencesTable.projectId, params.data.projectId),
          inArray(referencesTable.id, body.data.referenceIds),
        ),
      );
  } else {
    candidateReferences = await db
      .select()
      .from(referencesTable)
      .where(
        and(
          eq(referencesTable.projectId, params.data.projectId),
          eq(referencesTable.isSelected, true),
        ),
      );
  }

  if (candidateReferences.length === 0) {
    res.json({
      suggestions: [],
      totalTokensUsed: 0,
      referencesAnalyzed: 0,
    });
    return;
  }

  // Get latest document content
  const [latestVersion] = await db
    .select()
    .from(documentVersionsTable)
    .where(eq(documentVersionsTable.projectId, params.data.projectId))
    .orderBy(desc(documentVersionsTable.versionNumber))
    .limit(1);

  const documentText = latestVersion?.content ?? "";
  // Split into paragraphs by double newline (or single newline fallback)
  const paragraphs = documentText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) {
    res.json({
      suggestions: [],
      totalTokensUsed: 0,
      referencesAnalyzed: candidateReferences.length,
      warning: "Dokumen kosong — tidak ada paragraf untuk dianalisis.",
    });
    return;
  }

  // Resolve tier
  const requestedTier = body.data.tier;
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
    const creditCheck = await checkCreditBalance(
      project.userId,
      estimatedCostCents,
      false,
    );
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

  const maxPerReference = body.data.maxCitationsPerReference ?? 3;

  // Build AI prompt
  const systemPrompt = buildSystemPrompt({
    title: project.title ?? "",
    instructionText: project.instructionText,
    citationFormat,
  });

  const userPrompt = `TUGAS: Sarankan posisi sitasi untuk ${candidateReferences.length} referensi di dokumen dengan ${paragraphs.length} paragraf.

KONTEKS PROJECT:
- Judul: ${sanitizeUserMessage(project.title ?? "(tanpa judul)")}
- Format sitasi: ${citationFormat}
- Maksimal sitasi per referensi: ${maxPerReference}

ATURAN KETAT:
- Output JSON MURNI. Tidak ada teks lain.
- Hanya paragraf yang truly relevan. Jangan dipaksakan.
- offsetInParagraph: posisi karakter (0-based) di akhir kalimat yang relevan dalam paragraf. Jika ragu, gunakan panjang paragraf (akhir paragraf).
- reason: 1 kalimat singkat dalam Bahasa Indonesia.

FORMAT OUTPUT:
{
  "citations": [
    {
      "referenceId": <number>,
      "paragraphIndex": <number>,
      "offsetInParagraph": <number>,
      "reason": "<string>"
    }
  ]
}

DOKUMEN (${paragraphs.length} paragraf):
${paragraphs
  .slice(0, 80)
  .map((p, i) => `[Paragraf ${i}]\n${sanitizeUserMessage(p.substring(0, 800))}${p.length > 800 ? "\n...[dipotong]" : ""}`)
  .join("\n\n")}

REFERENSI YANG HARUS DIANALISIS (${candidateReferences.length}):
${candidateReferences
  .map(
    (r) =>
      `[ID ${r.id}] ${sanitizeUserMessage(r.authors ?? "Anon.")} (${r.year ?? "t.t."}). ${sanitizeUserMessage(r.title)}.${r.journal ? ` ${sanitizeUserMessage(r.journal)}.` : ""}`,
  )
  .join("\n")}`;

  let aiResponse: string;
  let usage: { inputTokens: number; outputTokens: number; estimatedCostUsd: number; costCents: number; tierId: string };
  let tierConfig: typeof selectedTier;

  try {
    const result = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      selectedTier.id,
    );
    aiResponse = result.content;
    usage = result.usage;
    tierConfig = result.tierConfig;
  } catch (err) {
    console.error("[auto-cite] AI call failed:", err);
    res.status(502).json({ error: "AI provider error", detail: err instanceof Error ? err.message : String(err) });
    return;
  }

  // Log AI usage
  const usageLog = await logAIUsage({
    userId: req.user!.id,
    projectId: params.data.projectId,
    requestType: "citations",
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
      description: `AI auto-cite — ${selectedTier.name} tier`,
    });
  }

  // Parse AI response as JSON
  let suggestions: Array<{
    referenceId: number;
    paragraphIndex: number;
    offsetInParagraph: number;
    placementReason: string;
  }> = [];

  try {
    // AI sometimes wraps JSON in code fences; strip them if present
    const cleaned = aiResponse
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    if (parsed && Array.isArray(parsed.citations)) {
      suggestions = parsed.citations
        .filter((c: unknown): c is { referenceId: number; paragraphIndex: number; offsetInParagraph: number; reason: string } => {
          return (
            typeof c === "object" &&
            c !== null &&
            typeof (c as Record<string, unknown>).referenceId === "number" &&
            typeof (c as Record<string, unknown>).paragraphIndex === "number"
          );
        })
        .map((c) => ({
          referenceId: c.referenceId,
          paragraphIndex: c.paragraphIndex,
          offsetInParagraph: typeof c.offsetInParagraph === "number" ? c.offsetInParagraph : 0,
          placementReason: typeof c.reason === "string" ? c.reason : "",
        }))
        // Cap to maxPerReference per refId
        .reduce((acc: typeof suggestions, c) => {
          const count = acc.filter((x) => x.referenceId === c.referenceId).length;
          if (count < maxPerReference) acc.push(c);
          return acc;
        }, []);
    }
  } catch {
    // AI response is not valid JSON — return empty suggestions + raw content for debug
    console.warn("[auto-cite] AI response not valid JSON:", aiResponse.substring(0, 200));
  }

  // Validate suggestions and compute formatMarker for each
  const validSuggestions: Array<{
    referenceId: number;
    paragraphIndex: number;
    offsetInParagraph: number;
    formatMarker: string;
    placementReason: string;
  }> = [];

  const referencesById = new Map(candidateReferences.map((r) => [r.id, r]));

  for (const s of suggestions) {
    const ref = referencesById.get(s.referenceId);
    if (!ref) continue; // AI referenced an ID we don't have — skip
    if (s.paragraphIndex < 0 || s.paragraphIndex >= paragraphs.length) continue; // out of range

    const paragraphText = paragraphs[s.paragraphIndex];
    let offset = s.offsetInParagraph;
    if (offset < 0 || offset > paragraphText.length) {
      offset = paragraphText.length;
    }

    const marker = formatCitationMarker(
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
      citationFormat,
      ref.id,
    );

    validSuggestions.push({
      referenceId: s.referenceId,
      paragraphIndex: s.paragraphIndex,
      offsetInParagraph: offset,
      formatMarker: marker,
      placementReason: s.placementReason || "",
    });
  }

  await logActivity(
    params.data.projectId,
    "auto_cite_suggestions",
    `${validSuggestions.length} saran sitasi AI untuk ${candidateReferences.length} referensi`,
  );

  res.json({
    suggestions: validSuggestions,
    totalTokensUsed: usage.inputTokens + usage.outputTokens,
    referencesAnalyzed: candidateReferences.length,
  });
});

export default router;
