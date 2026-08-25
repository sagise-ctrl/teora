import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";
import type { Document as DBDocument } from "@workspace/db";
import type { DocumentVersion } from "@workspace/db";

Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.woff2",
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 60,
    fontFamily: "Inter",
    fontSize: 11,
    paddingBottom: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
  },
  tocHeading: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 16,
    marginTop: 20,
    pageBreakBefore: true,
  },
  tocEntry: {
    fontSize: 11,
    marginBottom: 4,
    marginLeft: 12,
  },
  tocSubEntry: {
    fontSize: 10,
    marginBottom: 2,
    marginLeft: 24,
    color: "#555",
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: 700,
    marginTop: 24,
    marginBottom: 12,
    pageBreakBefore: true,
  },
  subHeading1: {
    fontSize: 14,
    fontWeight: 700,
    marginTop: 16,
    marginBottom: 8,
  },
  subHeading2: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    marginBottom: 8,
    lineHeight: 1.6,
    textAlign: "justify",
  },
  listItem: {
    marginBottom: 4,
    paddingLeft: 12,
    flexDirection: "row",
  },
  bullet: {
    width: 12,
    fontSize: 11,
  },
  listText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 1.6,
  },
  emptyContent: {
    fontSize: 10,
    color: "#999",
    fontStyle: "italic",
    marginTop: 8,
  },
  referencesHeading: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 16,
    marginTop: 20,
    pageBreakBefore: true,
  },
  referenceItem: {
    marginBottom: 10,
    paddingLeft: 20,
    textAlign: "justify",
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 60,
    right: 60,
    fontSize: 9,
    color: "#aaa",
    textAlign: "center",
  },
});

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
  if (parts.length === 2) return `${parts[0]} & ${parts[1]}`;
  if (parts.length <= 20) {
    const last = parts.pop()!;
    return `${parts.join(", ")}, & ${last}`;
  }
  return `${parts.slice(0, 19).join(", ")}, ... ${parts[parts.length - 1]}`;
}

function formatReferenceAPA(ref: ReferenceForExport): string {
  const parts: string[] = [];

  const authors = formatAuthorsAPA(ref.authors);
  if (authors) parts.push(authors);

  if (ref.year) parts.push(`(${ref.year}).`);

  if (ref.title) parts.push(`${ref.title}.`);

  if (ref.journal) {
    let journalPart = ref.journal;
    if (ref.volume) journalPart += `, ${ref.volume}`;
    if (ref.issue) journalPart += `(${ref.issue})`;
    if (ref.page) journalPart += `, ${ref.page}`;
    journalPart += ".";
    parts.push(journalPart);
  }

  if (ref.doi) {
    parts.push(`https://doi.org/${ref.doi}`);
  } else if (ref.url) {
    parts.push(ref.url);
  }

  return parts.join(" ");
}

function parseOutlineToHeadings(
  outline: string | null
): { level: number; text: string }[] {
  if (!outline) return [];
  const lines = outline.split("\n").map((l) => l.trim()).filter(Boolean);
  const headings: { level: number; text: string }[] = [];

  for (const line of lines) {
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

function renderOutlineHeadings(headings: { level: number; text: string }[]) {
  return headings.map((h, i) => {
    if (h.level === 1) {
      return (
        <Text key={i} style={styles.subHeading1}>
          {h.text}
        </Text>
      );
    }
    if (h.level === 2) {
      return (
        <Text key={i} style={styles.subHeading2}>
          {h.text}
        </Text>
      );
    }
    return (
      <Text key={i} style={styles.subHeading2}>
        {h.text}
      </Text>
    );
  });
}

function renderContent(content: string) {
  const blocks = content
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks.map((block, i) => {
    if (block.startsWith("#")) {
      const match = block.match(/^(#{1,6})\s+(.+)/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        if (level === 1)
          return (
            <Text key={i} style={styles.subHeading1}>
              {text}
            </Text>
          );
        return (
          <Text key={i} style={styles.subHeading2}>
            {text}
          </Text>
        );
      }
    }

    if (block.match(/^[-*]\s+/m)) {
      const items = block.split(/\n/).filter((l) => l.match(/^[-*]\s+/));
      return (
        <View key={i}>
          {items.map((item, j) => {
            const text = item.replace(/^[-*]\s+/, "").trim();
            return (
              <View key={j} style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.listText}>{text}</Text>
              </View>
            );
          })}
        </View>
      );
    }

    return (
      <Text key={i} style={styles.paragraph}>
        {block}
      </Text>
    );
  });
}

export async function generatePDF(
  projectTitle: string,
  documents: DocumentWithContent[],
  references: ReferenceForExport[],
  options: ExportOptions
): Promise<Buffer> {
  // ── TOC Page ──────────────────────────────────────────────
  const tocElements: React.ReactElement[] = [];

  tocElements.push(
    <Text key="toc-title" style={styles.tocHeading}>
      Daftar Isi
    </Text>
  );

  for (const { document, version } of documents) {
    tocElements.push(
      <Text key={`toc-${document.id}`} style={styles.tocEntry}>
        {document.title}
      </Text>
    );

    if (version?.outline) {
      const headings = parseOutlineToHeadings(version.outline);
      for (const h of headings.slice(0, 10)) {
        tocElements.push(
          <Text key={`toc-${document.id}-${h.text}`} style={styles.tocSubEntry}>
            {h.text}
          </Text>
        );
      }
    }
  }

  // ── Document Pages ────────────────────────────────────────
  const docElements: React.ReactElement[] = [];

  for (const { document, version } of documents) {
    docElements.push(
      <Text key={`sec-${document.id}`} style={styles.sectionHeading}>
        {document.title}
      </Text>
    );

    if (version?.outline) {
      const headings = parseOutlineToHeadings(version.outline);
      docElements.push(...renderOutlineHeadings(headings));
    }

    if (version?.content) {
      docElements.push(...renderContent(version.content));
    } else {
      docElements.push(
        <Text key={`empty-${document.id}`} style={styles.emptyContent}>
          (Belum ada konten)
        </Text>
      );
    }
  }

  // ── References Page ───────────────────────────────────────
  const refElements: React.ReactElement[] = [];

  if (references.length > 0 && options.includeReferences !== false) {
    refElements.push(
      <Text key="ref-heading" style={styles.referencesHeading}>
        Daftar Pustaka
      </Text>
    );

    for (let i = 0; i < references.length; i++) {
      refElements.push(
        <Text key={`ref-${i}`} style={styles.referenceItem}>
          {formatReferenceAPA(references[i])}
        </Text>
      );
    }
  }

  const doc = (
    <Document
      title={projectTitle}
      author="Teora AI Academic Workspace"
      creator="Teora"
    >
      {/* Title Page */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{projectTitle}</Text>
        <Text style={styles.subtitle}>
          Dokumen ini dibuat dengan Teora AI Academic Workspace
        </Text>
      </Page>

      {/* TOC */}
      <Page size="A4" style={styles.page}>
        {tocElements}
      </Page>

      {/* Content */}
      <Page size="A4" style={styles.page}>
        {docElements}
        <Text style={styles.footer}>
          Dibuat dengan Teora AI Academic Workspace
        </Text>
      </Page>

      {/* References */}
      {refElements.length > 0 && (
        <Page size="A4" style={styles.page}>
          {refElements}
          <Text style={styles.footer}>
            Dibuat dengan Teora AI Academic Workspace
          </Text>
        </Page>
      )}
    </Document>
  );

  return Buffer.from(await pdf(doc).toBuffer());
}
