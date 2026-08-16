---
name: TugasAI Institutional SaaS
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001a42'
  on-tertiary-container: '#3980f4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Montserrat
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
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
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

The design system is engineered for an Academic AI Platform, targeting students, researchers, and educators. The brand personality is **authoritative, precise, and empowering**. It balances the rigor of traditional academia with the velocity of modern artificial intelligence.

The visual style is **Corporate / Modern**, leaning heavily into a refined SaaS aesthetic. It utilizes a structured "Institutional Minimalism" characterized by significant whitespace, high-fidelity typography, and subtle depth. The goal is to evoke a sense of focus and intellectual clarity, removing visual noise to prioritize research and content generation.

## Colors

The palette is anchored by **Oxford Blue** (#0F172A), providing a stable, trustworthy foundation reminiscent of prestigious academic institutions. 

- **Primary (Oxford Blue):** Used for headlines, primary navigation, and high-importance interfaces.
- **Secondary (Emerald Green):** Used for token balances, "Success" states, and primary Call-to-Actions. It represents growth and the "AI spark."
- **Tertiary (Electric Blue):** Used for links, interactive accents, and feature highlights.
- **Neutral (Slate):** A range of cool grays used for body text, borders, and secondary metadata.
- **Background:** Crisp white (#FFFFFF) is the primary canvas, with extremely light gray (#F8FAFC) used for section nesting.

## Typography

The typography strategy employs a dual-font system to bridge the gap between "Brand" and "Utility."

**Montserrat** is reserved for headings and display text. Its geometric precision conveys modernism and confidence. For long-form reading, research papers, and UI controls, **Inter** provides exceptional legibility and a neutral, systematic feel. 

- Use `display-lg` for landing page hero sections only.
- `headline-lg` and `headline-md` should use the Primary color (#0F172A).
- `body-md` is the standard for all AI-generated content and research abstracts.
- `label-md` is intended for small caps navigation or section headers above headlines.

## Layout & Spacing

This design system follows a **12-column fluid grid** for desktop and a **4-column grid** for mobile. The rhythm is based on a 4px baseline shift to ensure mathematical harmony across all components.

- **Desktop (1280px+):** Max-width container of 1200px, centered. 24px gutters.
- **Tablet (768px - 1279px):** Fluid width with 24px side margins.
- **Mobile (Up to 767px):** Single column stack with 16px side margins.

Horizontal spacing between related elements (e.g., an icon and text) should use `xs` (8px). Vertical spacing between distinct sections should use `lg` (40px) to maintain a "breathable" academic atmosphere.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Ambient Shadows**. This design avoids heavy borders, opting instead for soft depth to signify interactivity.

- **Level 0 (Base):** #FFFFFF or #F8FAFC.
- **Level 1 (Cards/Surface):** White background with a 1px border (#E2E8F0) and a very soft, diffused shadow: `0 4px 6px -1px rgb(0 0 0 / 0.05)`.
- **Level 2 (Dropdowns/Modals):** Elevated with a more pronounced shadow to indicate focus: `0 10px 15px -3px rgb(0 0 0 / 0.1)`.
- **Interactive States:** On hover, Level 1 elements should transition to a slightly deeper shadow and a subtle Y-axis lift (-2px).

## Shapes

The shape language is **Soft (0.25rem)**. This choice reflects a professional, "tailored" appearance that is more approachable than sharp corners but more serious than highly rounded "bubbly" UI.

- **Buttons & Inputs:** 0.25rem (4px) corner radius.
- **Cards & Containers:** 0.5rem (8px) corner radius.
- **Large Modals:** 0.75rem (12px) corner radius.
- **Avatar/Icons:** Use circular (pill) shapes only for profile photos or status indicators.

## Components

### Buttons
- **Primary:** Background #0F172A, Text #FFFFFF. Solid, no gradient.
- **CTA/Token:** Background #10B981, Text #FFFFFF. High-contrast emerald for conversion points.
- **Secondary:** Background transparent, Border 1px #E2E8F0, Text #0F172A.

### Input Fields
- Use a "floating label" or clear top-aligned label.
- Border: 1px #E2E8F0.
- Focus State: Border #3B82F6 with a 3px soft blue outer glow.

### Cards (Research/Tugas)
- White background, 1px #E2E8F0 border.
- Padding: 24px (`md`).
- Title in Montserrat, Body in Inter.

### Chips & Tags
- Used for "Subject Tags" or "AI Status".
- Subtle background tint (e.g., #F1F5F9) with #475569 text.
- 0.25rem radius.

### Specialized Components
- **Token Progress Bar:** A thin 4px bar using a gradient from #3B82F6 to #10B981 to visualize AI credit usage.
- **Citation Block:** A distinct container with a left-accent border (4px) in Oxford Blue to highlight academic references.