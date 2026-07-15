-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 012 — Deal Matching Foundation (Phase 5.1)
--
-- Applies to: a database that has already run 005_companies.sql,
-- 004_brokers.sql, and 010_role_based_permissions.sql (this migration adds
-- foreign keys to public.inquiries, public.companies, public.brokers, and
-- public.admin_users).
--
-- This is a decision-support feature only. This table stores deterministic,
-- explainable match recommendations for human review — it never triggers
-- automatic introductions, status changes, or outbound communication, and no
-- application code writes to public.inquiries as a result of a match.
--
-- Safe to run against a live database — all statements are idempotent /
-- IF NOT EXISTS guarded. Does not touch any existing table or row.
--
-- Run order: paste the entire file into the Supabase SQL Editor and execute
-- once. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.deal_matches (
  id                       uuid        primary key default gen_random_uuid(),

  -- The two inquiries being compared. Both required — a match is always a
  -- pairing. Deleting either inquiry removes the match (it no longer refers
  -- to anything reviewable).
  buyer_inquiry_id         uuid        not null references public.inquiries(id) on delete cascade,
  seller_inquiry_id        uuid        not null references public.inquiries(id) on delete cascade,

  -- Denormalized convenience links, resolved at match-creation time via the
  -- same name-matching pattern already used elsewhere (Company/Broker
  -- cross-referencing in Phase 3). Nullable — not every inquiry has a
  -- matching company/broker record yet.
  buyer_company_id         uuid        references public.companies(id) on delete set null,
  seller_company_id        uuid        references public.companies(id) on delete set null,
  assigned_broker_id       uuid        references public.brokers(id) on delete set null,

  -- Compatibility: do the trade terms line up (product, quantity, geography,
  -- incoterms, payment terms, timing). Opportunity: is this worth acting on
  -- (compatibility folded in, plus trust/readiness, document readiness, and
  -- risk penalty). Deliberately two separate numbers, not one blended score.
  compatibility_score      integer     not null,
  opportunity_score        integer     not null,
  confidence               text        not null
    check (confidence in ('Strong Match', 'Potential Match', 'Needs Information', 'High Risk', 'Not Compatible')),
  match_version            text        not null default 'v1',

  -- Per-component scores backing compatibility_score — kept individually so
  -- the explanation panel (and any future consumer) can show exactly which
  -- criteria drove the total, not just the sum.
  product_score            integer     not null,
  quantity_score           integer     not null,
  geography_score          integer     not null,
  incoterms_score          integer     not null,
  payment_terms_score      integer     not null,
  timing_score             integer     not null,
  document_readiness_score integer     not null,
  trust_score              integer     not null,
  risk_penalty             integer     not null default 0,

  -- Deterministic, rule-based explanation — never free-text similarity, never
  -- inferred. explanation is a structured jsonb summary; strengths/conflicts/
  -- missing_information are jsonb arrays of short structured entries.
  explanation              jsonb       not null default '{}'::jsonb,
  strengths                jsonb       not null default '[]'::jsonb,
  conflicts                jsonb       not null default '[]'::jsonb,
  missing_information      jsonb       not null default '[]'::jsonb,
  recommended_next_action  text,

  -- Human review workflow. match_status is the operational workflow state;
  -- broker_decision is the narrower approve/reject/needs_information verdict
  -- recorded at review time, kept separate so it stays a clean label if
  -- match_status later grows additional workflow states.
  match_status             text        not null default 'suggested'
    check (match_status in ('suggested', 'under_review', 'approved', 'rejected', 'needs_information', 'introduced', 'archived')),
  broker_decision          text
    check (broker_decision is null or broker_decision in ('approved', 'rejected', 'needs_information')),
  reviewed_by              uuid        references public.admin_users(id) on delete set null,
  reviewed_at              timestamptz,

  -- Reserved for a future AI layer. Deliberately nullable and unpopulated by
  -- this deterministic engine — separates rule-based scoring from any future
  -- AI-generated narrative, per the Phase 5.1 safeguards.
  ai_recommendation        text,
  ai_reasoning             text,

  -- Reserved for later linkage to a closed project/contract. Not populated by
  -- this vertical slice.
  final_outcome            text,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- Prevent duplicate match rows for the same buyer/seller pairing.
  unique (buyer_inquiry_id, seller_inquiry_id)
);

-- Auto-stamp updated_at on every row change. Reuses public.set_updated_at(),
-- created in 003_phase_2_crm.sql.
drop trigger if exists deal_matches_set_updated_at on public.deal_matches;
create trigger deal_matches_set_updated_at
  before update on public.deal_matches
  for each row execute function public.set_updated_at();

create index if not exists deal_matches_buyer_inquiry_id_idx
  on public.deal_matches(buyer_inquiry_id);

create index if not exists deal_matches_seller_inquiry_id_idx
  on public.deal_matches(seller_inquiry_id);

create index if not exists deal_matches_status_idx
  on public.deal_matches(match_status);

create index if not exists deal_matches_opportunity_score_idx
  on public.deal_matches(opportunity_score);

-- No public RLS policies — accessible via service role only. The application
-- accesses deal_matches exclusively through the Supabase service-role key,
-- which bypasses RLS entirely. Enabling RLS here prevents any accidental
-- public exposure via the anon key — deal_matches surfaces cross-inquiry
-- compatibility signals that must never be reachable outside admin auth.
alter table public.deal_matches enable row level security;
