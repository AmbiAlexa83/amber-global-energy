-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003 — Phase 2 CRM
--
-- Applies to: an existing Supabase project that was bootstrapped with the
-- pre-Phase-2 schema (schema.sql rows 1–80).
--
-- Safe to run against a live database — all statements are idempotent or use
-- IF NOT EXISTS / IF EXISTS guards.  No existing inquiry rows are deleted or
-- modified except for the priority default normalisation in step 4.
--
-- Run order: paste the entire file into the Supabase SQL Editor and execute
-- once.  Do NOT run again — the UPDATE in step 4 is a no-op on a clean
-- database but harmless if re-executed.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Step 1: Add Phase 2 columns to public.inquiries ─────────────────────────

alter table public.inquiries
  add column if not exists last_contacted_at timestamptz;

alter table public.inquiries
  add column if not exists notes text;

-- ─── Step 2: Trigger function — auto-stamp updated_at on every row change ─────

create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Step 3: Attach the trigger to public.inquiries ──────────────────────────
-- DROP + CREATE is the safest idempotent pattern for triggers in PostgreSQL 13
-- and below.  Supabase currently runs PostgreSQL 15, where CREATE OR REPLACE
-- TRIGGER is available, but the DROP + CREATE form works on all versions.

drop trigger if exists inquiries_set_updated_at on public.inquiries;

create trigger inquiries_set_updated_at
  before update on public.inquiries
  for each row execute function public.set_updated_at();

-- ─── Step 4: Normalise legacy priority values ─────────────────────────────────
-- The Phase 2 priority vocabulary uses 'normal' instead of the old 'medium'.
-- Update any existing rows so the database is consistent with the application.
-- The column default is also updated so new rows from the API get 'normal'.

update public.inquiries
  set priority = 'normal'
  where priority = 'medium';

alter table public.inquiries
  alter column priority set default 'normal';

-- ─── Step 5: Audit / history table ───────────────────────────────────────────

create table if not exists public.inquiry_history (
  id            uuid        primary key default gen_random_uuid(),
  inquiry_id    uuid        not null references public.inquiries(id) on delete cascade,
  field_changed text        not null,
  old_value     text,
  new_value     text,
  changed_at    timestamptz not null default now(),
  changed_by    text        not null default 'admin'
);

-- ─── Step 6: Index for fast per-inquiry history lookups ──────────────────────

create index if not exists inquiry_history_inquiry_id_idx
  on public.inquiry_history(inquiry_id);

-- ─── Step 7: Row-level security — service role access only ───────────────────
-- No public SELECT / INSERT policies are created.  The application accesses
-- inquiry_history exclusively through the Supabase service-role key, which
-- bypasses RLS entirely.  Enabling RLS here prevents any accidental public
-- exposure via the anon key.

alter table public.inquiry_history enable row level security;
