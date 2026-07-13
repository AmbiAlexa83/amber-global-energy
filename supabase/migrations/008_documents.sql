-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 008 — Document Upload and Storage
--
-- Applies to: a database that has already run 003_phase_2_crm.sql (requires
-- public.set_updated_at()), 004_brokers.sql, 005_companies.sql,
-- 006_projects.sql, and 007_contracts.sql (this migration adds foreign keys
-- to public.companies, public.projects, and public.contracts).
--
-- Safe to run against a live database — all statements are idempotent /
-- IF NOT EXISTS / ON CONFLICT guarded. Does not touch any existing table,
-- bucket, or row.
--
-- Run order: paste the entire file into the Supabase SQL Editor and execute
-- once. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Step 1: Private storage bucket for uploaded files ───────────────────────
-- public = false: objects are never served directly by URL. The application
-- reads and writes exclusively via the service-role key (which bypasses
-- storage RLS, same trust model as every other table in this schema) and
-- serves downloads through short-lived signed URLs generated on demand.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- ─── Step 2: Document metadata table ─────────────────────────────────────────
-- A document can be attached to an inquiry, a company, a project, or a
-- contract (exactly the four record types with a detail page in the admin).
-- All four links are nullable and independent — a document may be linked to
-- one, several, or (rarely) none of them.

create table if not exists public.documents (
  id           uuid        primary key default gen_random_uuid(),
  inquiry_id   uuid        references public.inquiries(id) on delete cascade,
  company_id   uuid        references public.companies(id) on delete cascade,
  project_id   uuid        references public.projects(id) on delete cascade,
  contract_id  uuid        references public.contracts(id) on delete cascade,
  file_name    text        not null,
  storage_path text        not null,
  file_size    bigint,
  mime_type    text,
  uploaded_by  text        not null default 'admin',
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── Step 3: Auto-stamp updated_at on every row change ───────────────────────
-- Reuses public.set_updated_at(), created in 003_phase_2_crm.sql.

drop trigger if exists documents_set_updated_at on public.documents;

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ─── Step 4: Indexes for per-entity lookups ──────────────────────────────────

create index if not exists documents_inquiry_id_idx
  on public.documents(inquiry_id);

create index if not exists documents_company_id_idx
  on public.documents(company_id);

create index if not exists documents_project_id_idx
  on public.documents(project_id);

create index if not exists documents_contract_id_idx
  on public.documents(contract_id);

-- ─── Step 5: Row-level security — service role access only ──────────────────
-- No public SELECT / INSERT policies are created. The application accesses
-- documents exclusively through the Supabase service-role key, which bypasses
-- RLS entirely. Enabling RLS here prevents any accidental public exposure via
-- the anon key.

alter table public.documents enable row level security;
