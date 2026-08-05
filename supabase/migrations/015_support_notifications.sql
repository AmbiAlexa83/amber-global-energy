-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 015 — Intelligent Notifications & Email Automation (Phase 5.2, Stage 5.2.3)
--
-- Applies to: a database that has already run 003_phase_2_crm.sql (requires
-- public.set_updated_at()), 005_companies.sql, 010_role_based_permissions.sql,
-- 013_company_contacts.sql, and 014_support_requests.sql (this migration adds
-- foreign keys to public.support_requests, public.companies,
-- public.company_contacts).
--
-- Records every attempted transactional-email notification tied to a support
-- request (acknowledgment, internal alert, status-change emails) — an audit
-- trail of what was sent, to whom, and whether it succeeded — and provides
-- the unique idempotency key that prevents duplicate sends for the same
-- support-request event.
--
-- This is a delivery-attempt log, not a message queue: rows are written
-- synchronously by the application immediately before/after each provider
-- call, never processed by a background worker.
--
-- Safe to run against a live database — all statements are idempotent /
-- IF NOT EXISTS guarded. Does not touch any existing table or row.
--
-- Run order: paste the entire file into the Supabase SQL Editor and execute
-- once. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Step 1: Support notifications table ─────────────────────────────────────

create table if not exists public.support_notifications (
  id                   uuid        primary key default gen_random_uuid(),
  support_request_id   uuid        not null references public.support_requests(id) on delete cascade,
  company_id           uuid        not null references public.companies(id) on delete cascade,
  contact_id           uuid        references public.company_contacts(id) on delete set null,
  notification_type    text        not null
    check (notification_type in ('support_acknowledgment', 'support_internal_alert', 'support_waiting_for_client', 'support_resolved', 'support_closed')),
  recipient_email      text        not null,
  recipient_name       text,
  subject              text        not null,
  provider              text,
  provider_message_id  text,
  delivery_status      text        not null default 'pending'
    check (delivery_status in ('pending', 'sent', 'failed', 'skipped')),
  error_message        text,
  metadata             jsonb       not null default '{}'::jsonb,
  idempotency_key      text        not null,
  attempted_at         timestamptz,
  sent_at              timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint support_notifications_recipient_email_not_blank check (btrim(recipient_email) <> ''),
  constraint support_notifications_subject_not_blank check (btrim(subject) <> '')
);

-- ─── Step 2: Auto-stamp updated_at on every row change ───────────────────────
-- Reuses public.set_updated_at(), created in 003_phase_2_crm.sql.

drop trigger if exists support_notifications_set_updated_at on public.support_notifications;

create trigger support_notifications_set_updated_at
  before update on public.support_notifications
  for each row execute function public.set_updated_at();

-- ─── Step 3: Indexes for filtering, joins, and chronological ordering ────────

create index if not exists support_notifications_support_request_id_idx
  on public.support_notifications(support_request_id);

create index if not exists support_notifications_company_id_idx
  on public.support_notifications(company_id);

create index if not exists support_notifications_delivery_status_idx
  on public.support_notifications(delivery_status);

create index if not exists support_notifications_notification_type_idx
  on public.support_notifications(notification_type);

create index if not exists support_notifications_created_at_idx
  on public.support_notifications(created_at);

-- ─── Step 4: Idempotency — one row per (support request, event) ─────────────
-- idempotency_key is deterministic (support-request-id + notification-type,
-- optionally + a status/event version — see lib/support-notification-helpers.ts).
-- The unique index is what actually prevents duplicate sends: the app looks
-- up an existing row by this key before calling the provider, and a retry
-- reuses the same row instead of inserting a new one.

create unique index if not exists support_notifications_idempotency_key_idx
  on public.support_notifications(idempotency_key);

-- ─── Step 5: Row-level security — service role access only ──────────────────
-- No public SELECT / INSERT policies are created. The application accesses
-- support_notifications exclusively through the Supabase service-role key,
-- which bypasses RLS entirely. Enabling RLS here prevents any accidental
-- public exposure via the anon key — this table can contain client email
-- addresses and must never be reachable outside admin auth.

alter table public.support_notifications enable row level security;
