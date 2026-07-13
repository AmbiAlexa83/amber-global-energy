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
