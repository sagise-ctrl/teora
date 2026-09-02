# Coding Standards

## TypeScript

- Strict mode enabled
- No implicit `any`
- Explicit return types on exported functions

## React

- Functional components with hooks only
- No class components

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Components | PascalCase | `ProjectCard.tsx` |
| Functions/variables | camelCase | `fetchProjectById` |
| Env vars | SCREAMING_SNAKE_CASE | `VITE_API_URL` |
| Non-component files | kebab-case | `use-auth.tsx` |

## Imports

- Use `@/` alias for `src/`
- Absolute imports within a package

## Async / Error Handling

- Express 5 does NOT auto-catch rejections -- wrap all async route handlers
- Always handle rejection in route handlers
- Error responses must be structured: `{ error: string, details?: unknown }`

## Logging

- Use `pino` logger
- Log level appropriately:
  - `info` for business logic milestones
  - `debug` for detailed execution info
- Never log secrets, env vars, or tokens

## Comments

- Only for WHY (not WHAT)
- No TODO comments without an issue link

## File Size

- Prefer smaller files under 300 lines
- Split if growing beyond that

## Dependencies

- Ask approval before adding new dependencies
- Log new deps to `research/decision-log.md`

## CSS

- Tailwind utility classes
- CSS variables for theme tokens
- No inline styles except for dynamic values

## Dark Mode

- Teora uses Tailwind CSS v4 with CSS-first theming
- Theme tokens defined in `index.css` via CSS variables under `@theme`
- No `next-themes` or Tailwind config file needed
- Browser respects `prefers-color-scheme` automatically via CSS media queries

## Responsive Design

- Mobile-first approach
- Breakpoints: `sm` (640), `md` (768), `lg` (1024), `xl` (1280)

## Images

- Use optimized loading
- Avoid large unoptimized images
