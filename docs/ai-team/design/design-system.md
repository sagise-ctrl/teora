# Design System - Teora

## Visual Identity

**Brand:** Academic workspace dengan nuansa scholarly — bukan corporate SaaS, bukan playful startup.

**Mood words:** Scholarly, refined, warm, professional, paper-like, focused.

## Color System

### Semantic Colors (CSS Variables)

Semua warna didefinisikan sebagai CSS variables di `index.css` dengan format Tailwind v4:

```css
@theme {
  --color-background: oklch(40 33% 96%);     /* Warm parchment — page bg */
  --color-foreground: oklch(220 50% 15%);   /* Deep ink — primary text */
  --color-primary: oklch(215 50% 25%);       /* Deep ink — brand */
  --color-primary-foreground: oklch(40 33% 96%);
  --color-accent: oklch(12 60% 45%);         /* Burnt rust — warm accent */
  --color-accent-foreground: oklch(40 33% 96%);
  --color-secondary: oklch(92% 10% 240/10);
  --color-secondary-foreground: oklch(220 50% 15%);
  --color-muted: oklch(94% 5% 240/10);
  --color-muted-foreground: oklch(220 10% 45%);
  --color-destructive: oklch(55% 55% 25/85%);
  --color-destructive-foreground: oklch(98% 0% 0/95%);
  --color-border: oklch(90% 5% 240/30);
  --color-ring: oklch(215 50% 25%);
  
  /* Semantic */
  --color-sidebar: oklch(40 33% 94%);
  --color-sidebar-accent: oklch(40 33% 92%);
  --color-sidebar-foreground: oklch(220 50% 15%);
  --color-card: oklch(98% 3% 240/95%);
  --color-card-foreground: oklch(220 50% 15%);
  --color-popover: oklch(40 33% 96%);
  --color-popover-foreground: oklch(220 50% 15%);
  
  /* Status */
  --color-success: oklch(55% 40% 145);
  --color-warning: oklch(70% 55% 80);
  --color-info: oklch(60% 50% 230);
}
```

### Dark Mode

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: oklch(220 50% 10%);
    --color-foreground: oklch(40 33% 90%);
    --color-primary: oklch(40 40% 85%);
    --color-sidebar: oklch(220 50% 8%);
    --color-card: oklch(220 50% 12%);
    /* ... */
  }
}
```

### Color Usage Guide

| Color | Usage |
|-------|-------|
| Primary | Brand actions, active states, links, CTAs |
| Accent | Highlights, notifications, badges, emphasis |
| Success | Completed status, success messages, positive actions |
| Warning | Pending, revision needed, caution states |
| Info | In-progress, informational badges |
| Destructive | Delete actions, errors, danger states |
| Muted | Secondary text, disabled states, borders |

## Typography

### Font Stack

```css
--font-sans: "DM Sans", ui-sans-serif, system-ui, sans-serif;
--font-serif: "Fraunces", ui-serif, Georgia, serif;
--font-mono: "Space Mono", ui-monospace, monospace;
```

### Type Scale

| Level | Font | Size | Weight | Line Height | Usage |
|-------|------|------|--------|-------------|-------|
| Display | Serif | 3rem/48px | 600 | 1.1 | Hero headings (not currently used) |
| H1 | Serif | 2rem/32px | 600 | 1.2 | Page titles |
| H2 | Serif | 1.5rem/24px | 600 | 1.3 | Section headings |
| H3 | Serif | 1.25rem/20px | 600 | 1.4 | Card titles, subsections |
| H4 | Sans | 1rem/16px | 600 | 1.5 | Labels, navigation |
| Body | Sans | 0.875rem/14px | 400 | 1.6 | Regular text |
| Small | Sans | 0.75rem/12px | 400 | 1.5 | Captions, metadata |
| Mono | Mono | 0.75rem/12px | 400 | 1.5 | Code, referral codes |

**Note:** CardTitle dan DialogTitle sudah auto-applied dengan `font-serif` — pertahankan ini.

## Spacing

Using Tailwind default scale (rem-based):

```
0: 0
1: 0.25rem (4px)
2: 0.5rem (8px)
3: 0.75rem (12px)
4: 1rem (16px)
5: 1.25rem (20px)
6: 1.5rem (24px)
8: 2rem (32px)
10: 2.5rem (40px)
12: 3rem (48px)
16: 4rem (64px)
```

**Content width:** max-w-6xl (72rem/1152px) — konsisten untuk semua page content

**Sidebar:** Fixed 256px (w-64)

## Border Radius

Using Tailwind default:

| Token | Value | Usage |
|-------|-------|-------|
| sm | 0.25rem (4px) | Small badges, tags |
| md | 0.375rem (6px) | Buttons, inputs (base radius) |
| lg | 0.5rem (8px) | Cards, dialogs |
| xl | 0.75rem (12px) | Large cards |
| 2xl | 1rem (16px) | Auth cards |

## Shadows

### Letterpress Style (Brand Signature)

```css
/* Card default shadow — distinctive Teora style */
.shadow-letterpress {
  box-shadow: 2px 3px 0 var(--color-border);
}

/* Elevated variant */
.shadow-letterpress-lg {
  box-shadow: 3px 4px 0 var(--color-border);
}

/* Hover state — subtle lift */
.shadow-letterpress-hover {
  box-shadow: 3px 4px 0 var(--color-primary/20);
}
```

### Usage Pattern

```
Cards: shadow-letterpress (subtle, paper-like, not floating)
Modals: shadow-lg (floating above paper)
Dropdowns: shadow-md
Inputs: shadow-sm atau ring (focused state)
```

## Motion

### Timing

```css
--duration-fast: 150ms;   /* Hover, micro-interactions */
--duration-normal: 200ms; /* Transitions, reveals */
--duration-slow: 300ms;   /* Page transitions, modals */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
```

### Animation Principles

1. **Subtle** — enhance, don't distract
2. **Purposeful** — communicate state change
3. **Fast** — 150-300ms max for UI
4. **Reduced motion** — respect `prefers-reduced-motion`

### Common Animations

| Animation | Duration | Use Case |
|-----------|----------|----------|
| fade-in | 200ms | Page content load |
| slide-up | 250ms | Modal open, toast |
| scale-in | 150ms | Button press feedback |
| slide-down | 200ms | Dropdown open |

## UI Components (Custom Variants to Add)

### Card Variants (extend existing)

```typescript
// Extend cardVariants with custom variants:
variants: {
  variant: {
    default: "bg-card border-border",
    elevated: "bg-card shadow-letterpress",      // Brand signature
    ghost: "bg-transparent border-transparent shadow-none",
    outline: "bg-transparent border-border",
    accent: "bg-sidebar-accent border-border",
  },
  size: {
    default: "p-6",
    compact: "p-4",
    spacious: "p-8",
  }
}
```

### Badge Academic Variants (extend existing)

```typescript
// Add to badgeVariants:
variant: {
  academic: "bg-primary/5 text-primary border border-primary/20 uppercase tracking-wider text-xs",
  draft: "bg-muted text-muted-foreground border border-border",
  analyzing: "bg-amber-50 text-amber-700 border border-amber-200",
  writing: "bg-blue-50 text-blue-700 border border-blue-200",
  waiting_revision: "bg-orange-50 text-orange-700 border border-orange-200",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  archived: "bg-stone-100 text-stone-500 border border-stone-200",
}
```

### Status Indicators

```typescript
// Consistent status dot pattern:
status-dot: "inline-block w-2 h-2 rounded-full"
status-dot-success: "bg-emerald-500"
status-dot-warning: "bg-amber-500"
status-dot-error: "bg-red-500"
status-dot-info: "bg-blue-500"
status-dot-animate: "animate-pulse"
```

## Custom Components to Create

### EmptyState

```typescript
// artifacts/academic-workspace/src/components/empty-state.tsx
interface EmptyStateProps {
  icon: ReactNode; // Lucide icon or custom SVG
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  variant?: 'default' | 'projects' | 'references' | 'attachments';
}
```

### StatusBadge

```typescript
// Consistent status badge across app
interface StatusBadgeProps {
  status: 'draft' | 'analyzing' | 'writing' | 'waiting_revision' | 'completed' | 'archived';
  size?: 'sm' | 'default';
}
```

### InfoStrip (replaces 3-stat card row)

```typescript
// Horizontal info bar replacing dashboard stats row
interface InfoStripProps {
  items: Array<{ label: string; value: string; color?: string }>;
}
```

## Iconography

**Library:** Lucide React (sudah digunakan)

**Guidelines:**
- Size: `w-4 h-4` (16px) untuk nav dan inline, `w-5 h-5` (20px) untuk buttons
- Stroke: 2px default
- Color: `text-muted-foreground` default, `text-primary` active
- Custom: inline SVG untuk empty state illustrations

## Decorative Elements

### Noise Texture (Existing — Good)
```css
background-image: url("data:image/svg+xml,..."); /* subtle grain */
opacity: 0.02;
```

### Corner Fold (Project Cards)
```css
background: linear-gradient(135deg, transparent 50%, var(--color-primary/5) 50%);
```

### Divider Rules
```css
/* Gradient line dividers in sidebar */
background: linear-gradient(90deg, var(--color-primary/40), var(--color-primary/10), transparent);
height: 1px;
```
