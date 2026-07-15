create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  message text,
  source_page text not null default 'home',
  status text not null default 'new',
  created_at timestamptz not null default now(),
  inquiry_type text,
  company_name text,
  contact_name text,
  position text,
  phone text,
  whatsapp text,
  company_website text,
  country text,
  company_registration_number text,
  verification_status text,
  role_type text,
  product text,
  quantity text,
  unit text,
  delivery_frequency text,
  contract_length text,
  target_price text,
  currency text,
  payment_method text,
  incoterms text,
  loading_port text,
  destination_port text,
  origin_country text,
  destination_country text,
  shipping_method text,
  documents_available text,
  special_instructions text
);

alter table public.inquiries add column if not exists source_page text default 'home';
alter table public.inquiries add column if not exists status text default 'new';
alter table public.inquiries add column if not exists priority text default 'medium';
alter table public.inquiries add column if not exists assigned_broker text;
alter table public.inquiries add column if not exists broker_notes text;
alter table public.inquiries add column if not exists reviewed_at timestamptz;
alter table public.inquiries add column if not exists qualified_at timestamptz;
alter table public.inquiries add column if not exists matched_at timestamptz;
alter table public.inquiries add column if not exists closed_at timestamptz;
alter table public.inquiries add column if not exists updated_at timestamptz;
alter table public.inquiries add column if not exists inquiry_type text;
alter table public.inquiries add column if not exists company_name text;
alter table public.inquiries add column if not exists contact_name text;
alter table public.inquiries add column if not exists position text;
alter table public.inquiries add column if not exists phone text;
alter table public.inquiries add column if not exists whatsapp text;
alter table public.inquiries add column if not exists company_website text;
alter table public.inquiries add column if not exists country text;
alter table public.inquiries add column if not exists company_registration_number text;
alter table public.inquiries add column if not exists verification_status text;
alter table public.inquiries add column if not exists role_type text;
alter table public.inquiries add column if not exists product text;
alter table public.inquiries add column if not exists quantity text;
alter table public.inquiries add column if not exists unit text;
alter table public.inquiries add column if not exists delivery_frequency text;
alter table public.inquiries add column if not exists contract_length text;
alter table public.inquiries add column if not exists target_price text;
alter table public.inquiries add column if not exists currency text;
alter table public.inquiries add column if not exists payment_method text;
alter table public.inquiries add column if not exists incoterms text;
alter table public.inquiries add column if not exists loading_port text;
alter table public.inquiries add column if not exists destination_port text;
alter table public.inquiries add column if not exists origin_country text;
alter table public.inquiries add column if not exists destination_country text;
alter table public.inquiries add column if not exists shipping_method text;
alter table public.inquiries add column if not exists documents_available text;
alter table public.inquiries add column if not exists special_instructions text;

alter table public.inquiries enable row level security;

drop policy if exists "Allow inserts for inquiries" on public.inquiries;
create policy "Allow inserts for inquiries" on public.inquiries
for insert with check (true);

-- ─── Phase 2: CRM lifecycle fields ───────────────────────────────────────────

alter table public.inquiries add column if not exists last_contacted_at timestamptz;
alter table public.inquiries add column if not exists notes text;

-- Auto-update updated_at on every row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists inquiries_set_updated_at on public.inquiries;
create trigger inquiries_set_updated_at
  before update on public.inquiries
  for each row execute function public.set_updated_at();

-- ─── Inquiry history (audit log) ─────────────────────────────────────────────

create table if not exists public.inquiry_history (
  id           uuid        primary key default gen_random_uuid(),
  inquiry_id   uuid        not null references public.inquiries(id) on delete cascade,
  field_changed text       not null,
  old_value    text,
  new_value    text,
  changed_at   timestamptz not null default now(),
  changed_by   text        not null default 'admin'
);

create index if not exists inquiry_history_inquiry_id_idx
  on public.inquiry_history(inquiry_id);

-- No public RLS policies — accessible via service role only
alter table public.inquiry_history enable row level security;

-- ─── Phase 3: Broker roster ──────────────────────────────────────────────────

create table if not exists public.brokers (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  email      text,
  phone      text,
  region     text,
  specialty  text,
  status     text        not null default 'active',
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists brokers_set_updated_at on public.brokers;
create trigger brokers_set_updated_at
  before update on public.brokers
  for each row execute function public.set_updated_at();

create index if not exists brokers_status_idx
  on public.brokers(status);

-- No public RLS policies — accessible via service role only
alter table public.brokers enable row level security;

-- ─── Phase 3: Company directory ──────────────────────────────────────────────

create table if not exists public.companies (
  id                  uuid        primary key default gen_random_uuid(),
  name                text        not null,
  registration_number text,
  website             text,
  country             text,
  industry            text,
  verification_status text        not null default 'unverified',
  status              text        not null default 'active',
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

create index if not exists companies_status_idx
  on public.companies(status);

create index if not exists companies_name_lower_idx
  on public.companies(lower(name));

-- No public RLS policies — accessible via service role only
alter table public.companies enable row level security;

-- ─── Phase 3: Project pipeline ───────────────────────────────────────────────

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

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create index if not exists projects_stage_idx
  on public.projects(stage);

create index if not exists projects_company_id_idx
  on public.projects(company_id);

create index if not exists projects_broker_id_idx
  on public.projects(broker_id);

create index if not exists projects_inquiry_id_idx
  on public.projects(inquiry_id);

-- No public RLS policies — accessible via service role only
alter table public.projects enable row level security;

-- ─── Phase 3: Contract management ────────────────────────────────────────────

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

drop trigger if exists contracts_set_updated_at on public.contracts;
create trigger contracts_set_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

create index if not exists contracts_status_idx
  on public.contracts(status);

create index if not exists contracts_company_id_idx
  on public.contracts(company_id);

create index if not exists contracts_project_id_idx
  on public.contracts(project_id);

create index if not exists contracts_broker_id_idx
  on public.contracts(broker_id);

-- No public RLS policies — accessible via service role only
alter table public.contracts enable row level security;

-- ─── Phase 3: Document upload and storage ────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

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

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

create index if not exists documents_inquiry_id_idx
  on public.documents(inquiry_id);

create index if not exists documents_company_id_idx
  on public.documents(company_id);

create index if not exists documents_project_id_idx
  on public.documents(project_id);

create index if not exists documents_contract_id_idx
  on public.documents(contract_id);

-- No public RLS policies — accessible via service role only
alter table public.documents enable row level security;

-- ─── Phase 3: Email timeline ─────────────────────────────────────────────────

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

drop trigger if exists emails_set_updated_at on public.emails;
create trigger emails_set_updated_at
  before update on public.emails
  for each row execute function public.set_updated_at();

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

-- No public RLS policies — accessible via service role only
alter table public.emails enable row level security;

-- ─── Phase 3: Role-based permissions ─────────────────────────────────────────
-- Internal identity/role layer only — does not touch the site's HTTP Basic
-- Auth gate (proxy.ts), which remains the perimeter security boundary.

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

drop trigger if exists admin_users_set_updated_at on public.admin_users;
create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

create index if not exists admin_users_status_idx
  on public.admin_users(status);

-- No public RLS policies — accessible via service role only
alter table public.admin_users enable row level security;

-- ─── Phase 3: Calendar and follow-up reminders ───────────────────────────────

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

drop trigger if exists reminders_set_updated_at on public.reminders;
create trigger reminders_set_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

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

-- No public RLS policies — accessible via service role only
alter table public.reminders enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 012 — Deal Matching Foundation (Phase 5.1)
--
-- Decision-support feature only. Stores deterministic, explainable match
-- recommendations for human review — never triggers automatic introductions,
-- status changes, or outbound communication.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.deal_matches (
  id                       uuid        primary key default gen_random_uuid(),

  buyer_inquiry_id         uuid        not null references public.inquiries(id) on delete cascade,
  seller_inquiry_id        uuid        not null references public.inquiries(id) on delete cascade,

  buyer_company_id         uuid        references public.companies(id) on delete set null,
  seller_company_id        uuid        references public.companies(id) on delete set null,
  assigned_broker_id       uuid        references public.brokers(id) on delete set null,

  compatibility_score      integer     not null,
  opportunity_score        integer     not null,
  confidence               text        not null
    check (confidence in ('Strong Match', 'Potential Match', 'Needs Information', 'High Risk', 'Not Compatible')),
  match_version            text        not null default 'v1',

  product_score            integer     not null,
  quantity_score           integer     not null,
  geography_score          integer     not null,
  incoterms_score          integer     not null,
  payment_terms_score      integer     not null,
  timing_score             integer     not null,
  document_readiness_score integer     not null,
  trust_score              integer     not null,
  risk_penalty             integer     not null default 0,

  explanation              jsonb       not null default '{}'::jsonb,
  strengths                jsonb       not null default '[]'::jsonb,
  conflicts                jsonb       not null default '[]'::jsonb,
  missing_information      jsonb       not null default '[]'::jsonb,
  recommended_next_action  text,

  match_status             text        not null default 'suggested'
    check (match_status in ('suggested', 'under_review', 'approved', 'rejected', 'needs_information', 'introduced', 'archived')),
  broker_decision          text
    check (broker_decision is null or broker_decision in ('approved', 'rejected', 'needs_information')),
  reviewed_by              uuid        references public.admin_users(id) on delete set null,
  reviewed_at              timestamptz,

  ai_recommendation        text,
  ai_reasoning             text,

  final_outcome            text,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  unique (buyer_inquiry_id, seller_inquiry_id)
);

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

-- No public RLS policies — accessible via service role only
alter table public.deal_matches enable row level security;
