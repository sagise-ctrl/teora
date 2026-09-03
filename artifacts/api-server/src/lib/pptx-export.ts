import PptxGenJS from "pptxgenjs";
import type { Document as DBDocument } from "@workspace/db";
import type { DocumentVersion } from "@workspace/db";

export interface PptxExportOptions {
  projectTitle: string;
  theme?: "academic" | "modern" | "minimal";
  includeReferences?: boolean;
  citationFormat?: string;
}

interface SlideData {
  title: string;
  bullets: string[];
  notes?: string;
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
  doi: string | null;
}

/** Convert document outline/content into structured slides */
function parseContentToSlides(
  documents: DocumentWithContent[]
): SlideData[] {
  const slides: SlideData[] = [];

  // Title slide
  slides.push({
    title: "",
    bullets: [],
    notes: "Title slide",
  });

  for (const { document, version } of documents) {
    const title = document.title;

    if (version?.outline) {
      // Parse outline into slides — each major heading = 1 slide
      const lines = version.outline.split("\n").map((l) => l.trim()).filter(Boolean);
      let currentSlide: SlideData | null = null;

      for (const line of lines) {
        // Heading markers: # heading, - **bold**, numbered 1. 2. etc
        const h1Match = line.match(/^#\s+(.+)/);
        const h2Match = line.match(/^##\s+(.+)/);
        const boldMatch = line.match(/^\*\*(.+)\*\*$/);
        const dashMatch = line.match(/^[-*]\s+(.+)/);
        const numMatch = line.match(/^\d+(?:\.\d+)*[\.)]\s+(.+)/);

        const heading = h1Match?.[1] ?? h2Match?.[1] ?? boldMatch?.[1];
        const bullet = dashMatch?.[1] ?? numMatch?.[1];

        if (heading) {
          // Flush previous slide
          if (currentSlide && currentSlide.bullets.length > 0) {
            slides.push(currentSlide);
          }
          currentSlide = { title: heading, bullets: [], notes: `Slide: ${heading}` };
        } else if (bullet && currentSlide) {
          // Clean markdown formatting
          const clean = bullet.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
          currentSlide.bullets.push(clean);
        } else if (line.length > 10 && !currentSlide) {
          // Orphan content before any heading → create first slide
          currentSlide = { title: title, bullets: [], notes: `Slide: ${title}` };
          slides.push(currentSlide);
          currentSlide = null;
        }
      }

      // Flush last slide
      if (currentSlide && currentSlide.bullets.length > 0) {
        slides.push(currentSlide);
      }
    } else if (version?.content) {
      // No outline — split content by paragraphs into bullets
      const paragraphs = version.content
        .split(/\n\n+/)
        .map((b) => b.trim())
        .filter(Boolean)
        .slice(0, 20); // Max 20 content slides

      if (paragraphs.length === 0) {
        slides.push({ title, bullets: ["(Tidak ada konten)"], notes: `Slide: ${title}` });
      } else {
        slides.push({ title, bullets: paragraphs, notes: `Slide: ${title}` });
      }
    } else {
      slides.push({ title, bullets: ["(Tidak ada konten)"], notes: `Slide: ${title}` });
    }
  }

  return slides;
}

/** Clean reference into a bullet for bibliography slide */
function formatReference(ref: ReferenceForExport): string {
  const parts: string[] = [];
  if (ref.authors) parts.push(ref.authors.split(",")[0].trim());
  if (ref.year) parts.push(`(${ref.year})`);
  if (ref.title) parts.push(ref.title);
  if (ref.journal) parts.push(ref.journal);
  if (ref.doi) parts.push(`DOI: ${ref.doi}`);
  return parts.join(" — ");
}

const ACADEMIC_THEME = {
  primary: "1a3a5c",
  secondary: "2c5282",
  accent: "3182ce",
  background: "ffffff",
  text: "1a202c",
  muted: "718096",
};

const MODERN_THEME = {
  primary: "1a1a2e",
  secondary: "16213e",
  accent: "0f3460",
  background: "ffffff",
  text: "1a1a1a",
  muted: "6b7280",
};

const MINIMAL_THEME = {
  primary: "f8fafc",
  secondary: "f1f5f9",
  accent: "3b82f6",
  background: "ffffff",
  text: "1e293b",
  muted: "94a3b8",
};

function getTheme(theme?: string) {
  if (theme === "modern") return MODERN_THEME;
  if (theme === "minimal") return MINIMAL_THEME;
  return ACADEMIC_THEME;
}

export async function generatePptx(
  projectTitle: string,
  documents: DocumentWithContent[],
  references: ReferenceForExport[],
  options: PptxExportOptions
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  const theme = getTheme(options.theme);

  pptx.layout = "LAYOUT_WIDE"; // 10" x 7.5"
  pptx.title = projectTitle;
  pptx.author = "Teora AI";
  pptx.subject = options.projectTitle;

  const slideData = parseContentToSlides(documents);

  // ── SLIDE 1: TITLE ─────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: "100%",
      fill: { color: theme.primary },
    });
    slide.addText(projectTitle || "Teora Presentation", {
      x: 0.5, y: 2.5, w: "90%", h: 1.5,
      fontSize: 36, bold: true, color: "ffffff",
      align: "center", valign: "middle",
    });
    slide.addText("Dibuat dengan Teora AI Academic Workspace", {
      x: 0.5, y: 4.2, w: "90%", h: 0.5,
      fontSize: 14, color: "cbd5e1", align: "center",
    });
    slide.addNotes("Title slide generated by Teora AI");
  }

  // ── SLIDES FROM CONTENT ────────────────────────────────────
  for (let i = 0; i < slideData.length; i++) {
    const { title, bullets } = slideData[i];

    // Skip title slide (index 0)
    if (i === 0) continue;

    const slide = pptx.addSlide();

    // Header bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: 0.8,
      fill: { color: theme.primary },
    });

    // Slide number
    slide.addText(`${i} / ${slideData.length - 1}`, {
      x: "92%", y: 0.15, w: "7%", h: 0.5,
      fontSize: 10, color: "cbd5e1", align: "right",
    });

    // Title
    slide.addText(title || "Slide", {
      x: 0.5, y: 0.12, w: "85%", h: 0.6,
      fontSize: 20, bold: true, color: "ffffff",
      valign: "middle",
    });

    // Divider line
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.5, y: 0.85, w: "90%", h: 0.02,
      fill: { color: theme.accent },
    });

    // Bullets
    if (bullets.length > 0) {
      const bulletItems = bullets.map((b, j) => ({
        text: b,
        options: {
          bullet: { type: "number" },
          breakLine: j < bullets.length - 1,
        },
      }));
      slide.addText(bulletItems as Parameters<typeof slide.addText>[0], {
        x: 0.5, y: 1.0, w: "90%", h: 5.8,
        fontSize: 16, color: theme.text,
        paraSpaceAfter: 8,
        valign: "top",
      });
    } else {
      slide.addText("(Tidak ada konten)", {
        x: 0.5, y: 1.2, w: "90%", h: 0.5,
        fontSize: 14, color: theme.muted, italic: true,
      });
    }
  }

  // ── BIBLIOGRAPHY SLIDE ─────────────────────────────────────
  if (references.length > 0 && options.includeReferences !== false) {
    const slide = pptx.addSlide();
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: 0.8,
      fill: { color: theme.primary },
    });
    slide.addText("Daftar Pustaka", {
      x: 0.5, y: 0.12, w: "85%", h: 0.6,
      fontSize: 20, bold: true, color: "ffffff", valign: "middle",
    });

    const refItems = references.slice(0, 20).map((r, i) => ({
      text: `[${i + 1}] ${formatReference(r)}`,
      options: {
        breakLine: i < references.length - 1 && i < 19,
      },
    }));

    slide.addText(refItems as Parameters<typeof slide.addText>[0], {
      x: 0.5, y: 1.0, w: "90%", h: 5.8,
      fontSize: 12, color: theme.text,
      paraSpaceAfter: 4,
      valign: "top",
    });
  }

  return Buffer.from(await pptx.write("arraybuffer")) as unknown as Buffer;
}
