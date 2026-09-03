import { Cite } from "@citation-js/core";
import "@citation-js/plugin-doi";
import "@citation-js/plugin-isbn";
import { logger } from "./logger.js";

/**
 * Citation Integrity — validates references and formats bibliographies using CSL.
 *
 * Teora supports Indonesian academic citation formats alongside international standards.
 * All formatting is done client-side with citation-js (CSL processor).
 */

export type CitationFormat = "APA" | "IEEE" | "Vancouver" | "Chicago" | "MLA" | "Harvard" | "APA7";

/** Required fields per citation format */
const FORMAT_REQUIRED_FIELDS: Record<CitationFormat, string[]> = {
  APA: ["author", "title", "issued", "URL"],
  APA7: ["author", "title", "issued", "URL"],
  IEEE: ["author", "title", "container-title", "publisher", "issued"],
  Vancouver: ["author", "title", "source", "issued"],
  Chicago: ["author", "title", "publisher", "issued"],
  MLA: ["author", "title", "container-title", "publisher", "issued"],
  Harvard: ["author", "title", "issued", "URL"],
};

export interface ReferenceField {
  title?: string | null;
  authors?: string | null;
  year?: number | string | null;
  journal?: string | null;
  volume?: number | string | null;
  issue?: number | string | null;
  doi?: string | null;
  url?: string | null;
  isbn?: string | null;
  publisher?: string | null;
  pages?: string | null;
  edition?: string | null;
}

export interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
  field: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  issuesBySeverity: {
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
  };
}

/**
 * Convert Teora reference fields to CSL-JSON format for citation-js.
 */
function toCSLJSON(ref: ReferenceField): Record<string, unknown> {
  const issued: Record<string, unknown> = {};
  if (ref.year) {
    const yearStr = String(ref.year);
    if (/^\d{4}$/.test(yearStr)) {
      issued["date-parts"] = [[parseInt(yearStr, 10)]];
    } else if (/^\d{4}-\d{2}$/.test(yearStr)) {
      const [y, m] = yearStr.split("-").map(Number);
      issued["date-parts"] = [[y, m]];
    }
  }

  const csl: Record<string, unknown> = {
    title: ref.title,
    "container-title": ref.journal,
    volume: ref.volume,
    issue: ref.issue,
    DOI: ref.doi,
    URL: ref.url,
    ISBN: ref.isbn,
    publisher: ref.publisher,
    page: ref.pages,
    edition: ref.edition,
  };

  if (Object.keys(issued).length > 0) {
    csl.issued = issued;
  }

  // Parse authors — CSL expects array of { family, given }
  if (ref.authors) {
    csl.author = parseAuthors(ref.authors);
  }

  // Remove null/undefined fields
  for (const key of Object.keys(csl)) {
    if (csl[key] === null || csl[key] === undefined) {
      delete csl[key];
    }
  }

  return csl;
}

/**
 * Parse "LastName, FirstName" or "LastName, F." format into CSL author array.
 */
function parseAuthors(authorStr: string): Array<{ family: string; given?: string }> {
  return authorStr
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [last, first] = part.split(",").map((s) => s.trim());
      if (first) {
        return { family: last || first, given: first };
      }
      // Single name — treat as family name
      return { family: part };
    });
}

/**
 * Validate a single reference against the required fields for a given citation format.
 */
export function validateReference(ref: ReferenceField, format: CitationFormat): ValidationResult {
  const issues: ValidationIssue[] = [];
  const requiredFields = FORMAT_REQUIRED_FIELDS[format] ?? FORMAT_REQUIRED_FIELDS["APA"];

  // Check required fields
  for (const field of requiredFields) {
    const value = getFieldValue(ref, field);
    if (!value) {
      issues.push({
        severity: "error",
        message: `Field "${field}" diperlukan untuk format ${format} tapi tidak ditemukan.`,
        field,
      });
    }
  }

  // Validate DOI format
  if (ref.doi) {
    const doiIssues = validateDOI(ref.doi);
    issues.push(...doiIssues);
  }

  // Validate ISBN format
  if (ref.isbn) {
    const isbnIssues = validateISBN(ref.isbn);
    issues.push(...isbnIssues);
  }

  // Warning: no URL or DOI (hard to verify)
  if (!ref.url && !ref.doi) {
    issues.push({
      severity: "warning",
      message: "Referensi tidak memiliki DOI atau URL — sulit diverifikasi.",
      field: "URL/DOI",
    });
  }

  // Warning: very short title
  if (ref.title && ref.title.length < 10) {
    issues.push({
      severity: "warning",
      message: "Judul terlalu pendek — pastikan judul lengkap dan akurat.",
      field: "title",
    });
  }

  // Warning: year format
  if (ref.year) {
    const yearStr = String(ref.year);
    if (!/^\d{4}(-\d{2})?$/.test(yearStr)) {
      issues.push({
        severity: "warning",
        message: `Format tahun tidak standar: "${yearStr}". Gunakan format "2024" atau "2024-01".`,
        field: "year",
      });
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return {
    valid: errors.length === 0,
    issues,
    issuesBySeverity: { errors, warnings },
  };
}

/**
 * Get field value from reference by CSL field name.
 */
function getFieldValue(ref: ReferenceField, field: string): string | number | null {
  switch (field) {
    case "author": return ref.authors ?? null;
    case "title": return ref.title ?? null;
    case "issued": return ref.year ?? null;
    case "container-title": return ref.journal ?? null;
    case "source": return ref.journal ?? null;
    case "publisher": return ref.publisher ?? null;
    case "URL": return ref.url ?? null;
    case "DOI": return ref.doi ?? null;
    default: return null;
  }
}

/**
 * Validate DOI format.
 * DOI format: 10.xxxx/prefix/suffix — starts with "10." and contains "/"
 */
export function validateDOI(doi: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  let trimmed = doi.trim();

  if (!trimmed) return issues;

  // Strip common DOI URL prefixes before validation
  if (/^https?:\/\/(dx\.)?doi\.org\//i.test(trimmed)) {
    trimmed = trimmed.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  }

  // Check prefix
  if (!trimmed.startsWith("10.")) {
    issues.push({
      severity: "error",
      message: `DOI tidak valid: harus diawali "10." (prefix). DOI: "${trimmed}"`,
      field: "DOI",
    });
  }

  // Check structure (must contain /)
  if (!trimmed.includes("/")) {
    issues.push({
      severity: "error",
      message: `DOI tidak valid: harus mengandung "/" (prefix/suffix separator). DOI: "${trimmed}"`,
      field: "DOI",
    });
  }

  // Check length
  if (trimmed.length < 10) {
    issues.push({
      severity: "error",
      message: `DOI terlalu pendek: "${trimmed}"`,
      field: "DOI",
    });
  }

  return issues;
}

/**
 * Validate ISBN-10 or ISBN-13 format.
 */
export function validateISBN(isbn: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const cleaned = isbn.replace(/[-\s]/g, "");

  if (!cleaned) return issues;

  const isISBN10 = /^\d{9}[\dXx]$/.test(cleaned);
  const isISBN13 = /^\d{13}$/.test(cleaned);

  if (!isISBN10 && !isISBN13) {
    issues.push({
      severity: "error",
      message: `ISBN tidak valid: "${isbn}". Gunakan ISBN-10 (10 digit) atau ISBN-13 (13 digit).`,
      field: "ISBN",
    });
  } else {
    // Checksum validation
    const isValid = isISBN10 ? validateISBN10Checksum(cleaned) : validateISBN13Checksum(cleaned);
    if (!isValid) {
      issues.push({
        severity: "error",
        message: `ISBN checksum tidak valid: "${isbn}" — kemungkinan salah ketik.`,
        field: "ISBN",
      });
    }
  }

  return issues;
}

function validateISBN10Checksum(isbn: string): boolean {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += (10 - i) * parseInt(isbn[i], 10);
  }
  const last = isbn[9].toUpperCase() === "X" ? 10 : parseInt(isbn[9], 10);
  sum += last;
  return sum % 11 === 0;
}

function validateISBN13Checksum(isbn: string): boolean {
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = parseInt(isbn[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  return sum % 10 === 0;
}

/**
 * Format a list of references into a bibliography string using CSL.
 * Falls back to simple formatting if CSL processing fails.
 */
export function formatBibliography(refs: ReferenceField[], format: CitationFormat): string {
  if (refs.length === 0) return "";

  try {
    const cslData = refs.map((ref) => toCSLJSON(ref));

    // citation-js uses format names: apa, ieee, vancouver, chicago, mla, harvard1
    const citeFormat = toCiteFormat(format);
    const output = new Cite(cslData).format("bibliography", {
      format: "text",
      template: citeFormat,
      lang: "id-ID",
    });

    return output;
  } catch (err) {
    logger.warn({ err, format }, "CSL formatting failed, using fallback");
    return formatFallback(refs, format);
  }
}

/**
 * Map Teora format names to citation-js format names.
 */
function toCiteFormat(format: CitationFormat): string {
  const map: Record<CitationFormat, string> = {
    APA: "apa",
    APA7: "apa",
    IEEE: "ieee",
    Vancouver: "vancouver",
    Chicago: "chicago",
    MLA: "mla",
    Harvard: "harvard1",
  };
  return map[format] ?? "apa";
}

/**
 * Simple fallback formatter when CSL fails.
 */
function formatFallback(refs: ReferenceField[], format: CitationFormat): string {
  return refs
    .map((ref, i) => {
      const author = ref.authors ?? "Penulis";
      const year = ref.year ?? "n.d.";
      const title = ref.title ?? "Tanpa judul";
      const journal = ref.journal ?? "";
      const volume = ref.volume ? `, ${ref.volume}` : "";
      const issue = ref.issue ? `(${ref.issue})` : "";
      const doi = ref.doi ? ` https://doi.org/${ref.doi}` : "";

      switch (format) {
        case "APA":
          return `${author} (${year}). ${title}. ${journal}${volume}${issue}.${doi}`;
        case "IEEE":
          return `${author}, "${title}," ${journal}, vol.${volume}, ${issue}, ${year}.`;
        case "Vancouver":
          return `${author}. ${title}. ${journal}. ${year};${volume || "?"}${issue ? `(${issue})` : ""}.`;
        default:
          return `${author} (${year}). ${title}. ${journal}${volume}${issue}.${doi}`;
      }
    })
    .join("\n\n");
}

/**
 * Extract the first author surname from a CSL-style authors string.
 * Input formats accepted: "Smith, John", "Smith, John; Jones, Jane",
 * "Smith; Jones; Brown", etc.
 */
function firstAuthorSurname(authors: string | null | undefined): string {
  if (!authors) return "Anon.";
  // Take first author (split by `;` or `,` — comma may appear within "Lastname, Firstname")
  const firstAuthorRaw = authors.split(";")[0]?.split(",")[0]?.trim();
  return firstAuthorRaw || "Anon.";
}

/**
 * Count distinct authors in a CSL-style authors string.
 */
function countAuthors(authors: string | null | undefined): number {
  if (!authors) return 0;
  return authors.split(";").filter((a) => a.trim()).length;
}

/**
 * Format a single in-text citation marker for one reference, per the project's
 * citation format. Used by AI auto-cite suggestions + manual citation creation.
 *
 * Returns a pre-rendered string like "(Smith & Jones, 2023)" (APA) or "[1]" (IEEE).
 *
 * The marker is independent of position — callers add it at the right offset
 * in the document text. To re-render after format change, just call this again.
 */
export function formatCitationMarker(
  ref: ReferenceField,
  format: CitationFormat,
  refId?: number,
): string {
  const surname = firstAuthorSurname(ref.authors);
  const nAuthors = countAuthors(ref.authors);
  const year = ref.year ? String(ref.year) : "n.d.";
  const yearShort = year.length >= 4 ? year.slice(0, 4) : year;

  switch (format) {
    case "APA":
    case "APA7":
      // (Smith, 2023) or (Smith & Jones, 2023) or (Smith et al., 2023)
      if (nAuthors === 0) return `(${yearShort})`;
      if (nAuthors === 1) return `(${surname}, ${yearShort})`;
      if (nAuthors === 2) return `(${surname} et al., ${yearShort})`;
      return `(${surname} et al., ${yearShort})`;

    case "Harvard":
      // (Smith, 2023) or (Smith and Jones, 2023) or (Smith et al., 2023)
      if (nAuthors === 0) return `(${yearShort})`;
      if (nAuthors === 1) return `(${surname}, ${yearShort})`;
      return `(${surname} et al., ${yearShort})`;

    case "IEEE":
    case "Vancouver":
    case "Chicago":
      // Numbered — uses reference.id as the stable number for now (Phase 1).
      // Phase 2 will re-render based on bibliography order when citation rendering
      // is implemented. The marker field is overwritten by PATCH /citation-format
      // whenever the project's format changes.
      return `[${refId ?? 0}]`;

    case "MLA":
      // MLA uses (Author page) — page unknown so just author surname in parens
      return `(${surname})`;

    default:
      return `(${surname}, ${yearShort})`;
  }
}

/**
 * List of supported citation formats for the frontend.
 */
export const SUPPORTED_FORMATS: Array<{ value: CitationFormat; label: string; description: string }> = [
  { value: "APA", label: "APA (7th ed.)", description: "American Psychological Association — paling populer di Indonesia" },
  { value: "APA7", label: "APA 7th Edition", description: "Versi terbaru APA dengan aturan pembaruan" },
  { value: "IEEE", label: "IEEE", description: "Institute of Electrical and Electronics Engineers — populer untuk teknik & IT" },
  { value: "Vancouver", label: "Vancouver", description: "ICMJE — populer untuk jurnal medis dan kesehatan" },
  { value: "Chicago", label: "Chicago", description: "University of Chicago Press — untuk humaniora dan sosial" },
  { value: "MLA", label: "MLA", description: "Modern Language Association — untuk sastra dan bahasa" },
  { value: "Harvard", label: "Harvard", description: "Harvard AGPS — populer di Australia dan UK" },
];
