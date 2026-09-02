---
name: Teora Institutional Workspace
colors:
  surface: '#fcf8fa'
  surface-dim: '#dcd9db'
  surface-bright: '#fcf8fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f5'
  surface-container: '#f0edef'
  surface-container-high: '#eae7e9'
  surface-container-highest: '#e4e2e4'
  on-surface: '#1b1b1d'
  on-surface-variant: '#45464d'
  inverse-surface: '#303032'
  inverse-on-surface: '#f3f0f2'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#0058be'
  on-secondary: '#ffffff'
  secondary-container: '#2170e4'
  on-secondary-container: '#fefcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#271901'
  on-tertiary-container: '#98805d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#fcdeb5'
  tertiary-fixed-dim: '#dec29a'
  on-tertiary-fixed: '#271901'
  on-tertiary-fixed-variant: '#574425'
  background: '#fcf8fa'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e4'
  accent-gradient-start: '#2D79FF'
  accent-gradient-end: '#8E54E9'
  emerald-success: '#10B981'
  surface-muted: '#F8FAFC'
typography:
  display-lg:
    fontFamily: Source Serif 4
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Source Serif 4
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Source Serif 4
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
  headline-md:
    fontFamily: Source Serif 4
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.08em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style

The design system is curated for an Academic AI Workspace, serving students, researchers, and higher-education professionals. The brand personality is **erudite, futuristic, and precise**. It bridges the gap between traditional scholarly rigor and the cutting edge of generative intelligence.

The visual style is **Corporate / Modern** with a focus on **Institutional Minimalism**. It prioritizes vast whitespace and high-fidelity typography to mirror the clarity of a well-structured research paper. To differentiate from standard SaaS platforms, it introduces vibrant gradient accents—inspired by the hexagonal logo—representing the dynamic flow of data and neural connections within a stable, professional environment.

## Colors

The palette is anchored by a deep **Oxford Blue** to maintain an authoritative academic presence. Vibrant accents are pulled directly from the brand logo to signify AI interactivity.

- **Primary (Oxford Blue):** Used for headlines, heavy UI borders, and primary navigation to ground the experience in professional stability.
- **Secondary (Electric Blue):** Used for active states, primary buttons, and critical focus indicators.
- **Accents (Blue-to-Purple Gradient):** A linear gradient from #2D79FF to #8E54E9 is reserved for high-impact visual moments: the hexagonal brand icon, token progress bars, and "AI Thinking" states.
- **Neutral (Slate & Gray):** A range of cool-toned grays manages the hierarchy of metadata and secondary interface elements.
- **Background:** Primary canvas is crisp white, while `surface-muted` (#F8FAFC) provides subtle depth for secondary content containers.

## Typography

This design system uses a sophisticated typographic pairing to reflect the "Academic AI" narrative. 

**Source Serif 4** is the signature typeface for headlines, providing a classic, literary feel that aligns with the serif wordmark. **Inter** is the functional workhorse for all body copy and user input, ensuring maximum legibility during long-form reading. **Hanken Grotesk** is used sparingly for labels and small-caps navigation to provide a sharp, modern contrast.

- Use `display-lg` for marketing headers and workspace landing states.
- Headlines should default to Primary Oxford Blue to maintain an authoritative tone.
- `label-md` should be set in uppercase with increased letter spacing for section headers within sidebars.

## Layout & Spacing

A **12-column fluid grid** manages desktop layouts, transitioning to a **4-column grid** on mobile. The system utilizes an 8px spacing rhythm to ensure vertical harmony.

- **Desktop:** Max-width of 1280px. Content is centered with 48px side margins and 24px gutters.
- **Mobile:** Single column stack with 16px margins.
- **Density:** High whitespace is preferred. Group related components (like a search bar and its filters) with `sm` (16px) spacing, while separating major content blocks with `lg` (40px).

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Subtle Glassmorphism** to keep the interface feeling lightweight and modern.

- **Level 0 (Canvas):** Pure white or #F8FAFC.
- **Level 1 (Cards):** White surfaces with a refined 1px border (#E2E8F0). Shadows are avoided here to maintain a flat, scholarly aesthetic.
- **Level 2 (Overlays/Modals):** These use a soft backdrop blur (8px) and a highly diffused shadow: `0 12px 24px -6px rgba(15, 23, 42, 0.08)`.
- **AI Surfaces:** Contextual panels or AI "chat" bubbles may use a 5% opacity tint of the secondary blue to distinguish them from human-generated content.

## Shapes

The shape language is **Soft (0.25rem)**. This provides a precise, tailored appearance that feels more professional than fully rounded designs while remaining more accessible than sharp 90-degree corners.

- **Inputs & Buttons:** 4px radius (`rounded-sm`).
- **Cards & Research Blocks:** 8px radius (`rounded-lg`).
- **Logo/Iconography:** The hexagonal shape of the brand icon should be echoed in secondary iconography styles where possible.

## Components

### Buttons
- **Primary:** Background Oxford Blue (#0F172A), Text White. Precise, sharp, and authoritative.
- **AI Action:** Background uses the Blue-to-Purple gradient. Reserved for "Generate," "Summarize," or "Analyze."
- **Ghost:** Transparent background with a 1px Slate border for secondary navigation.

### Input Fields
- **Search & Query:** Top-aligned labels in Hanken Grotesk. 1px border. Focus state uses a 2px Electric Blue ring.
- **Rich Text Editor:** Clean white canvas with a minimal toolbar.

### Research Cards
- Used for document previews. Title in Source Serif 4, metadata in Hanken Grotesk (Label). Includes a subtle left-accent border in the brand gradient to indicate "AI-Enhanced" files.

### Specialized Components
- **Citation Highlight:** A shaded container (#F1F5F9) with a thick 4px Oxford Blue left border to distinguish quoted text or scholarly references.
- **Token Indicator:** A small circular pill in the top navigation using the brand gradient as a fill to show remaining AI credits.
- **Hexagonal Badge:** Small hexagonal icons used for "Verified Source" or "Expert Peer Review" status.

---

## Implementation: Hybrid Approach (2026-08)

Current Teora implementation uses a **hybrid design** — brand identity from this reference, parchment aesthetic from the existing codebase:

### What was adopted from this reference:
- **Hexagonal TeoraLogo** SVG component (`src/components/brand/teora-logo.tsx`) — blue-to-purple gradient (#2D79FF → #8E54E9) with circuit/signal elements
- **Gradient accent line** on auth pages (top of form cards)
- **Tagline**: "Empowering Academic Excellence through Artificial Intelligence"
- **Google login button** placeholder (disabled, "Coming soon")

### What was preserved from existing implementation:
- **Parchment/warm color palette** — existing `bg-background` with warm undertones
- **Tailwind CSS v4** with CSS-first theming (no Tailwind config file)
- **Radix UI components** — Tabs, Dialog, Dropdown Menu, etc.
- **shadcn/ui patterns** — existing form components, buttons, cards
- **`Source Serif` font** — for headlines (via Tailwind `font-serif`)
- **Inter font** — for body text
- **Dark mode** — CSS `prefers-color-scheme` media queries

### Key divergence from reference:
- Reference uses clean white backgrounds; Teora uses warm parchment
- Reference uses sharp `0.25rem` rounding; Teora uses shadcn defaults
- Reference has high-fidelity glassmorphism; Teora uses subtle shadows

### Design system tokens in use:
```css
/* Blue-purple gradient (from reference) */
from-[#2D79FF] via-[#8E54E9] to-[#2D79FF]
```

### Pages using TeoraLogo:
- `src/pages/login.tsx` — lg size, "Welcome to Teora" heading
- `src/pages/register.tsx` — lg size, "Start your journey" heading