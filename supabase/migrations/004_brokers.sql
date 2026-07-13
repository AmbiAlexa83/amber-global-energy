-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004 — Broker Management
--
-- Applies to: a database that has already run 003_phase_2_crm.sql (requires
-- public.set_updated_at(), which this migration reuses rather than redefining).
--
-- Safe to run against a live database — all statements are idempotent /
-- IF NOT EXISTS guarded. Does not touch public.inquiries, public.inquiry_history,
-- or any existing rows.
--
-- Run order: paste the entire file into the Supabase SQL Editor and execute
-- once. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Step 1: Broker roster table ─────────────────────────────────────────────

create table if not exists public.brokers (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  email      text,
  phone      text,
  region     text,
  specialty  text,
  status     text        not null default 'active',
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Step 2: Auto-stamp updated_at on every row change ───────────────────────
-- Reuses public.set_updated_at(), created in 003_phase_2_crm.sql.

drop trigger if exists brokers_set_updated_at on public.brokers;

create trigger brokers_set_updated_at
  before update on public.brokers
  for each row execute function public.set_updated_at();

-- ─── Step 3: Index for filtering active brokers ──────────────────────────────

create index if not exists brokers_status_idx
  on public.brokers(status);

-- ─── Step 4: Row-level security — service role access only ──────────────────
-- No public SELECT / INSERT policies are created. The application accesses
-- brokers exclusively through the Supabase service-role key, which bypasses
-- RLS entirely. Enabling RLS here prevents any accidental public exposure via
-- the anon key.

alter table public.brokers enable row level security;
