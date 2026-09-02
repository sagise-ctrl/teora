import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  AlignmentType,
  convertInchesToTwip,
} from "docx";
import type { Document as DBDocument } from "@workspace/db";
import type { DocumentVersion } from "@workspace/db";

export interface ExportOptions {
  projectTitle: string;
  citationFormat?: string;
  includeReferences?: boolean;
}

interface DocumentWithContent {
  document: DBDocument;
  version: DocumentVersion | null;
}

interface ReferenceForExport {
  title: string;
  authors: string | null;
  year: number | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  doi: string | null;
  url: string | null;
}

function formatAuthorsAPA(authors: string | null): string {
  if (!authors) return "";
  const parts = authors.split(",").map((p) => p.trim());
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]}, & ${parts[1]}`;
  if (parts.length <= 20) {
    const last = parts.pop()!;
    return `${parts.join(", ")}, & ${last}`;
  }
  return `${parts.slice(0, 19).join(", ")}, ... ${parts[parts.length - 1]}`;
}

function formatReferenceAPA(ref: ReferenceForExport): string {
  const parts: string[] = [];

  // Authors
  const authors = formatAuthorsAPA(ref.authors);
  if (authors) parts.push(authors);

  // Year
  if (ref.year) parts.push(`(${ref.year}).`);

  // Title (italic in real Word but we can't do that easily in plain text)
  if (ref.title) parts.push(ref.title + ".");

  // Journal (italic)
  if (ref.journal) {
    let journalPart = ref.journal;
    if (ref.volume) journalPart += `, ${ref.volume}`;
    if (ref.issue) journalPart += `(${ref.issue})`;
    if (ref.page) journalPart += `, ${ref.page}`;
    journalPart += ".";
    parts.push(journalPart);
  }

  // DOI
  if (ref.doi) {
    parts.push(`https://doi.org/${ref.doi}`);
  } else if (ref.url) {
    parts.push(ref.url);
  }

  return parts.join(" ");
}

function parseOutlineToHeadings(outline: string | null): { level: number; text: string }[] {
  if (!outline) return [];
  const lines = outline.split("\n").map((l) => l.trim()).filter(Boolean);
  const headings: { level: number; text: string }[] = [];

  for (const line of lines) {
    // Detect heading level from leading dashes/asterisks/numbers
    const dashMatch = line.match(/^(#{1,6})\s+(.+)/);
    const dashAlt = line.match(/^([-*]+)\s+(.+)/);
    const numMatch = line.match(/^(\d+(?:\.\d+)*)\.?\s+(.+)/);
    const boldMatch = line.match(/^\*\*(.+)\*\*$/);

    if (dashMatch) {
      headings.push({ level: dashMatch[1].length, text: dashMatch[2] });
    } else if (dashAlt) {
      const depth = dashAlt[1].length;
      headings.push({ level: Math.min(depth + 1, 6), text: dashAlt[2] });
    } else if (numMatch) {
      const dots = (numMatch[1].match(/\./g) || []).length;
      headings.push({ level: dots + 1, text: numMatch[2] });
    } else if (boldMatch) {
      headings.push({ level: 3, text: boldMatch[1] });
    } else if (line.length > 0) {
      headings.push({ level: 3, text: line });
    }
  }

  return headings;
}

function makeHeading(text: string, level: number): Paragraph {
  const headingLevel = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
  ][Math.min(level - 1, 5)];

  return new Paragraph({
    text,
    heading: headingLevel,
    spacing: { before: 240, after: 120 },
  });
}

function makeParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 24 })],
    spacing: { before: 0, after: 120 },
  });
}

function makeReferenceItem(ref: ReferenceForExport, index: number): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: formatReferenceAPA(ref), size: 22 }),
    ],
    indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.5) },
    spacing: { before: 60, after: 60 },
  });
}

export async function generateDocx(
  projectTitle: string,
  documents: DocumentWithContent[],
  references: ReferenceForExport[],
  options: ExportOptions
): Promise<Buffer> {
  const sections: Paragraph[] = [];

  // ── TITLE PAGE ──────────────────────────────────────────
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: projectTitle,
          bold: true,
          size: 56,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 480 },
    })
  );

  sections.push(
    new Paragraph({
      children: [new TextRun({ text: "Dokumen ini dibuat dengan Teora AI Academic Workspace", size: 20 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    })
  );

  // ── TABLE OF CONTENTS ───────────────────────────────────
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: "Daftar Isi", bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
      spacing: { before: 480, after: 240 },
    })
  );

  for (const { document, version } of documents) {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: document.title, size: 24 })],
        indent: { left: convertInchesToTwip(0.25) },
        spacing: { before: 60, after: 60 },
      })
    );

    // Sub-headings from outline
    if (version?.outline) {
      const headings = parseOutlineToHeadings(version.outline);
      for (const h of headings.slice(0, 10)) {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: h.text, size: 22 })],
            indent: { left: convertInchesToTwip(0.5) },
            spacing: { before: 40, after: 40 },
          })
        );
      }
    }
  }

  // ── DOCUMENT CONTENT ────────────────────────────────────
  for (const { document, version } of documents) {
    // Section title
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: document.title, bold: true, size: 32 })],
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        spacing: { before: 240, after: 240 },
      })
    );

    // Outline headings
    if (version?.outline) {
      const headings = parseOutlineToHeadings(version.outline);
      for (const h of headings) {
        sections.push(makeHeading(h.text, h.level));
      }
    }

    // Content
    if (version?.content) {
      // Try to split by paragraph markers
      const blocks = version.content
        .split(/\n\n+/)
        .map((b) => b.trim())
        .filter(Boolean);

      for (const block of blocks) {
        if (block.startsWith("#")) {
          const match = block.match(/^(#{1,6})\s+(.+)/);
          if (match) {
            sections.push(makeHeading(match[2], match[1].length));
            continue;
          }
        }

        // Check if it's a list
        if (block.match(/^[-*]\s+/m)) {
          const items = block.split(/\n/).filter((l) => l.match(/^[-*]\s+/));
          for (const item of items) {
            const text = item.replace(/^[-*]\s+/, "").trim();
            sections.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `• ${text}`, size: 24 }),
                ],
                indent: { left: convertInchesToTwip(0.25) },
                spacing: { before: 60, after: 60 },
              })
            );
          }
          continue;
        }

        if (block.length > 0) {
          sections.push(makeParagraph(block));
        }
      }
    } else {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: "(Belum ada konten)", italics: true, color: "888888", size: 22 }),
          ],
          spacing: { before: 120, after: 120 },
        })
      );
    }
  }

  // ── REFERENCES ──────────────────────────────────────────
  if (references.length > 0 && options.includeReferences !== false) {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: "Daftar Pustaka", bold: true, size: 28 })],
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
        spacing: { before: 480, after: 240 },
      })
    );

    for (let i = 0; i < references.length; i++) {
      sections.push(makeReferenceItem(references[i], i + 1));
    }
  }

  // ── BUILD DOCUMENT ─────────────────────────────────────
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.25),
            },
          },
        },
        children: sections,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
