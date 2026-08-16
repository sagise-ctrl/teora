# Research Playbook

> Structured research methodology for evaluating libraries, tools, and technical decisions in Teora.

## When to Research

- Adding new dependencies
- Evaluating alternative libraries
- Architecture decisions (e.g., state management, routing)
- Performance optimization options
- Security solutions
- External API integrations

## Research Steps

### 1. Define Problem
Clear statement of the problem to solve:
```
Problem: Need [X] because [current pain point]
Requirements:
- Must have: [critical features]
- Nice to have: [secondary features]
- Constraints: [limitations]
```

### 2. Gather Options
- Search for top 3-5 options
- Check: GitHub stars, recent commits, maintenance, community size
- Read official docs and README

### 3. Evaluate Each Option

Evaluate against:
| Criteria | Weight | Notes |
|----------|--------|-------|
| Maintenance | High | Active maintenance? Responsive maintainers? |
| TypeScript | High | Native TS support or good types? |
| Bundle size | Medium | Impact on frontend load time |
| Dependencies | Medium | Transitive dependencies, supply chain risk |
| License | High | Permissive (MIT/Apache) or restrictive? |
| Performance | Medium | Benchmarks, real-world performance |
| DX | Medium | Developer experience, docs quality |
| Community | Low | Stack Overflow, Discord, GitHub issues |
| Compatibility | High | Works with our stack (React 19, Vite, etc.)? |

### 4. Make Recommendation
Write recommendation in `docs/ai-team/research/technology-decisions.md`:

```markdown
## [Decision Title] — YYYY-MM-DD

**Problem:** ...

**Options Evaluated:**
1. Option A — [pros/cons]
2. Option B — [pros/cons]
3. Option C — [pros/cons]

**Recommendation:** Option [X]

**Rationale:** ...
```

### 5. Implementation Plan
- Add to knowledge base
- Set up proof of concept if needed
- Implement incrementally
- Monitor for issues

## Research Sources

- Official documentation
- GitHub repository (issues, PRs, commits)
- npm/pnpm package stats
- Stack Overflow / Reddit
- Performance benchmarks (if applicable)
- Security advisories

## Decision Criteria for Teora

Given our stack (React 19, Vite, Express, Drizzle, PostgreSQL, Supabase):

| Factor | Why It Matters |
|--------|---------------|
| React 19 compatible | Breaking changes in React ecosystem |
| Bundle size | Vercel cold start + user experience |
| License | Commercial product |
| TypeScript first | Reduce type errors |
| Active maintenance | Avoid abandoned libraries |

## Key Files

| File | Purpose |
|------|---------|
| `docs/ai-team/research/technology-decisions.md` | Decision log |
| `docs/ai-team/research/README.md` | Research process |
| `package.json` | Current dependencies |
