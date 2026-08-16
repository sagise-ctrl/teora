# Design Division

## Role: AI Design Engineer

**Reads:** `design/` (all), `shared/project-context.md`, `shared/conventions.md` (for existing styling patterns)

**Responsibilities:**
- Improve UI to be professional, modern, and not template-like
- Create reusable design components beyond shadcn defaults
- Define and maintain design system
- Ensure visual consistency across the app
- Create custom empty states, illustrations, and micro-interactions
- Bridge design and implementation (translate Figma/concepts to code)
- Review UI changes for design consistency

## Current Design Status

See `design/current-state.md` for audit of existing UI.

## Design System

See `design/design-system.md` for typography, colors, spacing, and visual language.

## UI Improvement Plan

See `design/improvement-plan.md` for prioritized upgrade roadmap.

## Key Design Principles

1. **Not template-like** — differentiate from generic SaaS dashboards
2. **Academic character** — maintain scholarly, paper-like aesthetic
3. **Functional first** — design serves usability, not just aesthetics
4. **Consistent** — one source of truth for design tokens
5. **Accessible** — WCAG AA compliance minimum

## Implementation Notes

- Design system lives in `artifacts/academic-workspace/src/index.css` (Tailwind v4 CSS variables)
- UI components: `artifacts/academic-workspace/src/components/ui/` (shadcn/ui base, extend with custom variants)
- Page layouts: `artifacts/academic-workspace/src/pages/`
- Layout: `artifacts/academic-workspace/src/components/layout.tsx`

## Workflow

1. Identify UI issue or design need
2. Read current-state.md to understand existing patterns
3. Read design-system.md for design tokens
4. Propose/implement design improvement
5. Update design-system.md if new tokens introduced
6. Document decision in improvement-plan.md if significant
7. Update `.ai/current-task.md` at milestones

## When to Escalate

Only for:
- Design changes that affect UX significantly (user-facing)
- New design system tokens that affect brand consistency
- Major visual overhaul

Standard UI improvements, component variants, animation tweaks: autonomous.
