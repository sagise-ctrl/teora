import { Router, type IRouter } from "express";
import { eq, desc, and, isNull } from "drizzle-orm";
import { db, exportsTable, documentVersionsTable, documentsTable } from "@workspace/db";
import {
  ListExportsParams,
  CreateExportParams,
  CreateExportBody,
} from "@workspace/api-zod";
import { logActivity } from "../lib/activity";
import { requireProjectOwnership } from "../lib/ownership";
import path from "path";
import fs from "fs/promises";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";

const EXPORT_DIR = process.env.EXPORT_DIR ?? "/tmp/academic-workspace-exports";

const router: IRouter = Router();

/**
 * Parse simple markdown to array of DOCX paragraphs.
 * Handles: headings (# ## ###), bold (**text**), italic (*text*), lists (- item, 1. item), paragraphs.
 */
function markdownToParagraphs(markdown: string): Paragraph[] {
  const lines = markdown.split(/\r?\n/);
  const paragraphs: Paragraph[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      paragraphs.push(new Paragraph({ text: "" }));
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          text: line.substring(4),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 120 },
        })
      );
      continue;
    }
    if (line.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          text: line.substring(3),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 360, after: 160 },
        })
      );
      continue;
    }
    if (line.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          text: line.substring(2),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 480, after: 200 },
        })
      );
      continue;
    }

    // Unordered list
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const text = line.substring(2).replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
      paragraphs.push(
        new Paragraph({
          text: text,
          bullet: { level: 0 },
          spacing: { before: 60, after: 60 },
        })
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s/, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
      paragraphs.push(
        new Paragraph({
          text: text,
          spacing: { before: 60, after: 60 },
        })
      );
      continue;
    }

    // Regular paragraph — inline formatting
    const runs = parseInlineRuns(line);
    paragraphs.push(
      new Paragraph({
        children: runs,
        spacing: { before: 120, after: 120 },
      })
    );
  }

  return paragraphs;
}

/**
 * Parse inline markdown formatting into DOCX TextRun array.
 */
function parseInlineRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|_(.+?)_/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.substring(lastIndex, match.index) }));
    }

    if (match[1]) {
      // **bold**
      runs.push(new TextRun({ text: match[1], bold: true }));
    } else if (match[2]) {
      // *italic*
      runs.push(new TextRun({ text: match[2], italics: true }));
    } else if (match[3]) {
      // __bold__
      runs.push(new TextRun({ text: match[3], bold: true }));
    } else if (match[4]) {
      // _italic_
      runs.push(new TextRun({ text: match[4], italics: true }));
    }

    lastIndex = regex.lastIndex;
  }

  // Remaining text
  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.substring(lastIndex) }));
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text }));
  }

  return runs;
}

// GET /projects/:projectId/exports
router.get("/projects/:projectId/exports", async (req, res): Promise<void> => {
  const params = ListExportsParams.safeParse(req.params);
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

  const exports = await db
    .select()
    .from(exportsTable)
    .where(eq(exportsTable.projectId, params.data.projectId))
    .orderBy(desc(exportsTable.createdAt));

  res.json(
    exports.map((e) => ({
      ...e,
      filePath: e.filePath ?? null,
    }))
  );
});

// POST /projects/:projectId/exports
router.post("/projects/:projectId/exports", async (req, res): Promise<void> => {
  const params = ListExportsParams.safeParse(req.params);
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

  const parsed = CreateExportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Get the document to export
  let doc;
  if (parsed.data.documentVersionId) {
    [doc] = await db
      .select()
      .from(documentVersionsTable)
      .where(eq(documentVersionsTable.id, parsed.data.documentVersionId));
  } else {
    const projectId = params.data.projectId;
    const [activeDoc] = await db
      .select()
      .from(documentsTable)
      .where(and(eq(documentsTable.projectId, projectId), eq(documentsTable.isActive, true)));

    if (activeDoc) {
      [doc] = await db
        .select()
        .from(documentVersionsTable)
        .where(eq(documentVersionsTable.documentId, activeDoc.id))
        .orderBy(desc(documentVersionsTable.versionNumber))
        .limit(1);
    }

    if (!doc) {
      [doc] = await db
        .select()
        .from(documentVersionsTable)
        .where(and(eq(documentVersionsTable.projectId, projectId), isNull(documentVersionsTable.documentId)))
        .orderBy(desc(documentVersionsTable.versionNumber))
        .limit(1);
    }
  }

  if (!doc) {
    res.status(404).json({ error: "No document to export" });
    return;
  }

  await fs.mkdir(EXPORT_DIR, { recursive: true });

  const timestamp = Date.now();
  const filename = `export-${params.data.projectId}-v${doc.versionNumber}-${timestamp}`;
  const content = doc.content ?? "";

  if (parsed.data.format === "docx") {
    // Real DOCX generation
    const paragraphs = markdownToParagraphs(content);
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const filePath = path.join(EXPORT_DIR, `${filename}.docx`);
    await fs.writeFile(filePath, buffer);

    const [exportRecord] = await db
      .insert(exportsTable)
      .values({
        projectId: params.data.projectId,
        format: "docx",
        status: "completed",
        filePath: `/api/exports/download/${filename}.docx`,
      })
      .returning();

    await logActivity(
      params.data.projectId,
      "export_created",
      `Dokumen diekspor sebagai DOCX`
    );

    res.status(201).json({ ...exportRecord, filePath: exportRecord.filePath ?? null });
    return;
  }

  // Markdown export (native)
  const filePath = path.join(EXPORT_DIR, `${filename}.md`);
  await fs.writeFile(filePath, content, "utf-8");

  const [exportRecord] = await db
    .insert(exportsTable)
    .values({
      projectId: params.data.projectId,
      format: "markdown",
      status: "completed",
      filePath: `/api/exports/download/${filename}.md`,
    })
    .returning();

  await logActivity(
    params.data.projectId,
    "export_created",
    `Dokumen diekspor sebagai Markdown`
  );

  res.status(201).json({ ...exportRecord, filePath: exportRecord.filePath ?? null });
});

// GET /exports/download/:filename
router.get("/exports/download/:filename", async (req, res): Promise<void> => {
  const { filename } = req.params as { filename?: string };
  if (!filename) {
    res.status(400).json({ error: "Missing filename" });
    return;
  }

  // Sanitize: only allow alphanumeric, dash, dot
  if (!/^[a-zA-Z0-9_.-]+$/.test(filename)) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }

  const filePath = path.join(EXPORT_DIR, filename);

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      res.status(404).json({ error: "File not found" });
      return;
    }
  } catch {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".md": "text/markdown",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };

  res.setHeader("Content-Type", mimeTypes[ext] ?? "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");

  const fileBuffer = await fs.readFile(filePath);
  res.send(fileBuffer);
});

export default router;
