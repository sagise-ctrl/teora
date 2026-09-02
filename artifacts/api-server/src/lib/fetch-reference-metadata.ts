/**
 * Reference Metadata Fetcher
 * Fetches reference metadata from external academic databases:
 * - DOI: CrossRef API (https://api.crossref.org)
 * - ISBN: Open Library API (https://openlibrary.org)
 */

export interface FetchedReference {
  title: string;
  authors: string | null;
  year: number | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  doi: string | null;
  url: string | null;
  publisher: string | null;
  source: "crossref" | "openlibrary" | "manual";
}

/**
 * Detect whether an identifier is a DOI or ISBN
 */
export function detectIdentifierType(input: string): "doi" | "isbn" | "unknown" {
  const cleaned = input.trim();

  if (/^10\.\d{4,}\//.test(cleaned)) return "doi";
  if (/^https?:\/\/doi\.org\/(.+)/.test(cleaned)) return "doi";

  const isbn10 = cleaned.replace(/[-\s]/g, "");
  if (/^\d{9}[\dX]$/.test(isbn10)) return "isbn";

  const isbn13 = cleaned.replace(/[-\s]/g, "");
  if (/^(978|979)\d{10}$/.test(isbn13)) return "isbn";

  return "unknown";
}

/**
 * Extract the DOI from a URL or raw DOI string
 */
function extractDOI(input: string): string {
  const match = input.match(/^10\.\d{4,}\/[^\s]+$/);
  if (match) return match[0];

  const urlMatch = input.match(/https?:\/\/doi\.org\/(.+)/);
  if (urlMatch) return urlMatch[1];

  return input.trim();
}

/**
 * Validate ISBN-10 checksum
 */
function isValidISBN10(isbn: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(isbn[i]) * (10 - i);
  const check = isbn[9] === "X" ? 10 : parseInt(isbn[9]);
  sum += check;
  return sum % 11 === 0;
}

/**
 * Validate ISBN-13 checksum
 */
function isValidISBN13(isbn: string): boolean {
  if (!/^(978|979)\d{10}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = parseInt(isbn[i]);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  return sum % 10 === 0;
}

/**
 * Fetch metadata for a DOI from CrossRef API
 */
export async function fetchByDOI(doi: string): Promise<FetchedReference | null> {
  const cleanDOI = extractDOI(doi);

  try {
    const response = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(cleanDOI)}`,
      {
        headers: {
          "User-Agent": "Teora/1.0 (mailto:teora@example.com)",
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json() as {
      message?: {
        title?: string[];
        author?: Array<{ given?: string; family?: string }>;
        published?: { "date-parts"?: number[][] };
        "published-print"?: { "date-parts"?: number[][] };
        "published-online"?: { "date-parts"?: number[][] };
        "container-title"?: string[];
        volume?: string;
        issue?: string;
        DOI?: string;
        URL?: string;
        publisher?: string;
      };
    };

    const msg = data.message;
    if (!msg?.title?.[0]) return null;

    const year = msg.published?.["date-parts"]?.[0]?.[0]
      ?? msg["published-print"]?.["date-parts"]?.[0]?.[0]
      ?? msg["published-online"]?.["date-parts"]?.[0]?.[0]
      ?? null;

    const authors = msg.author
      ?.map((a) => {
        if (a.family && a.given) return `${a.family}, ${a.given[0]}.`;
        return a.family ?? a.given ?? "";
      })
      .filter(Boolean)
      .join(", ") || null;

    return {
      title: msg.title[0],
      authors,
      year: year ?? null,
      journal: msg["container-title"]?.[0] ?? null,
      volume: msg.volume ?? null,
      issue: msg.issue ?? null,
      doi: msg.DOI ?? cleanDOI,
      url: msg.URL ?? null,
      publisher: msg.publisher ?? null,
      source: "crossref",
    };
  } catch {
    return null;
  }
}

/**
 * Fetch metadata for an ISBN from Open Library API
 */
export async function fetchByISBN(isbn: string): Promise<FetchedReference | null> {
  const cleaned = isbn.replace(/[-\s]/g, "");

  if (cleaned.length === 10 && !isValidISBN10(cleaned)) return null;
  if (cleaned.length === 13 && !isValidISBN13(cleaned)) return null;

  try {
    const response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${cleaned}&format=json&jscmd=data`
    );

    if (!response.ok) return null;

    const data = await response.json() as Record<
      string,
      {
        title?: string;
        authors?: Array<{ name: string }>;
        publish_date?: string;
        publishers?: Array<{ name: string }>;
        number_of_pages?: number;
        url?: string;
      }
    >;

    const key = `ISBN:${cleaned}`;
    const book = data[key];
    if (!book?.title) return null;

    const yearMatch = book.publish_date?.match(/\d{4}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : null;

    return {
      title: book.title,
      authors: book.authors?.map((a) => a.name).join(", ") ?? null,
      year,
      journal: book.publishers?.[0]?.name ?? null,
      volume: null,
      issue: null,
      doi: null,
      url: book.url ?? null,
      publisher: book.publishers?.[0]?.name ?? null,
      source: "openlibrary",
    };
  } catch {
    return null;
  }
}

/**
 * Auto-detect identifier type and fetch metadata from the appropriate source
 */
export async function fetchMetadata(
  identifier: string
): Promise<FetchedReference | null> {
  const type = detectIdentifierType(identifier);

  if (type === "doi") return fetchByDOI(identifier);
  if (type === "isbn") return fetchByISBN(identifier);

  return null;
}
