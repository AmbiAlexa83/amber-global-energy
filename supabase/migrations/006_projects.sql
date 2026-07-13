-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 006 — Project Pipeline Management
--
-- Applies to: a database that has already run 003_phase_2_crm.sql (requires
-- public.set_updated_at()), 004_brokers.sql, and 005_companies.sql (this
-- migration adds foreign keys to public.brokers and public.companies).
--
-- Safe to run against a live database — all statements are idempotent /
-- IF NOT EXISTS guarded. Does not touch public.inquiries, public.inquiry_history,
-- public.brokers, public.companies, or any existing rows.
--
-- Run order: paste the entire file into the Supabase SQL Editor and execute
-- once. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Step 1: Project pipeline table ───────────────────────────────────────────
-- A project represents a trade deal moving through the desk's pipeline —
-- distinct from an inquiry (the initial lead) and separate from contracts
-- (Phase 3 Feature 5), which will represent the signed agreement stage.

create table if not exists public.projects (
  id                  uuid        primary key default gen_random_uuid(),
  name                text        not null,
  company_id          uuid        references public.companies(id) on delete set null,
  broker_id           uuid        references public.brokers(id) on delete set null,
  inquiry_id          uuid        references public.inquiries(id) on delete set null,
  stage               text        not null default 'prospecting',
  estimated_value     text,
  expected_close_date date,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── Step 2: Auto-stamp updated_at on every row change ───────────────────────
-- Reuses public.set_updated_at(), created in 003_phase_2_crm.sql.

drop trigger if exists projects_set_updated_at on public.projects;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ─── Step 3: Indexes for filtering and joins ─────────────────────────────────

create index if not exists projects_stage_idx
  on public.projects(stage);

create index if not exists projects_company_id_idx
  on public.projects(company_id);

create index if not exists projects_broker_id_idx
  on public.projects(broker_id);

create index if not exists projects_inquiry_id_idx
  on public.projects(inquiry_id);

-- ─── Step 4: Row-level security — service role access only ──────────────────
-- No public SELECT / INSERT policies are created. The application accesses
-- projects exclusively through the Supabase service-role key, which bypasses
-- RLS entirely. Enabling RLS here prevents any accidental public exposure via
-- the anon key.

alter table public.projects enable row level security;
