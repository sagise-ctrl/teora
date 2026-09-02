# Business Rules - Teora

## User & Authentication

1. Email must be unique (Supabase constraint)
2. Display name is optional (defaults to email prefix)
3. Email verification required before full access
4. Referral code is 8 random alphanumeric characters (generated on registration)
5. One referral code per user
6. Self-referral not allowed

## Project Rules

1. Project title: required, max 255 chars
2. Assignment instructions: optional, text/markdown
3. Output format: enum (pdf, docx) — currently only pdf implemented
4. Min references: default 5, max 50
5. Min publication year: default 2020, max current year
6. Project status transitions:
   - draft → analyzing (user clicks "Begin Analysis")
   - analyzing → writing (outline generated)
   - writing → waiting_revision (user requests changes)
   - waiting_revision → writing (user clicks "Continue Writing")
   - writing → completed (document exported)
   - completed → archived (user archives)
   - Any status → archived
7. Only one AI job per project at a time
8. User cannot delete project while AI job is running

## Reference Rules

1. DOI format validated with regex
2. Year must be between 1500 and current year
3. Citation format: auto-generated (APA default)
4. Reference can be linked to specific document sections (used_in field)
5. Bibliography regenerates when references change

## AI Job Rules

1. Job types: analyze, write, export
2. Job status: pending → processing → completed | failed
3. Progress: 0-100 integer
4. Failed jobs store error message
5. User can retry failed jobs
6. Job result stored as JSON (format varies by type)

## Export Rules

1. Export types: pdf, docx
2. Export creates background job
3. Export file stored on server (file_path)
4. Export accessible until project archived

## Referral Rules

1. Referrer gets reward when referred user:
   - Registers with referral code
   - Verifies email
   - Creates and completes first project
2. Referral event status lifecycle:
   - pending → verified (email verified)
   - verified → qualified (first project completed)
   - qualified → rewarded (reward applied)
   - Any → rejected (fraud detection)
3. Referral reward: TBD (currency/credits — not yet implemented)

## Attachment Rules

1. Max file size: 10MB
2. Allowed mime types: PDF, DOCX, DOC, TXT, RTF, images
3. Filename sanitized on upload
4. Original filename preserved for download

## Rate Limiting

1. /api/auth/*: 5 requests per minute per IP
2. No rate limit on other endpoints (auth is sufficient protection)
