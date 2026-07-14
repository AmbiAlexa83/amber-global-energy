-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 009 — Email Timeline
--
-- Applies to: a database that has already run 003_phase_2_crm.sql (requires
-- public.set_updated_at()), 005_companies.sql, 006_projects.sql, and
-- 007_contracts.sql (this migration adds foreign keys to those tables).
--
-- Safe to run against a live database — all statements are idempotent /
-- IF NOT EXISTS guarded. Does not touch any existing table or row.
--
-- Run order: paste the entire file into the Supabase SQL Editor and execute
-- once. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Step 1: Email timeline table ────────────────────────────────────────────
-- Logs email correspondence (there is no outbound email integration in this
-- app — entries are logged manually by the desk) against an inquiry, company,
-- project, or contract, mirroring the flexible entity-linking pattern used by
-- public.documents in 008_documents.sql.

create table if not exists public.emails (
  id           uuid        primary key default gen_random_uuid(),
  inquiry_id   uuid        references public.inquiries(id) on delete cascade,
  company_id   uuid        references public.companies(id) on delete cascade,
  project_id   uuid        references public.projects(id) on delete cascade,
  contract_id  uuid        references public.contracts(id) on delete cascade,
  direction    text        not null default 'outbound',
  subject      text        not null,
  body         text,
  from_address text,
  to_address   text,
  sent_at      timestamptz not null default now(),
  logged_by    text        not null default 'admin',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── Step 2: Auto-stamp updated_at on every row change ───────────────────────
-- Reuses public.set_updated_at(), created in 003_phase_2_crm.sql.

drop trigger if exists emails_set_updated_at on public.emails;

create trigger emails_set_updated_at
  before update on public.emails
  for each row execute function public.set_updated_at();

-- ─── Step 3: Indexes for per-entity lookups and chronological ordering ───────

create index if not exists emails_inquiry_id_idx
  on public.emails(inquiry_id);

create index if not exists emails_company_id_idx
  on public.emails(company_id);

create index if not exists emails_project_id_idx
  on public.emails(project_id);

create index if not exists emails_contract_id_idx
  on public.emails(contract_id);

create index if not exists emails_sent_at_idx
  on public.emails(sent_at);

-- ─── Step 4: Row-level security — service role access only ──────────────────
-- No public SELECT / INSERT policies are created. The application accesses
-- emails exclusively through the Supabase service-role key, which bypasses
-- RLS entirely. Enabling RLS here prevents any accidental public exposure via
-- the anon key.

alter table public.emails enable row level security;
