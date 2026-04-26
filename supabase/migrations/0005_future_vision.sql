-- The "want_to_become" future is special: the user can revise its
-- description into their own words. We keep the LLM-written original
-- (`life_description`) untouched and store the user's edit separately.
-- `vision_updated_at` is the lock the application reads to enforce the
-- once-per-calendar-month editing rule (gated by ≥15 days of journaling).

alter table public.futures
  add column if not exists vision text,
  add column if not exists vision_updated_at timestamptz;
