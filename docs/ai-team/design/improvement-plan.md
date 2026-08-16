# UI Improvement Plan - Teora

## Prioritized Upgrade Roadmap

Setiap item memiliki: impact (high/medium/low), effort (high/medium/low), dan priority (1-10).

### High Priority — Quick Wins (Impact: High, Effort: Low)

#### 1. Kill Dashboard 3-Stat Row → Info Strip
- **Status:** ✅ Implemented 2026-08-16 — InfoStrip component replaces 3-card grid
- **Impact:** High (most template-y element)
- **Effort:** Low
- **Current:** 3 separate cards in a grid row
- **Target:** Integrated horizontal strip in header area
- **Before:**
  ```
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ Total    │ │ In Prog │ │ Done     │
  │ Projects │ │ ress     │ │          │
  │    12    │ │    5     │ │    7     │
  └──────────┘ └──────────┘ └──────────┘
  ```
- **After:**
  ```
  ┌────────────────────────────────────────────┐
  │ 12 Projects │ 5 In Progress │ 7 Done    │
  └────────────────────────────────────────────┘
  ```
- **Files:** `artifacts/academic-workspace/src/pages/dashboard.tsx`

#### 2. Paper Stack Effect on Project Cards
- **Status:** ✅ Implemented 2026-08-16 — layered shadow offsets on project cards with hover lift
- **Impact:** Medium (visible on every project view)
- **Effort:** Low
- **Current:** Basic Card with border
- **Target:** Layered paper aesthetic with subtle offset shadow
- **CSS:**
  ```css
  /* Stack layer behind */
  .card-paper-stack::before {
    content: '';
    position: absolute;
    inset: 0;
    translate: 2px 2px;
    background: var(--color-primary/5);
    border-radius: inherit;
    z-index: -1;
  }
  ```
- **Files:** `artifacts/academic-workspace/src/components/ui/card.tsx`

#### 3. Sidebar Active Indicator
- **Status:** Partial (uses bg-primary text-primary on active link)
- **Impact:** Medium
- **Effort:** Low
- **Target:** Left border indicator + gradient accent
- **Before:** Active link has full background highlight
- **After:** Subtle left border + text color change
- **Files:** `artifacts/academic-workspace/src/components/layout.tsx`

#### 4. Academic-Style Status Badges
- **Status:** ✅ Implemented 2026-08-16 — academic-purple (violet) and academic-amber variants added
- **Impact:** Medium (visible on every project card)
- **Target:** Uppercase, tracking-wider, border-based badges
- **CSS:**
  ```css
  .badge-academic {
    font-size: 0.65rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-width: 1px;
    border-style: solid;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
  }
  ```
- **Files:** `artifacts/academic-workspace/src/components/ui/badge.tsx`

### Medium Priority — Design System Extension

#### 5. Empty State Illustrations (Custom SVG)
- **Status:** Not implemented
- **Impact:** Medium (improves user experience on empty states)
- **Effort:** Medium
- **Approach:** Inline SVG illustrations per context
- **Variants needed:**
  - Projects empty: stacked papers illustration
  - References empty: open book illustration
  - Attachments empty: document with paperclip
  - Chat empty: conversation bubbles
- **Files:** New component `artifacts/academic-workspace/src/components/empty-state.tsx`

#### 6. Custom Card Variants (Elevated, Ghost, Academic)
- **Status:** Not implemented
- **Impact:** Medium
- **Effort:** Medium
- **Extend Card component with variants:
  - `elevated`: shadow-letterpress (brand signature)
  - `ghost`: transparent background, no shadow
  - `accent`: sidebar-accent background
- **Files:** `artifacts/academic-workspace/src/components/ui/card.tsx`

#### 7. Chat Tab: Academic Document Styling
- **Status:** Not implemented
- **Impact:** Medium (core feature)
- **Effort:** Medium
- **Current:** Standard chat bubbles (user right, AI left)
- **Target:** AI messages styled like edited manuscript, user messages clean
- **Enhancements:**
  - AI messages: bg-secondary + left border accent + serif font for headers
  - Typing indicator: custom academic-style (not bouncing dots)
  - Message timestamps: subtle, not prominent
- **Files:** `artifacts/academic-workspace/src/pages/project.tsx` (ChatTab)

#### 8. Framer Motion Integration
- **Status:** Not installed
- **Impact:** Medium (improves perceived quality)
- **Effort:** Medium (install + basic usage)
- **Steps:**
  1. `pnpm add framer-motion`
  2. Add page transition wrapper
  3. Add micro-interactions on cards, buttons
  4. Add staggered list animations
- **Files:** `artifacts/academic-workspace/src/App.tsx` + components

### Low Priority — Polish

#### 9. Custom Focus Rings
- **Status:** Default browser focus
- **Impact:** Low
- **Effort:** Low
- **Target:** Custom focus-visible ring matching brand
- **CSS:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`

#### 10. Custom Scrollbar Refinement
- **Status:** Basic custom scrollbar exists
- **Impact:** Low
- **Effort:** Low
- **Target:** More refined, consistent with theme
- **CSS:**
  ```css
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--color-muted-foreground); }
  ```

#### 11. Loading Skeleton Improvements
- **Status:** Basic animate-pulse div
- **Impact:** Low
- **Effort:** Low
- **Target:** Skeleton components matching actual content layout

#### 12. Academic Prose Styling (Document Preview)
- **Status:** Default Tailwind Typography prose
- **Impact:** Medium (document preview is core feature)
- **Effort:** Medium
- **Target:** Custom typography for academic documents
- **CSS:**
  ```css
  .academic-prose {
    font-family: var(--font-serif);
    line-height: 1.8;
    font-size: 1rem;
  }
  .academic-prose h1, .academic-prose h2, .academic-prose h3 {
    font-family: var(--font-serif);
  }
  .academic-prose p { margin-bottom: 1.25em; }
  ```

## Implementation Checklist

- [x] Info strip on dashboard (priority 1) ✅
- [x] Paper stack card effect (priority 2) ✅
- [ ] Sidebar active indicator (priority 3) — partial, already functional
- [x] Academic status badges (priority 4) ✅
- [ ] Empty state components (priority 5)
- [ ] Custom card variants (priority 6)
- [ ] Chat academic styling (priority 7)
- [ ] Framer Motion (priority 8)
- [ ] Custom focus rings (priority 9)
- [ ] Scrollbar refinement (priority 10)
- [ ] Loading skeletons (priority 11)
- [ ] Academic prose (priority 12)

## What NOT to Change

- **Color palette** — parchment/ink sudah tepat untuk academic workspace
- **Typography** — Fraunces + DM Sans sudah memberikan identity
- **Sidebar layout** — functional, cukup upgrade visual details saja
- **Dark mode** — sudah berfungsi dengan baik via next-themes

## Design Review Process

Sebelum merge UI change:
1. Periksa current-state.md — apakah ada precedent?
2. Periksa design-system.md — apakah design token baru perlu ditambahkan?
3. Apakah perubahan konsisten dengan brand (scholarly, refined, warm)?
4. Apakah accessible (contrast ratio, focus states)?
5. Apakah responsive?
