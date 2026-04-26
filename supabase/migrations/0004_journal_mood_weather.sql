-- Add per-entry mood and weather to journal pages.
-- Both nullable so old entries (and entries written without selecting either)
-- still load. The values are free-form text so the chip set in the UI can
-- evolve without a migration.

alter table public.journal_entries
  add column if not exists mood text,
  add column if not exists weather text;
