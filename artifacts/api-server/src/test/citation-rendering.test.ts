import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  splitParagraphs,
  computeSequentialNumbers,
  getMarkerForCitation,
  renderMarkerHtml,
  renderMarkdownLight,
  renderParagraph,
  renderDocument,
  renumberMarkers,
  type CitationForRender,
} from "../lib/citation-rendering";

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeRef(overrides: Partial<CitationForRender["reference"]> = {}): CitationForRender["reference"] {
  return {
    title: "Sample Paper",
    authors: "Smith, John",
    year: 2023,
    journal: "Journal of Testing",
    doi: "10.1000/test",
    url: null,
    ...overrides,
  };
}

function makeCitation(overrides: Partial<CitationForRender>): CitationForRender {
  return {
    id: 1,
    referenceId: 100,
    paragraphIndex: 0,
    offsetInParagraph: 0,
    formatMarker: "(Smith, 2023)",
    placementReason: null,
    reference: makeRef(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// escapeHtml
// ─────────────────────────────────────────────────────────────────────────────

describe("escapeHtml", () => {
  it("escapes ampersand", () => {
    expect(escapeHtml("A & B")).toBe("A &amp; B");
  });

  it("escapes less-than", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes quotes (both single and double)", () => {
    expect(escapeHtml(`"hello" and 'world'`)).toBe("&quot;hello&quot; and &#39;world&#39;");
  });

  it("escapes HTML tag fully", () => {
    expect(escapeHtml(`<img src="x" onerror='alert(1)'>`)).toBe(
      "&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;"
    );
  });

  it("passes through plain text unchanged", () => {
    expect(escapeHtml("Hello world 2023")).toBe("Hello world 2023");
  });

  it("ampersand escaped before other chars (order matters)", () => {
    // & must be replaced first so we don't double-escape the & in &lt;
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// splitParagraphs
// ─────────────────────────────────────────────────────────────────────────────

describe("splitParagraphs", () => {
  it("splits on double newline", () => {
    expect(splitParagraphs("Para 1\n\nPara 2")).toEqual(["Para 1", "Para 2"]);
  });

  it("splits on newline + whitespace + newline", () => {
    expect(splitParagraphs("Para 1\n \nPara 2")).toEqual(["Para 1", "Para 2"]);
  });

  it("splits on triple+ newlines", () => {
    expect(splitParagraphs("Para 1\n\n\n\nPara 2")).toEqual(["Para 1", "Para 2"]);
  });

  it("trims whitespace around paragraphs", () => {
    expect(splitParagraphs("  Para 1  \n\n  Para 2  ")).toEqual(["Para 1", "Para 2"]);
  });

  it("filters empty paragraphs", () => {
    expect(splitParagraphs("\n\nPara 1\n\n\n\nPara 2\n\n")).toEqual(["Para 1", "Para 2"]);
  });

  it("returns empty array for empty input", () => {
    expect(splitParagraphs("")).toEqual([]);
  });

  it("returns single paragraph for single block", () => {
    expect(splitParagraphs("Just one paragraph")).toEqual(["Just one paragraph"]);
  });

  it("preserves single newlines inside paragraph (those are not separators)", () => {
    // splitParagraphs only splits on blank-line pattern. Single \n is NOT a separator
    // — renderMarkdownLight handles hard breaks.
    const result = splitParagraphs("Line 1\nLine 2\n\nLine 3");
    expect(result).toEqual(["Line 1\nLine 2", "Line 3"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeSequentialNumbers
// ─────────────────────────────────────────────────────────────────────────────

describe("computeSequentialNumbers", () => {
  it("returns empty map when no citations", () => {
    expect(computeSequentialNumbers([]).size).toBe(0);
  });

  it("assigns sequential number by order of appearance", () => {
    const citations = [
      makeCitation({ id: 1, referenceId: 100, paragraphIndex: 0, offsetInParagraph: 5 }),
      makeCitation({ id: 2, referenceId: 200, paragraphIndex: 0, offsetInParagraph: 10 }),
    ];
    const map = computeSequentialNumbers(citations);
    expect(map.get(100)).toBe(1);
    expect(map.get(200)).toBe(2);
  });

  it("sorts by paragraph first, then offset", () => {
    // Note: c2 is at paragraph 1 but offset 2; c1 is at paragraph 0 offset 50.
    // Expected order: c1 first (para 0), then c2 (para 1).
    const citations = [
      makeCitation({ id: 1, referenceId: 100, paragraphIndex: 1, offsetInParagraph: 2 }),
      makeCitation({ id: 2, referenceId: 200, paragraphIndex: 0, offsetInParagraph: 50 }),
    ];
    const map = computeSequentialNumbers(citations);
    expect(map.get(200)).toBe(1); // appears first (earlier paragraph)
    expect(map.get(100)).toBe(2);
  });

  it("same referenceId gets same number across multiple citations", () => {
    const citations = [
      makeCitation({ id: 1, referenceId: 100, paragraphIndex: 0, offsetInParagraph: 5 }),
      makeCitation({ id: 2, referenceId: 200, paragraphIndex: 0, offsetInParagraph: 10 }),
      makeCitation({ id: 3, referenceId: 100, paragraphIndex: 1, offsetInParagraph: 0 }),
    ];
    const map = computeSequentialNumbers(citations);
    expect(map.get(100)).toBe(1);
    expect(map.get(200)).toBe(2);
    expect(map.size).toBe(2);
  });

  it("does not mutate input array", () => {
    const original = [
      makeCitation({ id: 1, referenceId: 100, paragraphIndex: 1, offsetInParagraph: 5 }),
      makeCitation({ id: 2, referenceId: 200, paragraphIndex: 0, offsetInParagraph: 5 }),
    ];
    const snapshot = JSON.parse(JSON.stringify(original));
    computeSequentialNumbers(original);
    expect(original).toEqual(snapshot);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMarkerForCitation
// ─────────────────────────────────────────────────────────────────────────────

describe("getMarkerForCitation", () => {
  const citation = makeCitation({ referenceId: 42, formatMarker: "(Smith, 2023)" });

  it("returns sequential number for IEEE", () => {
    const map = new Map([[42, 7]]);
    expect(getMarkerForCitation(citation, "IEEE", map)).toBe("[7]");
  });

  it("returns sequential number for Vancouver", () => {
    const map = new Map([[42, 3]]);
    expect(getMarkerForCitation(citation, "Vancouver", map)).toBe("[3]");
  });

  it("returns sequential number for Chicago", () => {
    const map = new Map([[42, 5]]);
    expect(getMarkerForCitation(citation, "Chicago", map)).toBe("[5]");
  });

  it("returns original formatMarker for APA when not in map", () => {
    expect(getMarkerForCitation(citation, "APA", new Map())).toBe("(Smith, 2023)");
  });

  it("returns original formatMarker for APA7 when not in map", () => {
    expect(getMarkerForCitation(citation, "APA7", new Map())).toBe("(Smith, 2023)");
  });

  it("returns original formatMarker for MLA when not in map", () => {
    expect(getMarkerForCitation(citation, "MLA", new Map())).toBe("(Smith, 2023)");
  });

  it("returns original formatMarker for Harvard when not in map", () => {
    expect(getMarkerForCitation(citation, "Harvard", new Map())).toBe("(Smith, 2023)");
  });

  it("returns original formatMarker for IEEE when referenceId not in map", () => {
    // Edge case: IEEE format selected but citation not in map (shouldn't happen but defensive)
    const map = new Map([[99, 1]]);
    expect(getMarkerForCitation(citation, "IEEE", map)).toBe("(Smith, 2023)");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// renderMarkerHtml
// ─────────────────────────────────────────────────────────────────────────────

describe("renderMarkerHtml", () => {
  it("produces sup tag with data-citation-id attribute", () => {
    const citation = makeCitation({ id: 123, formatMarker: "(Smith, 2023)" });
    const html = renderMarkerHtml(citation, "(Smith, 2023)", "APA");
    expect(html).toContain('class="cite-marker"');
    expect(html).toContain('data-citation-id="123"');
    expect(html).toContain("(Smith, 2023)");
  });

  it("includes escaped tooltip text", () => {
    const citation = makeCitation({
      id: 5,
      reference: makeRef({ title: "A < B & C", authors: "Doe, J." }),
    });
    const html = renderMarkerHtml(citation, "[1]", "IEEE");
    expect(html).toContain("title=");
    expect(html).toContain("A &lt; B &amp; C"); // title text escaped
    // Marker text itself escaped
    expect(html).toContain(">[1]</sup>");
  });

  it("includes placement reason in tooltip when present", () => {
    const citation = makeCitation({ placementReason: "Supports the methodology claim" });
    const html = renderMarkerHtml(citation, "[1]", "IEEE");
    expect(html).toContain("Alasan: Supports the methodology claim");
  });

  it("uses \n in tooltip replaced with &#10; for multi-line", () => {
    const citation = makeCitation({ placementReason: "Line 1\nLine 2" });
    const html = renderMarkerHtml(citation, "[1]", "IEEE");
    // The literal \n would break the title attribute; we use &#10;
    expect(html).not.toMatch(/title="[^"]*\n[^"]*"/);
    expect(html).toContain("Line 1&#10;Line 2");
  });

  it("escapes XSS attempt in marker text", () => {
    const html = renderMarkerHtml(makeCitation({ id: 1 }), "<script>alert(1)</script>", "APA");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// renderMarkdownLight
// ─────────────────────────────────────────────────────────────────────────────

describe("renderMarkdownLight", () => {
  it("renders plain text as paragraph", () => {
    expect(renderMarkdownLight("Hello world")).toBe("<p>Hello world</p>");
  });

  it("renders h1-h6 headings", () => {
    expect(renderMarkdownLight("# Title")).toBe("<h1>Title</h1>");
    expect(renderMarkdownLight("## Subtitle")).toBe("<h2>Subtitle</h2>");
    expect(renderMarkdownLight("###### Tiny")).toBe("<h6>Tiny</h6>");
  });

  it("renders unordered list", () => {
    const md = "- item one\n- item two\n- item three";
    expect(renderMarkdownLight(md)).toBe(
      "<ul><li>item one</li><li>item two</li><li>item three</li></ul>"
    );
  });

  it("renders mixed content", () => {
    const md = "# Heading\n\nPara text\n\n- item\n- item";
    const result = renderMarkdownLight(md);
    expect(result).toContain("<h1>Heading</h1>");
    expect(result).toContain("<p>Para text</p>");
    expect(result).toContain("<ul><li>item</li><li>item</li></ul>");
  });

  it("uses <br/> for hard line breaks within a paragraph", () => {
    expect(renderMarkdownLight("line 1\nline 2")).toBe("<p>line 1<br/>line 2</p>");
  });

  it("returns empty string for empty input", () => {
    expect(renderMarkdownLight("")).toBe("");
  });

  it("handles asterisk list markers too", () => {
    expect(renderMarkdownLight("* a\n* b")).toBe("<ul><li>a</li><li>b</li></ul>");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// renderParagraph
// ─────────────────────────────────────────────────────────────────────────────

describe("renderParagraph", () => {
  it("renders plain paragraph with no citations", () => {
    const html = renderParagraph("Hello world", 0, [], "APA", new Map());
    expect(html).toBe("<p>Hello world</p>");
  });

  it("injects citation marker at offset", () => {
    const c = makeCitation({ id: 1, offsetInParagraph: 5 });
    const html = renderParagraph("Hello world", 0, [c], "APA", new Map());
    expect(html).toContain("Hello");
    expect(html).toContain("data-citation-id=\"1\"");
    // Marker should be after "Hello" (5 chars)
    const helloIdx = html.indexOf("Hello");
    const markerIdx = html.indexOf("<sup");
    expect(markerIdx).toBeGreaterThan(helloIdx);
    expect(html).toContain("world");
  });

  it("handles multiple citations at different offsets", () => {
    const citations = [
      makeCitation({ id: 1, offsetInParagraph: 5, formatMarker: "[1]" }),
      makeCitation({ id: 2, offsetInParagraph: 11, formatMarker: "[2]" }),
    ];
    const html = renderParagraph("Hello world here", 0, citations, "IEEE", new Map());
    expect(html).toContain("data-citation-id=\"1\"");
    expect(html).toContain("data-citation-id=\"2\"");
    expect(html.indexOf("data-citation-id=\"1\"")).toBeLessThan(html.indexOf("data-citation-id=\"2\""));
  });

  it("clamps offset past end of paragraph to end", () => {
    const c = makeCitation({ id: 1, offsetInParagraph: 9999, formatMarker: "[1]" });
    const html = renderParagraph("Hello", 0, [c], "IEEE", new Map());
    // Marker must still be inside paragraph
    expect(html).toContain("Hello");
    expect(html).toContain("data-citation-id=\"1\"");
    // Marker should be AFTER "Hello" (clamped to end)
    expect(html.indexOf("<sup")).toBeGreaterThan(html.indexOf("Hello"));
  });

  it("clamps negative offset to 0", () => {
    const c = makeCitation({ id: 1, offsetInParagraph: -5, formatMarker: "[1]" });
    const html = renderParagraph("Hello", 0, [c], "IEEE", new Map());
    // Marker at start
    expect(html.indexOf("<sup")).toBeLessThan(html.indexOf("Hello"));
  });

  it("uses sequential numbers for IEEE when in map", () => {
    const c = makeCitation({ id: 1, offsetInParagraph: 5, formatMarker: "[99]" });
    const map = new Map([[100, 3]]);
    const html = renderParagraph("Hello world", 0, [c], "IEEE", map);
    expect(html).toContain("[3]");
    expect(html).not.toContain("[99]");
  });

  it("escapes HTML special chars in paragraph text", () => {
    const html = renderParagraph("A < B & C", 0, [], "APA", new Map());
    expect(html).toContain("A &lt; B &amp; C");
    expect(html).not.toContain("A < B");
  });

  it("uses simplified rendering for markdown-structured paragraphs", () => {
    const c = makeCitation({ id: 1, offsetInParagraph: 5 });
    const html = renderParagraph("# Heading text", 0, [c], "APA", new Map());
    // Heading should still render
    expect(html).toContain("<h1>Heading text</h1>");
    // Citation marker should be appended (best-effort)
    expect(html).toContain("data-citation-id=\"1\"");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// renderDocument
// ─────────────────────────────────────────────────────────────────────────────

describe("renderDocument", () => {
  const formatBib = (refs: any[]) => `BIB(${refs.length})`;

  it("renders empty content with no paragraphs", () => {
    const result = renderDocument({
      content: "",
      citations: [],
      format: "APA",
      formatBibliographyFn: formatBib,
    });
    expect(result.paragraphs).toEqual([]);
    expect(result.citationCount).toBe(0);
    expect(result.bibliography).toBe("BIB(0)");
  });

  it("renders content with multiple paragraphs", () => {
    const result = renderDocument({
      content: "Para 1\n\nPara 2",
      citations: [],
      format: "APA",
      formatBibliographyFn: formatBib,
    });
    expect(result.paragraphs).toHaveLength(2);
    expect(result.paragraphs[0].index).toBe(0);
    expect(result.paragraphs[1].index).toBe(1);
    expect(result.paragraphs[0].html).toContain("Para 1");
    expect(result.paragraphs[1].html).toContain("Para 2");
  });

  it("injects citations into the right paragraph", () => {
    const citations = [
      makeCitation({ id: 1, paragraphIndex: 1, offsetInParagraph: 0 }),
    ];
    const result = renderDocument({
      content: "Para 1\n\nPara 2",
      citations,
      format: "APA",
      formatBibliographyFn: formatBib,
    });
    expect(result.paragraphs[0].html).not.toContain("<sup");
    expect(result.paragraphs[1].html).toContain("<sup");
    expect(result.citationCount).toBe(1);
  });

  it("includes only cited references in bibliography", () => {
    const citations = [
      makeCitation({ id: 1, referenceId: 100 }),
      makeCitation({ id: 2, referenceId: 100 }), // same ref, multi-cite
    ];
    const result = renderDocument({
      content: "Para 1",
      citations,
      format: "APA",
      formatBibliographyFn: formatBib,
    });
    expect(result.bibliography).toBe("BIB(1)"); // dedupe by referenceId
  });

  it("returns empty bibliography when no citations", () => {
    const result = renderDocument({
      content: "Just text",
      citations: [],
      format: "APA",
      formatBibliographyFn: formatBib,
    });
    expect(result.bibliography).toBe("BIB(0)");
    expect(result.citationCount).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// renumberMarkers
// ─────────────────────────────────────────────────────────────────────────────

describe("renumberMarkers", () => {
  it("returns empty map when no citations", () => {
    expect(renumberMarkers([], "IEEE").size).toBe(0);
  });

  it("returns map with all citations numbered for IEEE", () => {
    const citations = [
      makeCitation({ id: 1, referenceId: 100, paragraphIndex: 0, offsetInParagraph: 5, formatMarker: "[99]" }),
      makeCitation({ id: 2, referenceId: 200, paragraphIndex: 0, offsetInParagraph: 10, formatMarker: "[99]" }),
    ];
    const updates = renumberMarkers(citations, "IEEE");
    expect(updates.get(1)).toBe("[1]");
    expect(updates.get(2)).toBe("[2]");
  });

  it("returns empty map for APA (no renumbering needed)", () => {
    const citations = [
      makeCitation({ id: 1, formatMarker: "(Smith, 2023)" }),
    ];
    const updates = renumberMarkers(citations, "APA");
    expect(updates.size).toBe(0);
  });

  it("does not include citations whose marker is unchanged", () => {
    const citations = [
      makeCitation({
        id: 1,
        referenceId: 100,
        paragraphIndex: 0,
        offsetInParagraph: 5,
        formatMarker: "(Smith, 2023)", // already correct for APA
      }),
    ];
    const updates = renumberMarkers(citations, "APA");
    expect(updates.has(1)).toBe(false);
  });

  it("numbers for Vancouver", () => {
    const citations = [makeCitation({ id: 1, formatMarker: "[99]" })];
    const updates = renumberMarkers(citations, "Vancouver");
    expect(updates.get(1)).toBe("[1]");
  });

  it("numbers for Chicago", () => {
    const citations = [makeCitation({ id: 1, formatMarker: "[99]" })];
    const updates = renumberMarkers(citations, "Chicago");
    expect(updates.get(1)).toBe("[1]");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration: format change flow
// ─────────────────────────────────────────────────────────────────────────────

describe("format change integration", () => {
  it("APA → IEEE renumbers all citations and renders correctly", () => {
    const citations = [
      makeCitation({
        id: 1,
        referenceId: 100,
        paragraphIndex: 0,
        offsetInParagraph: 5,
        formatMarker: "(Smith, 2023)",
      }),
      makeCitation({
        id: 2,
        referenceId: 200,
        paragraphIndex: 0,
        offsetInParagraph: 20,
        formatMarker: "(Doe, 2022)",
      }),
    ];

    // Simulate PATCH /citation-format applying renumberMarkers
    const updates = renumberMarkers(citations, "IEEE");
    const renumbered = citations.map((c) =>
      updates.has(c.id) ? { ...c, formatMarker: updates.get(c.id)! } : c
    );

    const result = renderDocument({
      content: "Reference 1 here and reference 2 also here",
      citations: renumbered,
      format: "IEEE",
      formatBibliographyFn: () => "BIB",
    });

    expect(result.paragraphs[0].html).toContain("[1]");
    expect(result.paragraphs[0].html).toContain("[2]");
    expect(result.paragraphs[0].html).not.toContain("(Smith");
  });

  it("multi-cite same reference renders same number throughout", () => {
    const citations = [
      makeCitation({ id: 1, referenceId: 100, paragraphIndex: 0, offsetInParagraph: 10, formatMarker: "(X, 2023)" }),
      makeCitation({ id: 2, referenceId: 200, paragraphIndex: 0, offsetInParagraph: 30, formatMarker: "(Y, 2022)" }),
      makeCitation({ id: 3, referenceId: 100, paragraphIndex: 1, offsetInParagraph: 5, formatMarker: "(X, 2023)" }),
    ];

    const updates = renumberMarkers(citations, "IEEE");
    const renumbered = citations.map((c) =>
      updates.has(c.id) ? { ...c, formatMarker: updates.get(c.id)! } : c
    );

    const result = renderDocument({
      content: "First cite. Second cite.\n\nMore text with first cite again.",
      citations: renumbered,
      format: "IEEE",
      formatBibliographyFn: () => "BIB",
    });

    // Reference 100 should appear in both paragraph 0 (citation 1) and paragraph 1 (citation 3)
    const p0 = result.paragraphs[0].html;
    const p1 = result.paragraphs[1].html;

    // Count citation markers via data-citation-id (not literal [1] — that would
    // also match the [IEEE] format indicator in the tooltip title attribute).
    const p0Markers = (p0.match(/<sup class="cite-marker"/g) || []).length;
    const p1Markers = (p1.match(/<sup class="cite-marker"/g) || []).length;
    expect(p0Markers).toBe(2); // citation 1 + citation 2
    expect(p1Markers).toBe(1); // citation 3 only

    // Both citation 1 and citation 3 have referenceId 100 → must render as [1]
    expect((p0.match(/data-citation-id="1"/g) || []).length).toBe(1);
    expect((p1.match(/data-citation-id="3"/g) || []).length).toBe(1);

    // Reference 200 renders as [2] in paragraph 0
    expect(p0).toContain('data-citation-id="2"');
  });
});
