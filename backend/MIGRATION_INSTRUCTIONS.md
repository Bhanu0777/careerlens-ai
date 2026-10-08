# CareerLens Database Migration Instructions

This document explains how to set up the CareerLens database in Supabase.

## Prerequisites

- A Supabase project with URL and anon key available
- Your backend `.env` file at `backend/.env` already contains `SUPABASE_URL` and `SUPABASE_KEY`
- Python 3.9+ and `supabase-py` installed (`pip install -r backend/requirements.txt`)

---

## Step 1: Run the Initial Schema Migration

1. Open your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New query**
4. Open the file `backend/supabase/migrations/001_initial_schema.sql` in your editor
5. Copy the entire contents and paste into the Supabase SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. You should see "Success. No rows returned."

---

## Step 2: Run the Provenance Schema Migration

1. In Supabase SQL Editor, click **New query** again
2. Open `backend/supabase/migrations/002_provenance_schema.sql`
3. Copy the entire contents and paste into the SQL Editor
4. Click **Run**
5. You should see "Success. No rows returned."

---

## Step 3: Verify Tables Were Created

In Supabase SQL Editor, run:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables (at minimum):
- `data_collection_log`
- `jobs`
- `market_skills`
- `market_statistics`

To verify provenance columns exist on the jobs table:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'jobs'
AND column_name IN ('source_name', 'source_url', 'first_seen_at', 'last_verified_at', 'verification_status', 'content_hash', 'verification_notes')
ORDER BY column_name;
```

---

## Step 4: Run the Seed Script

After both migrations succeed, populate initial market data:

```bash
cd backend
python seed_market_data.py
```

Expected output:
```
Seeding market_skills...
Upserted 15 market_skills rows.
Seeding market_statistics...
Inserted ~45 market_statistics rows.
Seed complete.
```

---

## Troubleshooting

### "relation already exists" error
This means you already ran part of the migration. It is safe to re-run — the migrations use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.

### "column does not exist" error
Run Step 2 (002_provenance_schema.sql) — it adds provenance columns to the jobs table.

### Seed script fails with "Invalid API key"
Check that `backend/.env` has the correct `SUPABASE_URL` and `SUPABASE_KEY` values from your Supabase project settings.

---

## Notes

- `GEMINI_API_KEY` in `backend/.env` is used for AI-powered career analysis. The app functions without it but career intelligence features will return errors.
- `DATABASE_URL` (direct Postgres connection) is not required for the app to run — Supabase REST API is used throughout. It is only needed if you prefer running migrations via `psql` directly instead of the SQL Editor.
