# API Design

Express 5, REST, OpenAPI YAML as source of truth

Base URL: configured via VITE_API_URL (frontend) / env PORT (backend)

## Routes (src/routes/)

### Health
- GET /health - health check, no auth

### Auth
- POST /api/auth/login - { email, password } -> sets cookies, returns user
- POST /api/auth/register - { email, password, display_name?, referral_code? } -> creates user + local record
- POST /api/auth/logout - clears cookies
- GET /api/auth/me - returns current user from JWT
- POST /api/auth/refresh - refresh JWT
- GET /api/auth/referrals - referral stats for current user

### Projects
- GET /api/projects - list user's projects
- POST /api/projects - create project
- GET /api/projects/stats - user's project statistics (MUST be before /:id route)
- GET /api/projects/:id - get project detail
- PATCH /api/projects/:id - update project
- DELETE /api/projects/:id - delete project

### Documents
- GET /api/projects/:id/documents - list documents
- POST /api/projects/:id/documents - create document
- GET /api/projects/:id/documents/:docId - get document
- PATCH /api/projects/:id/documents/:docId - update document

### References
- GET /api/projects/:id/references - list references
- POST /api/projects/:id/references - add reference
- DELETE /api/projects/:id/references/:refId - delete reference
- GET /api/projects/:id/references/:refId/regenerate - regenerate bibliography entry
- POST /api/projects/:id/references/:refId/validate - validate DOI

### Attachments
- GET /api/projects/:id/attachments - list attachments
- POST /api/projects/:id/attachments - upload attachment
- DELETE /api/projects/:id/attachments/:attId - delete attachment

### Messages
- GET /api/projects/:id/messages - list chat messages
- POST /api/projects/:id/messages - send chat message

### Jobs
- GET /api/projects/:id/jobs - list jobs
- POST /api/projects/:id/jobs - create job (analyze, write, export)
- GET /api/projects/:id/jobs/:jobId - get job status

### Activities
- GET /api/projects/:id/activities - list activities

### Exports
- GET /api/projects/:id/exports - list exports
- POST /api/projects/:id/exports - create export

### Metadata
- GET /api/projects/:id/metadata - get metadata
- PATCH /api/projects/:id/metadata - update metadata

### Webhooks
- POST /api/webhooks/* - webhook endpoints (no auth)

## Authentication

JWT Bearer token in Authorization header OR cookie (sb_access_token).

## Rate Limiting

5 req/min per IP on /api/auth/* endpoints.
