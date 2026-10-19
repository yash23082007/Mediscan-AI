-- Add optional patient body metrics used by registration and assessment context.
-- Safe to apply to an existing database; columns are nullable.
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2) CHECK (weight > 0 AND weight <= 500),
  ADD COLUMN IF NOT EXISTS height NUMERIC(5,2) CHECK (height > 0 AND height <= 300);