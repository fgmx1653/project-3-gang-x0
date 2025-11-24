-- Add columns to support Google OAuth mapping and email identity
ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS name TEXT;

-- Optional: backfill name from username if empty
UPDATE employees SET name = COALESCE(name, username) WHERE name IS NULL;
