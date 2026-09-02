import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge, badgeVariants } from "@/components/ui/badge";

describe("Badge component", () => {
  it("renders text content correctly", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("renders as a div by default", () => {
    const { container } = render(<Badge>Tag</Badge>);
    const badge = container.querySelector("div");
    expect(badge).toBeInTheDocument();
    expect(badge?.textContent).toBe("Tag");
  });

  it("applies default variant classes", () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText("Default");
    expect(badge.className).toContain("bg-primary");
  });

  it("applies variant classes for each variant", () => {
    const { rerender } = render(<Badge variant="secondary">Secondary</Badge>);
    expect(screen.getByText("Secondary").className).toContain("bg-secondary");

    rerender(<Badge variant="destructive">Destructive</Badge>);
    expect(screen.getByText("Destructive").className).toContain("bg-destructive");

    rerender(<Badge variant="outline">Outline</Badge>);
    // Outline doesn't have bg-* class, just text-foreground
    expect(screen.getByText("Outline").className).toContain("text-foreground");

    rerender(<Badge variant="success">Success</Badge>);
    expect(screen.getByText("Success").className).toContain("bg-emerald-600");

    rerender(<Badge variant="warning">Warning</Badge>);
    expect(screen.getByText("Warning").className).toContain("bg-amber-500");

    rerender(<Badge variant="info">Info</Badge>);
    expect(screen.getByText("Info").className).toContain("bg-sky-500");

    rerender(<Badge variant="academic-purple">Purple</Badge>);
    expect(screen.getByText("Purple").className).toContain("bg-violet-100");

    rerender(<Badge variant="academic-amber">Amber</Badge>);
    expect(screen.getByText("Amber").className).toContain("bg-amber-100");
  });

  it("merges additional className", () => {
    render(<Badge className="custom-class">Custom</Badge>);
    const badge = screen.getByText("Custom");
    expect(badge.className).toContain("custom-class");
    expect(badge.className).toContain("bg-primary");
  });

  it("forwards HTML attributes to the rendered div", () => {
    render(<Badge data-testid="badge" role="status">Status</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveAttribute("role", "status");
    expect(badge).toHaveTextContent("Status");
  });

  it("has rounded-full styling for pill shape", () => {
    render(<Badge>Pill</Badge>);
    const badge = screen.getByText("Pill");
    expect(badge.className).toContain("rounded-full");
  });

  it("exports badgeVariants for use in class composition", () => {
    expect(badgeVariants).toBeDefined();
    expect(typeof badgeVariants).toBe("function");
  });

  it("supports children as React elements", () => {
    render(
      <Badge>
        <span>icon</span>
        <span>text</span>
      </Badge>
    );
    expect(screen.getByText("icon")).toBeInTheDocument();
    expect(screen.getByText("text")).toBeInTheDocument();
  });
});
