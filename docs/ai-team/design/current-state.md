# Current UI State - Design Audit

## Overview

Teora sudah memiliki design system berbasis Tailwind CSS v4 dengan palette *parchment/ink* yang thematic untuk academic workspace. Namun secara struktural, UI masih mengikuti pattern generik dari shadcn/ui template.

## Strengths (Yang Sudah Bagus)

| Aspek | Detail |
|-------|--------|
| Color palette | Warm parchment backgrounds + deep navy foreground — thematic untuk academic workspace |
| Typography | Fraunces serif untuk headings, DM Sans untuk body — strong typographic identity |
| Background texture | Subtle SVG noise texture (opacity 0.02) — subtle depth detail |
| Semantic badges | Custom success/warning/info variants dengan real color semantics |
| Letterpress shadows | Custom flat-bottom shadow style — printed-page quality |
| Typography plugin | Fraunces baked into CardTitle dan DialogTitle |
| Dark mode | next-themes dengan CSS variables auto-switching |

## Weaknesses (Yang Template-y)

| Aspek | Masalah | Effort Fix |
|-------|---------|-----------|
| Every component verbatim shadcn/ui | Tidak ada custom styling | Medium |
| 3-stat-card dashboard row | Textbook dashboard pattern | Low |
| Sidebar + main two-column layout | Canonical layout, identical ke ratusan template | Medium |
| Auth pages (centered card) | Textbook pattern | Low |
| Chat bubbles (user right, AI left) | Standard chat UI | Low |
| Tabs pill style (default shadcn) | Sudah di-override dengan underline style — good | Low |
| Empty states with generic icons | Perlu custom illustrations | Medium |
| No micro-animations | App feels static | Low |
| Prose styling default Tailwind | Academic document styling tidak custom | Low |

## Component Analysis

### Cards (src/components/ui/card.tsx)
- Composition pattern: Card > CardHeader > CardTitle > CardDescription > CardContent > CardFooter
- CardTitle hardcoded: `font-serif text-primary` — consistent but inflexible
- Shadow style: letterpress (flat bottom border) — distinctive
- **Needs:** Custom variants (elevated, ghost, outline, academic)

### Buttons (src/components/ui/button.tsx)
- CVA-based variants: default, destructive, outline, secondary, ghost, link
- Sizes: default, sm, lg, icon
- **Needs:** Loading state variant, academic-style variant

### Badges (src/components/ui/badge.tsx)
- Custom variants: success (emerald), warning (amber), info (sky)
- Academic-style treatment sudah bagus
- **Needs:** Link variant, custom variants untuk status

### Tabs (src/components/ui/tabs.tsx)
- Default Radix Tabs dengan `bg-muted p-1`
- **Override:** Project page uses underline style — this is already a good custom touch
- **Needs:** Consistent underline style across all tab usages

### Input/Select/Textarea (src/components/ui/*.tsx)
- Standard shadcn styling
- **Needs:** Custom focus states, academic-style variants

### Dialog (src/components/ui/dialog.tsx)
- Radix Dialog dengan overlay `bg-black/80`
- DialogTitle uses `font-serif` — matches card titles
- **Needs:** Size variants (sm, md, lg, xl)

### Progress (src/components/ui/progress.tsx)
- Radix Progress, simple styling
- **Needs:** Label variant, segmented progress

### Toasts (src/hooks/use-toast.ts)
- Sonner-style implementation
- Already good

## Page Analysis

### Dashboard (pages/dashboard.tsx)
- Header + stats row + search + project grid
- Stats row: 3-card horizontal — **most template-y element**
- Project cards: basic Card + hover state
- Empty state: dashed border + icon
- **Quick fix:** Kill 3-stat row, replace with integrated info strip
- **Medium fix:** Paper stack effect on project cards

### Project Workspace (pages/project.tsx)
- 6-tab interface (Preview, Chat AI, Referensi, Lampiran, Riwayat Versi, Timeline)
- Tab underline style already custom — good
- Chat: standard bubbles
- References: table with dialog
- Timeline: vertical with dot markers
- **Good:** Tab styling already customized

### Auth Pages (pages/login.tsx, register.tsx)
- Centered card on full-viewport background
- Logo block with Fraunces wordmark
- Form with react-hook-form + zod
- **Already distinctive:** Teora branding in logo

### New Project (pages/new-project.tsx)
- Single large form in a Card
- 3-column settings grid
- **Good:** Clean, focused, back link maintains context

## CSS / Theme (index.css)

Palette (CSS variables):
- Background: warm parchment (light), deep navy (dark)
- Foreground: deep ink blue (light), warm cream (dark)
- Primary: deep ink
- Accent: burnt rust
- Secondary, muted, destructive follow warm palette

Fonts:
- Sans: DM Sans
- Serif: Fraunces (headings, wordmark, card titles)
- Mono: Space Mono (code, referral codes)

Shadows:
- Letterpress style: `box-shadow: 2px 3px 0 var(--border)`
- **Distinctive** — this is a good touch

## Color Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| background | 40 33% 96% | 220 50% 10% | Page background |
| foreground | 220 50% 15% | 40 33% 90% | Primary text |
| primary | 215 50% 25% | 40 40% 85% | Brand color |
| accent | 12 60% 45% | 12 60% 45% | Warm contrast |
| sidebar | 40 33% 94% | 220 50% 8% | Sidebar bg |
| sidebar-accent | 40 33% 92% | 220 50% 12% | Sidebar highlight |

## Missing Design Elements

1. **Loading skeletons** — only basic animate-pulse div
2. **Empty state illustrations** — inline SVG illustrations
3. **Page transitions** — no Framer Motion integration yet
4. **Hover micro-interactions** — subtle scale/translate effects
5. **Focus states** — custom focus rings (default browser focus is ugly)
6. **Custom scrollbar** — already styled but could be more refined
7. **Selection color** — already overridden
8. **Academic prose styling** — default Tailwind Typography, not custom
