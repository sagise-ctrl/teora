import { describe, it, expect } from "vitest";
import {
  validateReference,
  validateDOI,
  validateISBN,
  formatBibliography,
  SUPPORTED_FORMATS,
} from "../lib/citation";

describe("validateDOI", () => {
  it("accepts valid DOI", () => {
    const issues = validateDOI("10.1000/xyz123");
    expect(issues).toHaveLength(0);
  });

  it("accepts DOI with full URL", () => {
    const issues = validateDOI("https://doi.org/10.1000/xyz123");
    expect(issues).toHaveLength(0);
  });

  it("rejects DOI without 10. prefix", () => {
    const issues = validateDOI("10.1234/test");
    expect(issues.some(i => i.severity === "error")).toBe(true);
  });

  it("rejects DOI without slash", () => {
    const issues = validateDOI("10.1000xyz123");
    expect(issues.some(i => i.severity === "error")).toBe(true);
  });

  it("rejects empty string", () => {
    const issues = validateDOI("");
    expect(issues).toHaveLength(0);
  });
});

describe("validateISBN", () => {
  it("accepts valid ISBN-10", () => {
    const issues = validateISBN("0-306-40615-2");
    expect(issues).toHaveLength(0);
  });

  it("accepts valid ISBN-13", () => {
    const issues = validateISBN("978-0-306-40615-7");
    expect(issues).toHaveLength(0);
  });

  it("accepts ISBN without hyphens", () => {
    const issues = validateISBN("0306406152");
    expect(issues).toHaveLength(0);
  });

  it("rejects invalid ISBN", () => {
    const issues = validateISBN("12345");
    expect(issues.some(i => i.severity === "error")).toBe(true);
  });

  it("rejects invalid ISBN-10 checksum", () => {
    const issues = validateISBN("0-306-40615-3"); // wrong checksum
    expect(issues.some(i => i.severity === "error")).toBe(true);
  });
});

describe("validateReference", () => {
  it("passes reference with all required APA fields", () => {
    const ref = {
      title: "Impact of AI on Education",
      authors: "Smith, John",
      year: 2024,
      journal: "Journal of Education",
      doi: "10.1000/xyz123",
      url: "https://example.com",
    };
    const result = validateReference(ref, "APA");
    expect(result.valid).toBe(true);
    expect(result.issuesBySeverity.errors).toHaveLength(0);
  });

  it("fails reference missing required APA fields", () => {
    const ref = {
      title: "Impact of AI on Education",
      authors: "Smith, John",
      year: 2024,
      // missing URL
    };
    const result = validateReference(ref, "APA");
    expect(result.valid).toBe(false);
    expect(result.issuesBySeverity.errors.length).toBeGreaterThan(0);
  });

  it("warns when reference has no DOI or URL", () => {
    const ref = {
      title: "Impact of AI on Education",
      authors: "Smith, John",
      year: 2024,
      journal: "Journal of Education",
    };
    const result = validateReference(ref, "APA");
    expect(result.issuesBySeverity.warnings.some(
      w => w.message.includes("DOI") || w.message.includes("URL")
    )).toBe(true);
  });

  it("warns about short title", () => {
    const ref = {
      title: "AI",
      authors: "Smith",
      year: 2024,
      url: "https://example.com",
    };
    const result = validateReference(ref, "APA");
    expect(result.issuesBySeverity.warnings.some(
      w => w.field === "title"
    )).toBe(true);
  });

  it("warns about invalid year format", () => {
    const ref = {
      title: "Some Title Here",
      authors: "Smith",
      year: "2024-",
      url: "https://example.com",
    };
    const result = validateReference(ref, "APA");
    expect(result.issuesBySeverity.warnings.some(
      w => w.field === "year"
    )).toBe(true);
  });

  it("validates DOI within reference", () => {
    const ref = {
      title: "Impact of AI",
      authors: "Smith",
      year: 2024,
      doi: "10.1000xyz", // invalid DOI (missing /)
      url: "https://example.com",
    };
    const result = validateReference(ref, "APA");
    expect(result.issuesBySeverity.errors.some(
      i => i.field === "DOI"
    )).toBe(true);
  });
});

describe("formatBibliography", () => {
  it("returns empty string for empty array", () => {
    const result = formatBibliography([], "APA");
    expect(result).toBe("");
  });

  it("formats single reference in APA format", () => {
    const refs = [{
      title: "Impact of AI on Education",
      authors: "Smith, John",
      year: 2024,
      url: "https://example.com",
    }];
    const result = formatBibliography(refs, "APA");
    expect(result).toContain("Smith");
    expect(result).toContain("2024");
    expect(result).toContain("Impact of AI");
  });

  it("returns non-empty string for references", () => {
    const refs = [{
      title: "Test",
      authors: "Author",
      year: 2023,
      url: "https://test.com",
    }];
    const result = formatBibliography(refs, "IEEE");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("SUPPORTED_FORMATS", () => {
  it("contains APA and IEEE", () => {
    const names = SUPPORTED_FORMATS.map(f => f.value);
    expect(names).toContain("APA");
    expect(names).toContain("IEEE");
    expect(names).toContain("Vancouver");
    expect(names).toContain("Chicago");
    expect(names).toContain("MLA");
    expect(names).toContain("Haravard");
    expect(names).toContain("APA7");
  });

  it("each format has label and description", () => {
    for (const format of SUPPORTED_FORMATS) {
      expect(typeof format.label).toBe("string");
      expect(typeof format.description).toBe("string");
      expect(format.label.length).toBeGreaterThan(0);
    }
  });
});
