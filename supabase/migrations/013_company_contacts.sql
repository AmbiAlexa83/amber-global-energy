-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 013 — Persistent Company Contacts (Phase 5.2, Stage 5.2.1)
--
-- Applies to: a database that has already run 003_phase_2_crm.sql (requires
-- public.set_updated_at()) and 005_companies.sql (this migration adds a
-- foreign key to public.companies).
--
-- Adds a persistent, multi-contact roster per company — a company can retain
-- named business contacts (CEO, Procurement Director, Fuel Trader, etc.)
-- across every inquiry, project, contract, document, and deal match it is
-- ever linked to, rather than re-entering contact details each time.
--
-- Safe to run against a live database — all statements are idempotent /
-- IF NOT EXISTS guarded. Does not touch public.companies or any other
-- existing table or row.
--
-- Run order: paste the entire file into the Supabase SQL Editor and execute
-- once. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Step 1: Company contacts table ──────────────────────────────────────────

create table if not exists public.company_contacts (
  id                        uuid        primary key default gen_random_uuid(),
  company_id                uuid        not null references public.companies(id) on delete cascade,
  first_name                text        not null,
  last_name                 text,
  job_title                 text,
  department                text,
  email                     text,
  phone                     text,
  mobile                    text,
  country                   text,
  preferred_contact_method  text,
  is_primary                boolean     not null default false,
  status                    text        not null default 'active',
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint company_contacts_first_name_not_blank check (btrim(first_name) <> ''),
  constraint company_contacts_status_check check (status in ('active', 'inactive')),
  constraint company_contacts_preferred_contact_method_check
    check (preferred_contact_method is null or preferred_contact_method in ('email', 'phone', 'mobile'))
);

-- ─── Step 2: Auto-stamp updated_at on every row change ───────────────────────
-- Reuses public.set_updated_at(), created in 003_phase_2_crm.sql.

drop trigger if exists company_contacts_set_updated_at on public.company_contacts;

create trigger company_contacts_set_updated_at
  before update on public.company_contacts
  for each row execute function public.set_updated_at();

-- ─── Step 3: Indexes for filtering and lookups ───────────────────────────────

create index if not exists company_contacts_company_id_idx
  on public.company_contacts(company_id);

create index if not exists company_contacts_status_idx
  on public.company_contacts(status);

create index if not exists company_contacts_email_lower_idx
  on public.company_contacts(lower(email))
  where email is not null;

create index if not exists company_contacts_company_id_is_primary_idx
  on public.company_contacts(company_id, is_primary);

create index if not exists company_contacts_company_id_status_idx
  on public.company_contacts(company_id, status);

-- ─── Step 4: One active primary contact per company ──────────────────────────
-- Partial unique index — only rows where is_primary is true and status is
-- active participate in the uniqueness check, so a deactivated former primary
-- contact never blocks a new one from being designated.

create unique index if not exists company_contacts_one_active_primary_idx
  on public.company_contacts(company_id)
  where is_primary = true and status = 'active';

-- ─── Step 5: Row-level security — service role access only ──────────────────
-- No public SELECT / INSERT policies are created. The application accesses
-- company_contacts exclusively through the Supabase service-role key, which
-- bypasses RLS entirely. Enabling RLS here prevents any accidental public
-- exposure via the anon key.

alter table public.company_contacts enable row level security;
