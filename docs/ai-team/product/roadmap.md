# Roadmap - Teora

## Prioritized Feature Roadmap

### Phase 1 — Core MVP (Current)
**Goal**: Basic project workspace with AI document generation

- [x] User auth (register, login, logout, email verify)
- [x] Project CRUD
- [x] Project status transitions
- [x] Document preview
- [x] Document versioning (history)
- [x] Reference management
- [x] Bibliography generation
- [x] Attachment upload/download
- [x] AI chat per project
- [x] Activity timeline
- [x] Project statistics dashboard
- [x] Dark/light mode
- [x] Referral system (create + track)
- [ ] Export to DOCX
- [ ] Export to PDF

### Phase 2 — AI Enhancement
**Goal**: Smarter AI interactions

- [ ] AI outline editor (manual adjustment before writing)
- [ ] AI revision tracking (diff between revisions)
- [ ] Citation formatting options (APA, MLA, Chicago, etc.)
- [ ] AI document summarization
- [ ] Plagiarism check integration
- [ ] Multi-language support

### Phase 3 — Collaboration
**Goal**: Team features

- [ ] Project sharing (invite collaborator)
- [ ] Role-based access (owner, editor, viewer)
- [ ] Real-time collaborative editing
- [ ] Comments on document sections
- [ ] Notification system

### Phase 4 — Integration
**Goal**: External integrations

- [ ] Google Scholar integration (import references)
- [ ] Zotero import/export
- [ ] Mendeley import
- [ ] Cloud storage sync (Google Drive, Dropbox)
- [ ] Academic journal API integration

### Phase 5 — Polish
**Goal**: Production readiness

- [ ] Automated testing (Vitest + Playwright)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Analytics/metrics dashboard
- [ ] A/B testing framework
- [ ] Onboarding tutorial
- [ ] Email notifications
- [ ] Mobile responsive design
- [ ] PWA support

## Icebox (Future Ideas)
- AI research assistant (web search + summarize)
- Document template library
- Academic phrase bank
- Literature review generator
- Peer review system
- Publication submission tracker

## Dependencies & Blockers
- Phase 2 depends on: stable Phase 1
- Phase 3 depends on: Supabase Realtime for collaboration
- Phase 4 depends on: API keys for external services
- Phase 5 depends on: Analytics platform (Plausible/Umami)
