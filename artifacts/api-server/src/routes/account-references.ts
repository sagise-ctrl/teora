import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, accountReferencesTable, referencesTable } from "@workspace/db";
import { searchCrossRef } from "../lib/crossref-search.js";

const router: IRouter = Router();

// GET /account/references — list user's account-level references
router.get("/account/references", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const refs = await db
    .select()
    .from(accountReferencesTable)
    .where(eq(accountReferencesTable.userId, req.user.id))
    .orderBy(desc(accountReferencesTable.createdAt));

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
    }))
  );
});

// POST /account/references — add reference to personal pool
router.post("/account/references", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const { title, authors, year, journal, volume, issue, doi, url, isSuggested, source } = req.body as {
    title?: string;
    authors?: string;
    year?: number;
    journal?: string;
    volume?: string;
    issue?: string;
    doi?: string;
    url?: string;
    isSuggested?: boolean;
    source?: string;
  };

  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "Judul referensi wajib diisi." });
    return;
  }

  // Duplicate detection by DOI per user
  if (doi && typeof doi === "string") {
    const existing = await db
      .select({ id: accountReferencesTable.id })
      .from(accountReferencesTable)
      .where(
        and(
          eq(accountReferencesTable.userId, req.user.id),
          eq(accountReferencesTable.doi, doi)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Reference with this DOI already exists in your library" });
      return;
    }
  }

  const [ref] = await db
    .insert(accountReferencesTable)
    .values({
      userId: req.user.id,
      title: title.trim(),
      authors: authors ?? null,
      year: year ?? null,
      journal: journal ?? null,
      volume: volume ?? null,
      issue: issue ?? null,
      doi: doi ?? null,
      url: url ?? null,
      isSuggested: isSuggested ?? false,
      source: (source as "manual" | "crossref" | "file") ?? "manual",
    })
    .returning();

  res.status(201).json({
    ...ref,
    authors: ref.authors ?? null,
    year: ref.year ?? null,
    journal: ref.journal ?? null,
    volume: ref.volume ?? null,
    issue: ref.issue ?? null,
    doi: ref.doi ?? null,
    url: ref.url ?? null,
  });
});

// PUT /account/references/:id — update reference
router.put("/account/references/:id", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID referensi tidak valid." });
    return;
  }

  // Verify ownership
  const [existing] = await db
    .select()
    .from(accountReferencesTable)
    .where(
      and(
        eq(accountReferencesTable.id, id),
        eq(accountReferencesTable.userId, req.user.id)
      )
    )
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Referensi tidak ditemukan." });
    return;
  }

  const { title, authors, year, journal, volume, issue, doi, url, isSuggested, source } = req.body as {
    title?: string;
    authors?: string;
    year?: number;
    journal?: string;
    volume?: string;
    issue?: string;
    doi?: string;
    url?: string;
    isSuggested?: boolean;
    source?: string;
  };

  // Check DOI duplicate (if changing DOI)
  if (doi && doi !== existing.doi) {
    const duplicate = await db
      .select({ id: accountReferencesTable.id })
      .from(accountReferencesTable)
      .where(
        and(
          eq(accountReferencesTable.userId, req.user.id),
          eq(accountReferencesTable.doi, doi)
        )
      )
      .limit(1);

    if (duplicate.length > 0) {
      res.status(409).json({ error: "Reference with this DOI already exists in your library" });
      return;
    }
  }

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title.trim();
  if (authors !== undefined) updates.authors = authors;
  if (year !== undefined) updates.year = year;
  if (journal !== undefined) updates.journal = journal;
  if (volume !== undefined) updates.volume = volume;
  if (issue !== undefined) updates.issue = issue;
  if (doi !== undefined) updates.doi = doi;
  if (url !== undefined) updates.url = url;
  if (isSuggested !== undefined) updates.isSuggested = isSuggested;
  if (source !== undefined) updates.source = source;

  const [updated] = await db
    .update(accountReferencesTable)
    .set(updates)
    .where(
      and(
        eq(accountReferencesTable.id, id),
        eq(accountReferencesTable.userId, req.user.id)
      )
    )
    .returning();

  res.json({
    ...updated,
    authors: updated.authors ?? null,
    year: updated.year ?? null,
    journal: updated.journal ?? null,
    volume: updated.volume ?? null,
    issue: updated.issue ?? null,
    doi: updated.doi ?? null,
    url: updated.url ?? null,
  });
});

// DELETE /account/references/:id — delete reference
router.delete("/account/references/:id", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID referensi tidak valid." });
    return;
  }

  const [deleted] = await db
    .delete(accountReferencesTable)
    .where(
      and(
        eq(accountReferencesTable.id, id),
        eq(accountReferencesTable.userId, req.user.id)
      )
    )
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Referensi tidak ditemukan." });
    return;
  }

  res.sendStatus(204);
});

// POST /account/references/:id/assign — assign account reference to a project
router.post("/account/references/:id/assign", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const accountRefId = parseInt(req.params.id);
  if (isNaN(accountRefId)) {
    res.status(400).json({ error: "ID referensi tidak valid." });
    return;
  }

  const { projectId } = req.body as { projectId?: number };
  if (!projectId || typeof projectId !== "number") {
    res.status(400).json({ error: "ID proyek wajib diisi." });
    return;
  }

  // Get the account reference
  const [accountRef] = await db
    .select()
    .from(accountReferencesTable)
    .where(
      and(
        eq(accountReferencesTable.id, accountRefId),
        eq(accountReferencesTable.userId, req.user.id)
      )
    )
    .limit(1);

  if (!accountRef) {
    res.status(404).json({ error: "Referensi tidak ditemukan di pustaka Anda." });
    return;
  }

  // Check for duplicate in the project (by DOI)
  if (accountRef.doi) {
    const existingInProject = await db
      .select({ id: referencesTable.id })
      .from(referencesTable)
      .where(
        and(
          eq(referencesTable.projectId, projectId),
          eq(referencesTable.doi, accountRef.doi)
        )
      )
      .limit(1);

    if (existingInProject.length > 0) {
      res.status(409).json({ error: "This reference is already in the project" });
      return;
    }
  }

  // Insert into project references
  const [projectRef] = await db
    .insert(referencesTable)
    .values({
      projectId,
      title: accountRef.title,
      authors: accountRef.authors,
      year: accountRef.year,
      journal: accountRef.journal,
      volume: accountRef.volume,
      issue: accountRef.issue,
      doi: accountRef.doi,
      url: accountRef.url,
      isSuggested: accountRef.isSuggested,
      source: accountRef.source as "manual" | "crossref" | "file",
    })
    .returning();

  res.status(201).json({
    ...projectRef,
    authors: projectRef.authors ?? null,
    year: projectRef.year ?? null,
    journal: projectRef.journal ?? null,
    volume: projectRef.volume ?? null,
    issue: projectRef.issue ?? null,
    doi: projectRef.doi ?? null,
    url: projectRef.url ?? null,
  });
});

// POST /account/references/import — bulk import from CrossRef DOIs
router.post("/account/references/import", async (req, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const { dois } = req.body as { dois?: string[] };
  if (!dois || !Array.isArray(dois) || dois.length === 0) {
    res.status(400).json({ error: "Daftar DOI wajib diisi." });
    return;
  }

  if (dois.length > 50) {
    res.status(400).json({ error: "Maksimal 50 DOI per import." });
    return;
  }

  // Get existing DOIs for this user
  const existing = await db
    .select({ doi: accountReferencesTable.doi })
    .from(accountReferencesTable)
    .where(eq(accountReferencesTable.userId, req.user.id));

  const existingDois = new Set(
    existing.map((r) => r.doi).filter((d): d is string => d !== null)
  );

  const imported: Array<{
    id: number;
    title: string;
    authors: string | null;
    year: number | null;
    journal: string | null;
    volume: string | null;
    issue: string | null;
    doi: string | null;
    url: string | null;
    source: string;
    isSuggested: boolean;
  }> = [];
  const skipped: string[] = [];
  const failed: Array<{ doi: string; error: string }> = [];

  for (const doi of dois) {
    if (typeof doi !== "string" || !doi.trim()) continue;

    const normalizedDoi = doi.trim();
    if (existingDois.has(normalizedDoi)) {
      skipped.push(normalizedDoi);
      continue;
    }

    try {
      const data = await searchCrossRef(normalizedDoi, { rows: 1 });
      const item = data.results[0];

      if (!item) {
        failed.push({ doi: normalizedDoi, error: "No metadata found for this DOI" });
        continue;
      }

      const [ref] = await db
        .insert(accountReferencesTable)
        .values({
          userId: req.user.id,
          title: item.title ?? "Untitled",
          authors: item.authors ?? null,
          year: item.year ?? null,
          journal: item.journal ?? null,
          volume: item.volume ?? null,
          issue: item.issue ?? null,
          doi: item.doi ?? normalizedDoi,
          url: item.url ?? null,
          isSuggested: false,
          source: "crossref",
        })
        .returning();

      imported.push({
        id: ref.id,
        title: ref.title,
        authors: ref.authors ?? null,
        year: ref.year ?? null,
        journal: ref.journal ?? null,
        volume: ref.volume ?? null,
        issue: ref.issue ?? null,
        doi: ref.doi ?? null,
        url: ref.url ?? null,
        source: ref.source,
        isSuggested: ref.isSuggested,
      });

      existingDois.add(normalizedDoi);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      failed.push({ doi: normalizedDoi, error: message });
    }
  }

  res.status(201).json({
    imported,
    skipped,
    failed,
    summary: {
      total: dois.length,
      imported: imported.length,
      skipped: skipped.length,
      failed: failed.length,
    },
  });
});

export default router;
