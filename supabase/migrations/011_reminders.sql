-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 011 — Calendar and Follow-Up Reminders
--
-- Applies to: a database that has already run 003_phase_2_crm.sql (requires
-- public.set_updated_at()), 005_companies.sql, 006_projects.sql,
-- 007_contracts.sql, and 010_role_based_permissions.sql (this migration adds
-- foreign keys to public.companies, public.projects, public.contracts, and
-- public.admin_users).
--
-- Safe to run against a live database — all statements are idempotent /
-- IF NOT EXISTS guarded. Does not touch any existing table or row.
--
-- Run order: paste the entire file into the Supabase SQL Editor and execute
-- once. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Step 1: Reminders table ──────────────────────────────────────────────────
-- A follow-up reminder attached to an inquiry, company, project, or contract —
-- the same flexible entity-linking pattern as public.documents and
-- public.emails. assigned_to is optional and only meaningful once Team
-- accounts exist (010_role_based_permissions.sql); it is not required.

create table if not exists public.reminders (
  id          uuid        primary key default gen_random_uuid(),
  inquiry_id  uuid        references public.inquiries(id) on delete cascade,
  company_id  uuid        references public.companies(id) on delete cascade,
  project_id  uuid        references public.projects(id) on delete cascade,
  contract_id uuid        references public.contracts(id) on delete cascade,
  title       text        not null,
  notes       text,
  due_at      timestamptz not null,
  status      text        not null default 'pending',
  assigned_to uuid        references public.admin_users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Step 2: Auto-stamp updated_at on every row change ───────────────────────
-- Reuses public.set_updated_at(), created in 003_phase_2_crm.sql.

drop trigger if exists reminders_set_updated_at on public.reminders;

create trigger reminders_set_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

-- ─── Step 3: Indexes for the calendar view and per-entity lookups ────────────

create index if not exists reminders_due_at_idx
  on public.reminders(due_at);

create index if not exists reminders_status_idx
  on public.reminders(status);

create index if not exists reminders_inquiry_id_idx
  on public.reminders(inquiry_id);

create index if not exists reminders_company_id_idx
  on public.reminders(company_id);

create index if not exists reminders_project_id_idx
  on public.reminders(project_id);

create index if not exists reminders_contract_id_idx
  on public.reminders(contract_id);

-- ─── Step 4: Row-level security — service role access only ──────────────────
-- No public SELECT / INSERT policies are created. The application accesses
-- reminders exclusively through the Supabase service-role key, which bypasses
-- RLS entirely. Enabling RLS here prevents any accidental public exposure via
-- the anon key.

alter table public.reminders enable row level security;
