-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 010 — Role-Based Permissions
--
-- Applies to: a database that has already run 003_phase_2_crm.sql (requires
-- public.set_updated_at()).
--
-- Safe to run against a live database — all statements are idempotent /
-- IF NOT EXISTS guarded. Does not touch any existing table or row, and does
-- not touch the site's HTTP Basic Auth gate (proxy.ts) — that perimeter is
-- unchanged. This migration adds an internal identity/role layer used only
-- for in-app attribution and permission checks once inside the admin area.
--
-- Run order: paste the entire file into the Supabase SQL Editor and execute
-- once. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Step 1: Admin users table ───────────────────────────────────────────────
-- access_code_hash stores a salted hash (Node's built-in scrypt, no external
-- password-hashing dependency added) of a short personal access code — not a
-- full password system. The security boundary for the admin area is still the
-- existing HTTP Basic Auth gate; this identifies *who*, within that gate, so
-- role-based permission checks and audit attribution have something to key on.

create table if not exists public.admin_users (
  id                uuid        primary key default gen_random_uuid(),
  name              text        not null,
  email             text,
  role              text        not null default 'admin' check (role in ('admin', 'broker', 'viewer')),
  access_code_hash  text        not null,
  status            text        not null default 'active',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─── Step 2: Auto-stamp updated_at on every row change ───────────────────────
-- Reuses public.set_updated_at(), created in 003_phase_2_crm.sql.

drop trigger if exists admin_users_set_updated_at on public.admin_users;

create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

-- ─── Step 3: Index for filtering active users ────────────────────────────────

create index if not exists admin_users_status_idx
  on public.admin_users(status);

-- ─── Step 4: Row-level security — service role access only ──────────────────
-- No public SELECT / INSERT policies are created. The application accesses
-- admin_users exclusively through the Supabase service-role key, which
-- bypasses RLS entirely. Enabling RLS here prevents any accidental public
-- exposure via the anon key.

alter table public.admin_users enable row level security;
