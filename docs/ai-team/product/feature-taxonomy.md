# Feature Taxonomy — Teora

> Classification of all features based on user intent and scope hierarchy.
> Approved by AI Team discussion 2026-08-25. Source of truth for feature placement and scoping decisions.

---

## Core Principle

> **User intent drives feature classification.** Features are grouped by what the user is trying to accomplish, not by technical implementation.

Sub-features may appear across multiple Feature Principals but must have clearly defined scope based on where they exist.

---

## Resource Hierarchy

```
ACCOUNT LEVEL (global)    →  All sub-features accessible across projects
PROJECT LEVEL             →  Sub-features scoped to one project
SECTION LEVEL             →  Sub-features scoped to one chapter/section within a document
```

Every sub-feature follows this hierarchy. When a sub-feature appears in multiple Feature Principals, it inherits scope from that context.

---

## Feature Principals

### F1. Account Management
**User intent:** Manage identity and account-level resources.

| Sub-feature | Scope | Notes |
|-------------|-------|-------|
| Authentication | — | Register, login, logout, token refresh, email verification |
| Profile | — | Display name, avatar |
| **Global Reference Library** | ACCOUNT | User's personal reference pool — reusable across all projects |
| **Account AI Chat** | ACCOUNT | Cross-project awareness. Can access all user data across projects. Understands entire account context. |
| Referral & Reward | — | Generate code, track status, apply rewards |

---

### F2. Project Creation & Management
**User intent:** Create and manage a project workspace.

| Sub-feature | Scope | Notes |
|-------------|-------|-------|
| Create Project | — | Title, instructions, metadata, output format, min references, min year |
| Project Dashboard | — | List, search, filter by status |
| Project Settings | — | Edit, archive, delete |
| Activity Timeline | PROJECT | Chronological log of all project events |
| Share & Invite | PROJECT | Share link (view/comment/edit), collaborator invite, role-based access |
| **Project AI Chat** | PROJECT | Scoped to active project. Knows all sections, references, and documents within this project. |
| Project Reference Pool | PROJECT | References selected from global library, tagged to project |

---

### F3. Document Workspace
**User intent:** Write and structure a document.

**Structure:** 1 Project = 1 Document. A document contains virtual sections (chapters) that can be navigated independently. Each section has its own scoped context but all sections compile into one final output.

```
Document
├── Chapter/Section Navigator
│   ├── Section 1 (e.g., "Bab 1 Pendahuluan")
│   │   ├── Section Outline
│   │   ├── Section References
│   │   └── Section AI Chat
│   ├── Section 2
│   │   └── ...
│   └── Section N
├── Master Outline (overall document structure)
├── Document Content
├── Document Revision (revise specific section)
├── Version History (snapshots, compare, restore)
├── Attachment (per section or per project)
├── Comments (per section)
└── Compile/Merge → Export PDF/DOCX
```

| Sub-feature | Scope | Notes |
|-------------|-------|-------|
| Section Navigator | SECTION | Navigate between chapters. Each section has isolated context. |
| Master Outline | PROJECT | Overall document structure (e.g., Bab 1.1, 1.2, 2.1). Defines the complete document skeleton. |
| Section Outline | SECTION | Outline for the active section only |
| **Section AI Chat** | SECTION | Scoped to active section. If user navigates from Section 1 to Section 3, chat context changes. |
| Section References | SECTION | References tagged to this section only |
| Document Revision | SECTION | Revise a specific section or part. Follows section scope. |
| Version History | PROJECT | All snapshots across all sections. Version per document, not per section. |
| Attachment | PROJECT or SECTION | Upload files (instruction, rubric, supplement) |
| Comments | SECTION | Inline comments scoped to active section |
| **Document Template** | ACCOUNT | Saved outline structures reusable across projects. User can create custom templates (Skripsi, Proposal, Laporan) and reuse them when starting new projects. |
| Compile/Merge | PROJECT | Combine all sections into final output (PDF, DOCX, Markdown) |
| **Export DOCX** | PROJECT | Generate downloadable Word document from compiled sections |
| **Export PDF** | PROJECT | Generate downloadable PDF from compiled sections (background job) |

---

### F4. Assessment & Learning
**User intent:** Create and take assessments.

| Sub-feature | Scope | Notes |
|-------------|-------|-------|
| Quiz Generator | PROJECT | AI generates questions (multiple choice, short answer, essay) |
| Quiz Submission | PROJECT | Student submits answers |
| Auto-Grading | PROJECT | Automatic grading for MCQ and short answer |
| Rubric Generator | PROJECT | AI generates assessment rubric |
| Rubric Editor | PROJECT | Manually edit rubric criteria |
| Submission Viewer | PROJECT | Teacher views all submissions |
| Assessment AI Chat | ASSESSMENT | Scoped to the active quiz and its material |

---

### F5. Reference & Citation
**User intent:** Find, manage, and format academic references.

| Sub-feature | Scope | Notes |
|-------------|-------|-------|
| **Search References** | GLOBAL | Search academic papers from the internet (CrossRef, Semantic Scholar, etc.). User enters a topic and gets relevant papers. |
| Import References | — | Import from DOI (CrossRef API) or ISBN (Open Library API) |
| Global Library View | ACCOUNT | Browse all references in user's personal account-level library |
| Project Pool | PROJECT | References selected from global library, tagged to project |
| Section Tag | SECTION | Tag a reference to a specific section |
| Reference Validation | SECTION | Validate completeness per citation format |
| Bibliography Generator | SECTION | Format references into citation styles (APA, IEEE, Vancouver, Chicago, MLA, Harvard) |
| **Reference AI Chat** | REFERENCE | Context-aware chat about references and citation formats |
| **Zotero Sync** | ACCOUNT | Sync references with Zotero library (import/export) |

---

### F6. Collaboration & Feedback
**User intent:** Share work and provide feedback.

| Sub-feature | Scope | Notes |
|-------------|-------|-------|
| Share Link | PROJECT | Shareable link with access modes (view, comment, edit) |
| Inline Comments | SECTION | Comments on specific text within a section |
| Threaded Replies | SECTION | Nested comment replies |
| Comment Resolve | SECTION | Mark comment as resolved or reopen |
| Project Members | PROJECT | Invite collaborators, assign roles (collaborator, viewer) |
| Notifications | ACCOUNT | Alerts for new comments, revision requests |

---

### F7. Monitoring & Analytics
**User intent:** Track usage and performance.

| Sub-feature | Scope | Notes |
|-------------|-------|-------|
| AI Usage Dashboard | ACCOUNT | Token usage, cost, per user. Viewable by owner and admin. |
| Project Activity | PROJECT | Per-project analytics |
| FinOps Admin | ACCOUNT | Owner dashboard for financial operations |

---

## AI Chat Scope Matrix

```
┌──────────────────────────┬──────────────────────────┬──────────────────────────────────────┐
│ Location                 │ Scope                    │ What it knows                       │
├──────────────────────────┼──────────────────────────┼──────────────────────────────────────┤
│ F1 — Account AI Chat    │ ACCOUNT                  │ All projects, all sections,          │
│ (Dashboard)              │                          │ all references, all data             │
├──────────────────────────┼──────────────────────────┼──────────────────────────────────────┤
│ F2 — Project AI Chat    │ PROJECT                  │ All sections within active project,  │
│                          │                          │ project references, outline,           │
│                          │                          │ instructions                         │
├──────────────────────────┼──────────────────────────┼──────────────────────────────────────┤
│ F3 — Section AI Chat    │ SECTION                  │ Active section outline, references,   │
│                          │                          │ content + project-level context       │
├──────────────────────────┼──────────────────────────┼──────────────────────────────────────┤
│ F4 — Assessment AI Chat  │ ASSESSMENT               │ Active quiz and its material         │
├──────────────────────────┼──────────────────────────┼──────────────────────────────────────┤
│ F5 — Reference AI Chat   │ REFERENCE                │ All references in scope,             │
│                          │                          │ citation formats, bibliography rules   │
└──────────────────────────┴──────────────────────────┴──────────────────────────────────────┘
```

---

## Key Principles

### P1 — Narrow Scope
Sub-features must have clearly defined boundaries. AI chat at the Dashboard does not know the same things as AI chat within a section.

### P2 — Section-Aware Context
Navigation between sections changes AI chat context. When a user moves from Section 1 to Section 3, the AI chat understands only Section 3's context (plus project-level context).

### P3 — Account-Level Resources
Users own global resources at the account level that can be reused across projects and sections without re-entering data. Reference Library is the primary example.

### P4 — Virtual Sections, Single Document
One project contains one document. Sections are virtual partitions for organizational purposes. All sections compile into a single output file.

### P5 — Revision is Universal
Revision and review capabilities exist within every feature that creates or modifies documents. It is not a separate standalone feature.

### P6 — Reference Reuse Chain
```
Account Library (add once)
    ↓ reused in
Project Pool (select from library)
    ↓ tagged to
Section Tag (assign to specific chapter)
```

---

## Current Implementation Status

### ✅ Fully Implemented
- F1: Authentication, Profile, Referral
- F2: Create/List/Update/Delete Project, Activity Timeline, Share Link
- F3: Section Navigator, Master Outline, Document Content, Version History
- F4: Quiz Generator, Quiz Submission, Rubric Generator
- F5: Import from DOI/ISBN, Reference Validation, Bibliography Generator
- F6: Inline Comments, Threaded Replies, Comment Resolve, Share Link
- F7: AI Usage Log

### ⚠️ Partial / Needs Upgrade
- F3 Section References — currently project-level, needs section scoping
- F3 Section AI Chat — currently project-level, needs section-aware context
- F5 Search References — exists as DOI/ISBN lookup, needs full internet search
- F3 Export DOCX — not implemented
- F3 Export PDF — not implemented
- F7 AI Usage Dashboard UI — table exists, UI not built

### ❌ Not Implemented
- F1 Global Reference Library — no account-level library page
- F3 Document Template — no template save/load
- F5 Search References (internet) — no academic paper search
- F5 Zotero Sync — no Zotero integration
- F6 Project Members (invite collaborator)
- F6 Notifications system
- F7 FinOps Admin Dashboard — owner cost dashboard not built

---

## Questions for Owner Decision

| # | Question | Options |
|---|----------|---------|
| 1 | Reference Search engine | CrossRef Search API (free, reliable) or Semantic Scholar (more powerful) |
| 2 | PDF Export method | Puppeteer/Chromium (free, self-hosted) or external API (ConvertAPI/Docify — paid, faster) |
| 3 | Implementation start | Database migration first, or full feature implementation (database + UI) |

---

## Maintenance

When adding a new feature or sub-feature, apply this taxonomy:
1. Identify the user intent — which Feature Principal does it belong to?
2. Determine the scope — account, project, section, or something else?
3. Check if a similar sub-feature exists elsewhere — can it be reused or does it need adaptation?
4. Document scope in the relevant API route and AI prompt
5. Update this document when classification changes

Last Updated: 2026-08-25
