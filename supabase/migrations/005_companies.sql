-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 005 — Company Management
--
-- Applies to: a database that has already run 003_phase_2_crm.sql (requires
-- public.set_updated_at(), which this migration reuses rather than redefining).
--
-- Safe to run against a live database — all statements are idempotent /
-- IF NOT EXISTS guarded. Does not touch public.inquiries, public.inquiry_history,
-- public.brokers, or any existing rows.
--
-- Run order: paste the entire file into the Supabase SQL Editor and execute
-- once. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Step 1: Company directory table ─────────────────────────────────────────

create table if not exists public.companies (
  id                  uuid        primary key default gen_random_uuid(),
  name                text        not null,
  registration_number text,
  website             text,
  country             text,
  industry            text,
  verification_status text        not null default 'unverified',
  status              text        not null default 'active',
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── Step 2: Auto-stamp updated_at on every row change ───────────────────────
-- Reuses public.set_updated_at(), created in 003_phase_2_crm.sql.

drop trigger if exists companies_set_updated_at on public.companies;

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- ─── Step 3: Indexes for filtering and name lookups ──────────────────────────

create index if not exists companies_status_idx
  on public.companies(status);

create index if not exists companies_name_lower_idx
  on public.companies(lower(name));

-- ─── Step 4: Row-level security — service role access only ──────────────────
-- No public SELECT / INSERT policies are created. The application accesses
-- companies exclusively through the Supabase service-role key, which bypasses
-- RLS entirely. Enabling RLS here prevents any accidental public exposure via
-- the anon key.

alter table public.companies enable row level security;
