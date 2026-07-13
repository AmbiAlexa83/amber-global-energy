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
