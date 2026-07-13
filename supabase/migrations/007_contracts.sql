-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 007 — Contract Management
--
-- Applies to: a database that has already run 003_phase_2_crm.sql (requires
-- public.set_updated_at()), 004_brokers.sql, 005_companies.sql, and
-- 006_projects.sql (this migration adds foreign keys to public.companies,
-- public.projects, and public.brokers).
--
-- Safe to run against a live database — all statements are idempotent /
-- IF NOT EXISTS guarded. Does not touch public.inquiries, public.inquiry_history,
-- public.brokers, public.companies, public.projects, or any existing rows.
--
-- Run order: paste the entire file into the Supabase SQL Editor and execute
-- once. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Step 1: Contracts table ──────────────────────────────────────────────────
-- A contract represents the signed-agreement stage of a deal — distinct from
-- a project (the pipeline stage tracking a deal before it's won) and an
-- inquiry (the initial lead). Linked to a project only when the contract
-- originated from a pipeline deal; company and broker are denormalized onto
-- the contract directly so it stands alone even if the project is removed.

create table if not exists public.contracts (
  id             uuid        primary key default gen_random_uuid(),
  contract_number text,
  title          text        not null,
  company_id     uuid        references public.companies(id) on delete set null,
  project_id     uuid        references public.projects(id) on delete set null,
  broker_id      uuid        references public.brokers(id) on delete set null,
  status         text        not null default 'draft',
  contract_value text,
  start_date     date,
  end_date       date,
  signed_date    date,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ─── Step 2: Auto-stamp updated_at on every row change ───────────────────────
-- Reuses public.set_updated_at(), created in 003_phase_2_crm.sql.

drop trigger if exists contracts_set_updated_at on public.contracts;

create trigger contracts_set_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

-- ─── Step 3: Indexes for filtering and joins ─────────────────────────────────

create index if not exists contracts_status_idx
  on public.contracts(status);

create index if not exists contracts_company_id_idx
  on public.contracts(company_id);

create index if not exists contracts_project_id_idx
  on public.contracts(project_id);

create index if not exists contracts_broker_id_idx
  on public.contracts(broker_id);

-- ─── Step 4: Row-level security — service role access only ──────────────────
-- No public SELECT / INSERT policies are created. The application accesses
-- contracts exclusively through the Supabase service-role key, which bypasses
-- RLS entirely. Enabling RLS here prevents any accidental public exposure via
-- the anon key.

alter table public.contracts enable row level security;
