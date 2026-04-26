-- Add a seventh profile dimension: the specific things this person reaches for.
-- Used by the moment-image generation step to put concrete, personal textures
-- (named music, specific food, specific places, niche internet) into the
-- background of the seven 2036 scene photographs around each portrait.
-- Nullable so existing profile rows from before this migration still load.

alter table public.profiles
  add column if not exists interests text;
