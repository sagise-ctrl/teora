import { Router, type IRouter, type Request } from "express";
import { eq, or, isNull, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { db, documentTemplatesTable } from "@workspace/db";

const router: IRouter = Router();

const createTemplateSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(60).default("custom"),
  outline: z.string().min(1),
  citationFormat: z.string().max(40).optional(),
  minRefCount: z.number().int().min(0).max(100).default(5),
  description: z.string().max(500).optional(),
  tags: z.string().max(255).optional(),
  isPublic: z.boolean().default(false),
});

const updateTemplateSchema = createTemplateSchema.partial();

function toTemplateJson(t: typeof documentTemplatesTable.$inferSelect) {
  return {
    id: t.id,
    userId: t.userId ?? null,
    name: t.name,
    category: t.category,
    outline: t.outline,
    citationFormat: t.citationFormat ?? null,
    minRefCount: t.minRefCount,
    description: t.description ?? null,
    tags: t.tags ?? null,
    isPublic: t.isPublic,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

// GET /templates — list templates (user's own + public system templates)
router.get("/templates", async (req: Request, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const templates = await db
    .select()
    .from(documentTemplatesTable)
    .where(
      or(
        eq(documentTemplatesTable.userId, req.user.id),
        isNull(documentTemplatesTable.userId)
      )
    )
    .orderBy(desc(documentTemplatesTable.createdAt));

  res.json(templates.map(toTemplateJson));
});

// GET /templates/categories — list distinct categories
router.get("/templates/categories", async (req: Request, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  // Static list of common Indonesian academic categories
  res.json({
    categories: [
      { value: "skripsi", label: "Skripsi" },
      { value: "proposal", label: "Proposal Penelitian" },
      { value: "laporan", label: "Laporan" },
      { value: "makalah", label: "Makalah" },
      { value: "tesis", label: "Tesis" },
      { value: "disertasi", label: "Disertasi" },
      { value: "artikel", label: "Artikel Ilmiah" },
      { value: "kp", label: "Laporan Kerja Praktek" },
      { value: "custom", label: "Custom" },
    ],
  });
});

// GET /templates/:templateId — get one template
router.get("/templates/:templateId", async (req: Request, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const templateId = Number(req.params.templateId);
  if (isNaN(templateId)) {
    res.status(400).json({ error: "ID template tidak valid." });
    return;
  }

  const [template] = await db
    .select()
    .from(documentTemplatesTable)
    .where(eq(documentTemplatesTable.id, templateId))
    .limit(1);

  if (!template) {
    res.status(404).json({ error: "Template tidak ditemukan." });
    return;
  }

  // Authorization: user can access their own, public templates, OR has shared visibility (system templates userId=null)
  const isOwn = template.userId === req.user.id;
  const isPublic = template.isPublic;
  const isSystem = template.userId === null;

  if (!isOwn && !isPublic && !isSystem) {
    res.status(403).json({ error: "Anda tidak memiliki akses ke proyek ini." });
    return;
  }

  res.json(toTemplateJson(template));
});

// POST /templates — create user template
router.post("/templates", async (req: Request, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const parsed = createTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;

  const [template] = await db
    .insert(documentTemplatesTable)
    .values({
      userId: req.user.id,
      name: data.name,
      category: data.category,
      outline: data.outline,
      citationFormat: data.citationFormat ?? null,
      minRefCount: data.minRefCount,
      description: data.description ?? null,
      tags: data.tags ?? null,
      isPublic: data.isPublic,
    })
    .returning();

  res.status(201).json(toTemplateJson(template));
});

// PUT /templates/:templateId — update template (only own)
router.put("/templates/:templateId", async (req: Request, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const templateId = Number(req.params.templateId);
  if (isNaN(templateId)) {
    res.status(400).json({ error: "ID template tidak valid." });
    return;
  }

  const parsed = updateTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Check ownership
  const [existing] = await db
    .select()
    .from(documentTemplatesTable)
    .where(eq(documentTemplatesTable.id, templateId))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Template tidak ditemukan." });
    return;
  }

  // System templates (userId=null) cannot be modified
  if (existing.userId === null) {
    res.status(403).json({ error: "Template sistem tidak bisa diubah." });
    return;
  }

  if (existing.userId !== req.user.id) {
    res.status(403).json({ error: "Anda tidak memiliki akses ke proyek ini." });
    return;
  }

  const updates: Record<string, unknown> = {};
  const data = parsed.data;
  if (data.name !== undefined) updates.name = data.name;
  if (data.category !== undefined) updates.category = data.category;
  if (data.outline !== undefined) updates.outline = data.outline;
  if (data.citationFormat !== undefined) updates.citationFormat = data.citationFormat;
  if (data.minRefCount !== undefined) updates.minRefCount = data.minRefCount;
  if (data.description !== undefined) updates.description = data.description;
  if (data.tags !== undefined) updates.tags = data.tags;
  if (data.isPublic !== undefined) updates.isPublic = data.isPublic;
  updates.updatedAt = new Date();

  const [updated] = await db
    .update(documentTemplatesTable)
    .set(updates)
    .where(eq(documentTemplatesTable.id, templateId))
    .returning();

  res.json(toTemplateJson(updated));
});

// DELETE /templates/:templateId — delete template (only own)
router.delete("/templates/:templateId", async (req: Request, res): Promise<void> => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Sesi Anda habis. Silakan login kembali." });
    return;
  }

  const templateId = Number(req.params.templateId);
  if (isNaN(templateId)) {
    res.status(400).json({ error: "ID template tidak valid." });
    return;
  }

  // Check ownership
  const [existing] = await db
    .select()
    .from(documentTemplatesTable)
    .where(eq(documentTemplatesTable.id, templateId))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Template tidak ditemukan." });
    return;
  }

  // System templates (userId=null) cannot be deleted
  if (existing.userId === null) {
    res.status(403).json({ error: "Template sistem tidak bisa dihapus." });
    return;
  }

  if (existing.userId !== req.user.id) {
    res.status(403).json({ error: "Anda tidak memiliki akses ke proyek ini." });
    return;
  }

  await db.delete(documentTemplatesTable).where(eq(documentTemplatesTable.id, templateId));

  res.sendStatus(204);
});

export default router;