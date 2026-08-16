# Technology Decisions

## Already Decided (Do Not Revisit Without Compelling Reason)

1. **React 19 (not Next.js)** - SPA approach, wouter for routing
2. **Vite** - fast dev, good DX, Vite 7.x
3. **Tailwind CSS v4** - CSS-first config, excellent DX
4. **TanStack Query v5** - server state management
5. **wouter** - lightweight router (not React Router)
6. **Radix UI + shadcn/ui** - accessible components
7. **Drizzle ORM** - type-safe, lightweight, Zod integration
8. **Express 5** - proven HTTP framework
9. **pino** - structured logging
10. **Supabase** - Auth + Database + Storage
11. **Supabase JWT (jose)** - proven auth pattern
12. **OpenAPI + Orval** - API type safety from spec
13. **pnpm workspaces** - monorepo management
14. **Vercel** - frontend hosting
15. **VPS Ubuntu 24** - backend hosting

## Libraries Evaluated but NOT Adopted

- **Prisma (over Drizzle):** too heavy, separate schema language
- **tRPC:** requires separate backend adapter, OpenAPI gives broader tool support
- **ESLint:** not yet configured, considered but not added
- **Playwright:** not yet needed, manual testing sufficient for now
- **Docker:** API server on VPS is simpler for single-dev project
