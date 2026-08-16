# Database

PostgreSQL on Supabase

## Tables (13 total)

1. **users** - id (uuid), email, display_name, referral_code, referred_by, created_at, updated_at
2. **projects** - id (uuid), user_id (FK), title, status, output_format, min_references, min_year, instructions, outline, created_at, updated_at
3. **documents** - id (uuid), project_id (FK), version, content, created_at, updated_at
4. **references** - id (uuid), project_id (FK), source, authors, year, journal, doi, url, notes, used_in (JSON), status, created_at, updated_at
5. **attachments** - id (uuid), project_id (FK), filename, original_name, mime_type, size, created_at
6. **messages** - id (uuid), project_id (FK), role, content, created_at
7. **activities** - id (uuid), project_id (FK), user_id (FK), type, description, metadata (JSON), created_at
8. **jobs** - id (uuid), project_id (FK), type, status, progress, result, error, created_at, updated_at
9. **exports** - id (uuid), project_id (FK), format, status, file_path, created_at
10. **project_metadata** - id (uuid), project_id (FK), key, value, created_at, updated_at
11. **referrals** - code (8-char), owner_id (FK), created_at
12. **referral_events** - id, referral_code (FK), event_type, status, metadata (JSON), created_at
13. **index** - unused exports table

## Project Status Enum

draft, analyzing, writing, waiting_revision, completed, archived

## Notes

All tables have created_at and updated_at (except join tables). Indexes on foreign keys and frequently queried columns.

Schema location: lib/db/src/schema/
