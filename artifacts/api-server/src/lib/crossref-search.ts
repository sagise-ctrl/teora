export interface CrossRefAuthor {
  given?: string;
  family?: string;
  name?: string;
}

export interface CrossRefSearchResult {
  doi: string | null;
  title: string;
  authors: string;
  year: number | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  url: string | null;
  type: string | null;
  publisher: string | null;
  page: string | null;
  abstract?: string | null;
}

export interface CrossRefSearchResponse {
  results: CrossRefSearchResult[];
  totalResults: number;
  query: string;
}

const CROSSREF_BASE = "https://api.crossref.org/works";
const POLITE_EMAIL = "admin@teora.app";
const DEFAULT_ROWS = 20;
const MAX_ROWS = 50;

function formatAuthors(authors: CrossRefAuthor[]): string {
  if (!authors || authors.length === 0) return "";
  return authors
    .map((a) => {
      if (a.name) return a.name;
      if (a.family && a.given) return `${a.given} ${a.family}`;
      if (a.family) return a.family;
      return "";
    })
    .filter(Boolean)
    .join(", ");
}

function extractYear(crItem: Record<string, unknown>): number | null {
  const date = crItem["published-print"] ?? crItem["published-online"] ?? crItem["created"] ?? crItem["accepted"];
  if (date && typeof date === "object" && !Array.isArray(date)) {
    const dateObj = date as Record<string, unknown>;
    const dateParts = dateObj["date-parts"] as number[][] | undefined;
    if (dateParts && dateParts[0] && dateParts[0][0]) {
      return dateParts[0][0];
    }
  }
  return null;
}

export async function searchCrossRef(
  query: string,
  options: {
    rows?: number;
    offset?: number;
    filter?: string;
  } = {}
): Promise<CrossRefSearchResponse> {
  const rows = Math.min(options.rows ?? DEFAULT_ROWS, MAX_ROWS);
  const params = new URLSearchParams({
    query: query.trim(),
    rows: String(rows),
    select: "DOI,title,author,publisher,journal,volume,issue,page,published-print,published-online,created,accepted,type,abstract,URL",
    "mailto": POLITE_EMAIL,
  });

  if (options.offset) {
    params.set("offset", String(options.offset));
  }

  const url = `${CROSSREF_BASE}?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": `Teora/1.0 (mailto:${POLITE_EMAIL})`,
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("CrossRef rate limit exceeded. Please wait a moment and try again.");
    }
    throw new Error(`CrossRef API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { message: { items: Record<string, unknown>[]; "total-results": number } };
  const items = data.message?.items ?? [];
  const totalResults = data.message?.["total-results"] ?? 0;

  const results: CrossRefSearchResult[] = items.map((item) => {
    const authors = (item["author"] as CrossRefAuthor[] | undefined) ?? [];
    const containerTitle = (item["container-title"] as string[] | undefined);
    const journal = containerTitle?.[0] ?? null;

    return {
      doi: (item["DOI"] as string | undefined) ?? null,
      title: Array.isArray(item["title"]) ? item["title"][0] : (item["title"] as string) ?? "Untitled",
      authors: formatAuthors(authors),
      year: extractYear(item),
      journal,
      volume: (item["volume"] as string | undefined) ?? null,
      issue: (item["issue"] as string | undefined) ?? null,
      url: (item["URL"] as string | undefined) ?? null,
      type: (item["type"] as string | undefined) ?? null,
      publisher: (item["publisher"] as string | undefined) ?? null,
      page: (item["page"] as string | undefined) ?? null,
      abstract: (item["abstract"] as string | undefined) ?? null,
    };
  });

  return {
    results,
    totalResults,
    query,
  };
}
