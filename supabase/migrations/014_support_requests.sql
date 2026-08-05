-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 014 — Executive Client Support Center (Phase 5.2, Stage 5.2.2.1)
--
-- Applies to: a database that has already run 003_phase_2_crm.sql (requires
-- public.set_updated_at()), 005_companies.sql, 010_role_based_permissions.sql,
-- and 013_company_contacts.sql (this migration adds foreign keys to
-- public.companies, public.company_contacts, and public.admin_users).
--
-- Lets clients and brokers raise support requests (technical problems,
-- brokerage inquiries, account questions, suggestions, feedback, bug
-- reports) against a company, optionally attributed to a specific company
-- contact, and tracked through to resolution.
--
-- Safe to run against a live database — all statements are idempotent /
-- IF NOT EXISTS guarded. Does not touch any existing table or row.
--
-- Run order: paste the entire file into the Supabase SQL Editor and execute
-- once. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Step 1: Support requests table ──────────────────────────────────────────

create table if not exists public.support_requests (
  id           uuid        primary key default gen_random_uuid(),
  company_id   uuid        not null references public.companies(id) on delete cascade,
  contact_id   uuid        references public.company_contacts(id) on delete set null,
  category     text        not null
    check (category in ('technical_problem', 'brokerage_inquiry', 'account_question', 'suggestion', 'general_feedback', 'report_bug')),
  priority     text        not null default 'normal'
    check (priority in ('normal', 'high', 'urgent')),
  subject      text        not null,
  message      text        not null,
  status       text        not null default 'new'
    check (status in ('new', 'open', 'in_progress', 'waiting_for_client', 'resolved', 'closed')),
  assigned_to  uuid        references public.admin_users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  resolved_at  timestamptz,

  constraint support_requests_subject_not_blank check (btrim(subject) <> ''),
  constraint support_requests_message_not_blank check (btrim(message) <> '')
);

-- ─── Step 2: Auto-stamp updated_at on every row change ───────────────────────
-- Reuses public.set_updated_at(), created in 003_phase_2_crm.sql.

drop trigger if exists support_requests_set_updated_at on public.support_requests;

create trigger support_requests_set_updated_at
  before update on public.support_requests
  for each row execute function public.set_updated_at();

-- ─── Step 3: Indexes for filtering, joins, and chronological ordering ────────

create index if not exists support_requests_company_id_idx
  on public.support_requests(company_id);

create index if not exists support_requests_contact_id_idx
  on public.support_requests(contact_id);

create index if not exists support_requests_status_idx
  on public.support_requests(status);

create index if not exists support_requests_priority_idx
  on public.support_requests(priority);

create index if not exists support_requests_assigned_to_idx
  on public.support_requests(assigned_to);

create index if not exists support_requests_created_at_idx
  on public.support_requests(created_at);

-- ─── Step 4: Row-level security — service role access only ──────────────────
-- No public SELECT / INSERT policies are created. The application accesses
-- support_requests exclusively through the Supabase service-role key, which
-- bypasses RLS entirely. Enabling RLS here prevents any accidental public
-- exposure via the anon key.

alter table public.support_requests enable row level security;
