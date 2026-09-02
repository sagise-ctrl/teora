# Product Requirements - Teora

## Overview

Teora adalah AI Academic Workspace — aplikasi berbasis AI untuk mengelola tugas akademik dan makalah penelitian.

## Target User

- Mahasiswa (undergraduate/graduate)
- Peneliti akademik
- Dosen

## Core Problem

Menulis makalah penelitian itu kompleks: butuh organisasi referensi, outline, versi dokumen, timeline aktivitas, dan sekarang — AI yang bisa membantu menulis, menganalisis instruksi, dan mengekspor ke format akademik.

## Core Features

### 1. Project Management
- Create, read, update, delete project
- Project metadata: title, instructions, output format, min references, min publication year
- Project status: draft → analyzing → writing → waiting_revision → completed → archived
- Project statistics dashboard

### 2. Document Generation (AI)
- Analyze instructor instructions → generate outline
- Write chapters from outline
- Regenerate sections
- Document versioning with history
- Export to PDF, DOCX

### 3. Reference Management
- Add references manually (title, authors, year, journal, DOI, URL, notes)
- Validate references (DOI lookup)
- Link references to specific document sections (used_in)
- Generate bibliography (multiple citation formats)
- Reference status tracking

### 4. AI Chat
- Context-aware chat per project
- AI remembers project context (outline, references, instructions)
- Chat history persisted
- Typing indicator
- AI job status polling

### 5. Attachment Management
- Upload files to project
- File type and size validation
- Download attachments

### 6. Activity Timeline
- Log all project activities
- Activity types: created, updated, status_changed, reference_added, document_created, etc.
- Chronological timeline view

### 7. Export
- Export document to PDF/DOCX
- Export status tracking
- Background job processing

### 8. Authentication & User Management
- Email/password registration and login
- Email verification
- JWT-based session
- Referral system (8-char codes, referral tracking)
- User profile (display name)

### 9. Share & Earn (Referral)
- Generate unique referral code
- Share referral link
- Track referral status (pending → verified → qualified → rewarded → rejected)

## User Flows

### New User Registration
1. User registers with email, password, optional display name, optional referral code
2. Email verification sent via Supabase
3. On verification, local user record created
4. Referral status tracked if code was used
5. Redirected to dashboard

### Create New Project
1. User clicks "New Project"
2. Fills: title, assignment instructions, output format, min references, min year
3. Project created with status: draft
4. User redirected to project workspace

### AI Document Generation Flow
1. User clicks "Begin Analysis" on project
2. System creates `analyze` job
3. AI analyzes instructions → generates outline
4. Project status: analyzing
5. User reviews outline
6. User clicks "Write Document"
7. System creates `write` job
8. AI writes document from outline + references
9. Project status: writing
10. Document created/updated
11. User can request revisions (status: waiting_revision)
12. Cycle repeats until completed

### Export Flow
1. User clicks "Export"
2. System creates `export` job
3. AI generates document in requested format
4. Export status: completed
5. User downloads file

## Acceptance Criteria per Feature

### Authentication
- [ ] User can register with email + password
- [ ] User can verify email
- [ ] User can login with email + password
- [ ] User can logout
- [ ] JWT session persists across requests
- [ ] Referral code tracked on registration

### Projects
- [ ] Authenticated user can create project
- [ ] User sees only their own projects
- [ ] Project detail shows all tabs (Preview, Chat, References, Attachments, History, Timeline)
- [ ] Status badge reflects current status
- [ ] Stats show correct counts (total, in-progress, completed)

### Documents
- [ ] Document preview renders formatted content
- [ ] Version history shows all snapshots
- [ ] Can view any past version

### References
- [ ] Can add reference with DOI
- [ ] DOI validates automatically
- [ ] Reference linked to project
- [ ] Bibliography regenerates when references change

### Chat
- [ ] Messages persist across page reloads
- [ ] AI responds contextually
- [ ] Typing indicator shows during AI processing
- [ ] Chat history loads on tab switch

### Attachments
- [ ] Can upload files
- [ ] Files stored and downloadable
- [ ] File type/size validated

### Export
- [ ] Can request export to PDF
- [ ] Export job processes in background
- [ ] Completed export downloadable

## Status Definitions

| Status | Description |
|--------|-------------|
| draft | Project created, no AI processing started |
| analyzing | AI analyzing instructions and generating outline |
| writing | AI writing document content |
| waiting_revision | User requested changes, AI awaiting next write cycle |
| completed | Document finished and exported |
| archived | Project archived by user |

## Business Rules

1. **Project isolation**: Users can only see/access their own projects
2. **Referral reward**: Referrer gets reward when referred user completes first project
3. **Document versioning**: Every save creates a new version snapshot
4. **AI concurrency**: Only one AI job per project at a time (queue with concurrency limit)
5. **Export format**: Currently supports PDF. DOCX planned.
6. **Reference minimum**: User specifies min_references and min_year per project
7. **No AI in draft status**: Begin Analysis triggers first AI job
