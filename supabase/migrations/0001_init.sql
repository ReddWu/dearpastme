-- Dear Past Me — initial schema
-- Run this in Supabase SQL editor (or via `supabase db push`).
-- Assumes Anonymous Sign-Ins is ENABLED in Auth → Providers.

create extension if not exists "pgcrypto";

-- ============================================================
-- profiles : the six dimensions a user pastes back from their AI
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  current_self text,
  inertia text,
  the_thing text,
  passive_mode text,
  late_night_scene text,
  unspoken_desire text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- ============================================================
-- futures : the three branches generated for a user
-- ============================================================
create type future_branch as enum ('flowing', 'realized', 'drifting');

create table if not exists public.futures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  branch future_branch not null,
  image_url text,
  life_description text,
  letter text,
  voice_message_text text,
  voice_message_url text,
  generation_round int not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists futures_user_round_idx
  on public.futures (user_id, generation_round desc);

-- ============================================================
-- future_marks : want_to_become / afraid_of
-- ============================================================
create type future_mark_kind as enum ('want_to_become', 'afraid_of');

create table if not exists public.future_marks (
  user_id uuid not null references auth.users(id) on delete cascade,
  future_id uuid not null references public.futures(id) on delete cascade,
  mark future_mark_kind not null,
  created_at timestamptz not null default now(),
  primary key (user_id, future_id, mark)
);

-- ============================================================
-- voices : ElevenLabs voice clone
-- ============================================================
create table if not exists public.voices (
  user_id uuid primary key references auth.users(id) on delete cascade,
  elevenlabs_voice_id text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- journal_entries
-- ============================================================
create type journal_recipient as enum ('flowing', 'realized', 'drifting', 'all');

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  recipient journal_recipient not null default 'all',
  reply_triggered boolean not null default false,
  reply_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists journal_user_time_idx
  on public.journal_entries (user_id, created_at desc);

-- ============================================================
-- replies : letters that arrive (delayed)
-- ============================================================
create type reply_trigger as enum ('journal', 'birthday');

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_branch future_branch not null,
  trigger_journal_id uuid references public.journal_entries(id) on delete set null,
  text_content text not null,
  voice_url text,
  trigger_type reply_trigger not null,
  created_at timestamptz not null default now(),
  delivered_at timestamptz not null
);

create index if not exists replies_user_delivered_idx
  on public.replies (user_id, delivered_at);

alter table public.journal_entries
  add constraint journal_reply_fk
  foreign key (reply_id) references public.replies(id) on delete set null
  deferrable initially deferred;

-- ============================================================
-- updated_at trigger (only for tables that need it)
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
before update on public.profiles
for each row execute procedure public.touch_updated_at();

-- ============================================================
-- Row Level Security : every table is keyed on user_id = auth.uid()
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.futures         enable row level security;
alter table public.future_marks    enable row level security;
alter table public.voices          enable row level security;
alter table public.journal_entries enable row level security;
alter table public.replies         enable row level security;

create policy "own_profiles"        on public.profiles        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_futures"         on public.futures         for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_marks"           on public.future_marks    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_voice"           on public.voices          for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_journal"         on public.journal_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_replies"         on public.replies         for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Storage buckets
-- ============================================================
insert into storage.buckets (id, name, public)
  values ('selfies', 'selfies', false)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('voices', 'voices', false)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('futures', 'futures', true)
  on conflict (id) do nothing;

-- Per-bucket RLS: object path begins with the user's id, e.g. "<uid>/file.png"
create policy "selfies_owner_rw" on storage.objects
  for all to authenticated
  using  (bucket_id = 'selfies' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'selfies' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "voices_owner_rw" on storage.objects
  for all to authenticated
  using  (bucket_id = 'voices' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'voices' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "futures_owner_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'futures' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "futures_public_read" on storage.objects
  for select using (bucket_id = 'futures');
