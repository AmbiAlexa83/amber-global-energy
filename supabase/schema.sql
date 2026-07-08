create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  source_page text not null default 'home',
  created_at timestamptz not null default now()
);

alter table public.inquiries enable row level security;

create policy "Allow inserts for inquiries" on public.inquiries
for insert with check (true);
