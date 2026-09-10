# i18n: English + Indonesian — Design Decisions Pending

> **Status**: Open — awaiting owner decision before implementation
> **Date**: 2026-08-25
> **Owner**: sagise-ctrl
> **Type**: Feature — internationalization

---

## Context

Teora frontend currently has a mixed-language codebase — login/register in English, many pages and toast messages in Indonesian. The owner wants to add a language switcher with English and Indonesian options.

## Resolved Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Source language | **English** | All new strings in English, Indonesian is the translation |
| Scope | **All pages including legal** | Terms of Service + Privacy Policy must be translated too |
| Persistence | **localStorage only** | No database coupling |

## Pending Decisions

### 1. Namespace Strategy

How to organize translation keys in JSON files?

- **Per-page namespaces** (`pages/dashboard`, `pages/login`, `pages/project`) — easier to maintain, less merge conflict
- **Single flat file** (`en.json` / `id.json`) — all translations in one place, faster lookup

**Recommendation**: Per-page namespaces — better for a team, scales well as app grows.

---

### 2. Language Switcher — UI & Placement

Where and how to display the switcher?

**Places considered**:
- Sidebar (near bottom, next to settings)
- Footer
- Settings page
- All of the above

**Style**:
- Toggle buttons: `EN | ID` — simple, space-efficient
- Dropdown with text labels: `English ▾`
- Dropdown with flags: `🇬🇧 English` / `🇮🇩 Indonesia`

**Default behavior**:
- Always start in English (explicit choice)
- Auto-detect browser language → if `id` then Indonesian, else English

**Recommendation**: Toggle `EN | ID` in sidebar near bottom + Settings page. Start always in English unless browser is `id-ID`.

---

### 3. Missing Translation Fallback

When an Indonesian key is missing or misspelled, what to show?

- **English fallback** — recommended, UI stays functional
- **Show the key itself** (e.g., `toast.project.created` as raw text) — useful for debugging during development
- **Console warning** — helps catch untranslated keys

**Recommendation**: English fallback + console warning in development mode.

---

### 4. English-First Development Workflow

Ground rules for adding new strings:

- Every new hardcoded text string in the codebase must be in English
- New strings must be added to translation files immediately (not left for later)
- CI check or lint rule to enforce this?
- Or convention-only (no enforcement)?

**Recommendation**: Convention only for now. Add lint rule later if needed.

---

### 5. Indonesian Translation — Who Does It?

~400 distinct strings including legal documents (Terms of Service, Privacy Policy) that need high accuracy.

Options:
- **AI-assisted** — AI Engineering Team generates draft translations, human reviews (especially legal docs)
- **Manual full** — Professional translator reviews everything
- **Hybrid** — AI drafts for UI strings, human reviews legal pages

**Recommendation**: Hybrid — AI generates drafts, human reviews legal pages carefully.

---

## Technical Notes

- **Library**: `react-i18next` + `i18next`
- **Framework fit**: React 19 + Vite SPA — straightforward integration, no SSR complexity
- **Key count**: ~350-450 distinct strings across ~15+ page files
- **Largest file**: `project.tsx` (2,253 lines, 80+ toast messages)
- **Effort estimate**: ~14-23 hours (one developer)
- **Setup cost**: 2-4 hours (infrastructure, provider, namespaces)
- **No backend coupling**: Frontend-only change

### Files to Change

- `package.json` — add `react-i18next`, `i18next`
- `src/i18n/` — new directory (locales, config)
- `App.tsx` — wrap with `I18nextProvider`
- All page files (~15 files) — replace hardcoded strings with `t('key')`
- `layout.tsx` — add language switcher component
- `.env.example` — add `VITE_DEFAULT_LANGUAGE=en`
- `src/pages/terms.tsx` — translate to English (currently fully Indonesian)
- `src/pages/privacy.tsx` — translate to English (currently fully Indonesian)

---

## Next Steps

1. Owner confirms all pending decisions above
2. AI Engineering Team implements i18n infrastructure
3. Migrate all ~400 strings to translation files (English first)
4. Generate Indonesian translations (AI-assisted drafts)
5. Human review legal pages (Terms, Privacy)
6. Full QA in both languages
