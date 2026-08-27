/**
 * PDF Export — generates PDF documents using pdfkit.
 *
 * Standard fonts are resolved via the pdfkitFontsPlugin in build.mjs,
 * which intercepts pdfkit/standard-fonts/* imports and resolves them
 * to the actual ESM font descriptor files.
 */

import PDFDocument from "pdfkit";
import type { PDFKitDocument } from "pdfkit";

export interface Reference {
  authors?: string | null;
  title?: string | null;
  year?: number | string | null;
  journal?: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  doi?: string | null;
  url?: string | null;
}

export interface PDFExportData {
  title: string;
  author?: string;
  subject?: string;
  outline?: string;
  content?: string;
  references?: Reference[];
}

function parseOutline(outlineText: string): Array<{ level: 1 | 2 | 3; text: string }> {
  const lines = outlineText.split("\n").filter((l) => l.trim());
  return lines.map((line) => {
    const trimmed = line.trim();
    if (/^BAB\s+\w+/i.test(trimmed) || /^[IVXLC]+\./.test(trimmed)) {
      return { level: 1 as const, text: trimmed };
    }
    if (/^\d+\.\d+/.test(trimmed)) {
      return { level: 2 as const, text: trimmed };
    }
    return { level: 3 as const, text: trimmed };
  });
}

function formatReferenceAPA(ref: Reference, index: number): string {
  const parts: string[] = [];

  if (ref.authors) parts.push(ref.authors);
  if (ref.year) parts.push(`(${ref.year})`);
  if (ref.title) parts.push(`"${ref.title}."`);
  if (ref.journal) {
    let journalPart = `*${ref.journal}*`;
    if (ref.volume) journalPart += `, ${ref.volume}`;
    if (ref.issue) journalPart += `(${ref.issue})`;
    if (ref.pages) journalPart += `, ${ref.pages}`;
    journalPart += ".";
    parts.push(journalPart);
  }
  if (ref.doi) parts.push(`https://doi.org/${ref.doi}`);
  else if (ref.url) parts.push(ref.url);

  return `${index + 1}. ${parts.join(" ")}`;
}

export interface PDFExportResult {
  buffer: Buffer;
  filename: string;
}

export async function generatePDF(data: PDFExportData): Promise<PDFExportResult> {
  return new Promise((resolve, reject) => {
    try {
      const doc: PDFKitDocument = new PDFDocument({
        autoFirstPage: true,
        size: "A4",
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        info: {
          Title: data.title,
          Author: data.author ?? "Teora AI Academic Workspace",
          Subject: data.subject,
          Creator: "Teora AI Academic Workspace",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const safeName = data.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_").substring(0, 50);
        resolve({ buffer, filename: `${safeName}.pdf` });
      });
      doc.on("error", reject);

      // ─── Header ─────────────────────────────────────────────────────────────
      const pageWidth = doc.page.width - 144; // 72pt margins each side

      doc.font("Helvetica-Bold").fontSize(18).fillColor("#111");
      const titleLines = doc.text(data.title, { width: pageWidth, align: "center" });
      doc.moveDown(titleLines > 1 ? 0.5 : 1);

      if (data.author) {
        doc.font("Helvetica").fontSize(11).fillColor("#333");
        doc.text(`Oleh: ${data.author}`, { width: pageWidth, align: "center" });
      }
      if (data.subject) {
        doc.font("Helvetica").fontSize(10).fillColor("#666");
        doc.text(`Topik: ${data.subject}`, { width: pageWidth, align: "center" });
      }
      doc.moveDown(1);

      // Divider line
      doc.strokeColor("#d1d5db").lineWidth(1)
        .moveTo(72, doc.y)
        .lineTo(doc.page.width - 72, doc.y)
        .stroke();
      doc.moveDown(1.5);

      // ─── Outline (Daftar Isi) ──────────────────────────────────────────────
      if (data.outline) {
        const outlineItems = parseOutline(data.outline);
        doc.font("Helvetica-Bold").fontSize(13).fillColor("#1f2937");
        doc.text("DAFTAR ISI", { continued: false });
        doc.moveDown(0.75);

        doc.font("Helvetica").fontSize(11).fillColor("#374151");
        for (const item of outlineItems) {
          const indent = (item.level - 1) * 20;
          doc.text(item.text, {
            width: pageWidth - indent,
            indent,
            continued: false,
          });
          doc.moveDown(0.25);
        }
        doc.moveDown(1);
      }

      // ─── Content ────────────────────────────────────────────────────────────
      if (data.content) {
        const blocks = data.content.split(/\n{2,}/);

        for (const block of blocks) {
          const trimmed = block.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith("# ")) {
            // H1
            if (doc.y > doc.page.height - 120) doc.addPage();
            doc.moveDown(0.5);
            doc.font("Helvetica-Bold").fontSize(15).fillColor("#111");
            doc.text(trimmed.slice(2), { width: pageWidth });
            doc.moveDown(0.5);
          } else if (trimmed.startsWith("## ")) {
            // H2
            if (doc.y > doc.page.height - 100) doc.addPage();
            doc.font("Helvetica-Bold").fontSize(13).fillColor("#1f2937");
            doc.text(trimmed.slice(3), { width: pageWidth });
            doc.moveDown(0.4);
          } else if (trimmed.startsWith("### ")) {
            // H3
            doc.font("Helvetica-Bold").fontSize(12).fillColor("#374151");
            doc.text(trimmed.slice(4), { width: pageWidth });
            doc.moveDown(0.3);
          } else {
            // Paragraph
            if (doc.y > doc.page.height - 80) doc.addPage();
            doc.font("Helvetica").fontSize(11).fillColor("#1a1a1a");
            doc.text(trimmed, { width: pageWidth, align: "justify" });
            doc.moveDown(0.6);
          }
        }
      }

      // ─── References (Daftar Pustaka) ────────────────────────────────────────
      if (data.references && data.references.length > 0) {
        if (doc.y > doc.page.height - 100) doc.addPage();
        doc.moveDown(1);
        doc.strokeColor("#d1d5db").lineWidth(1)
          .moveTo(72, doc.y)
          .lineTo(doc.page.width - 72, doc.y)
          .stroke();
        doc.moveDown(1);

        doc.font("Helvetica-Bold").fontSize(13).fillColor("#1f2937");
        doc.text("DAFTAR PUSTAKA", { continued: false });
        doc.moveDown(0.75);

        doc.font("Helvetica").fontSize(10).fillColor("#374151");
        data.references.forEach((ref, i) => {
          const refText = formatReferenceAPA(ref, i);
          if (doc.y > doc.page.height - 60) doc.addPage();
          doc.text(refText, {
            width: pageWidth,
            indent: 24,
            align: "justify",
          });
          doc.moveDown(0.5);
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
