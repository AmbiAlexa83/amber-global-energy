# Phase 5.2 — Stage 5.2.1: Persistent Company & Contact CRM Layer

## Purpose

Every company in the CRM can now retain multiple persistent business contacts
(CEO, Procurement Director, Fuel Trader, Finance Director, Operations
Manager, Shipping Coordinator, Legal Representative, Authorized Signatory,
Intermediary, Mandate Representative, etc.) that carry across every inquiry,
project, contract, document, email, reminder, and deal match linked to that
company — instead of re-entering contact details each time.

## Existing company functionality reused

- `public.companies` and `public.set_updated_at()` — the contacts table
  references companies by `company_id` and reuses the same updated-at
  trigger function.
- `lib/supabase-server.ts` server-helper architecture — typed record,
  `_SELECT` constant, CRUD functions, service-role-only access.
- `lib/auth-helpers.ts` `checkPermission("companies")` — the existing
  `companies` permission resource gates all contact mutations; no new
  `ManagedResource` value was introduced.
- `app/admin/_components/reminder-list.tsx` / `email-timeline.tsx` visual and
  interaction pattern (fetch-on-mount card, inline form, per-item action
  buttons, loading/empty/error/save states) — `company-contacts.tsx` follows
  this exactly rather than introducing a new UI system.
- `lib/activity-helpers.ts` `buildActivityFeed()` — extended with the same
  derived created/updated event pattern already used for companies, projects,
  and contracts.
- The company detail page layout, card styling, gold accent, and typography
  are unchanged; the contacts card was inserted between `CompanyForm` and
  `DocumentUploader`.

## Database schema

New table: `public.company_contacts` (migration
`supabase/migrations/013_company_contacts.sql`, also appended to
`supabase/schema.sql` as a consolidated-snapshot section, matching the
convention already used for migrations 003–012).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| company_id | uuid, not null | FK → `companies(id)` on delete cascade |
| first_name | text, not null | checked non-blank |
| last_name | text | |
| job_title | text | |
| department | text | |
| email | text | normalized to lowercase/trimmed on write |
| phone | text | |
| mobile | text | |
| country | text | |
| preferred_contact_method | text | `email` \| `phone` \| `mobile` \| null |
| is_primary | boolean, not null, default false | |
| status | text, not null, default `active` | `active` \| `inactive` |
| notes | text | |
| created_at / updated_at | timestamptz | `updated_at` auto-stamped via `set_updated_at()` |

Indexes: `company_id`, `status`, `lower(email)` (partial, where not null),
`(company_id, is_primary)`, `(company_id, status)`.

**One active primary contact per company** is enforced at the database level
with a partial unique index:

```sql
create unique index company_contacts_one_active_primary_idx
  on public.company_contacts(company_id)
  where is_primary = true and status = 'active';
```

Because the index only applies to `is_primary = true and status = 'active'`,
a deactivated former primary never blocks a new designation.

## Relationship design

`company_contacts.company_id` → `companies.id`, `on delete cascade`. A
company's contacts are removed if the company itself is ever deleted (no
company deletion path currently exists in the admin UI, so this is a safety
net, not an active workflow).

## Permission behavior

All mutating routes (`POST`, `PATCH`, `DELETE`) call
`checkPermission("companies")` — the same resource key that already gates
company edits. Viewers cannot mutate contacts; brokers and admins can, exactly
matching the existing company permission boundary. `GET` is unauthenticated
at the route level, matching the existing `GET /api/admin/companies` pattern
(admin-area access is enforced upstream by the site's HTTP Basic Auth gate).

## RLS behavior

`company_contacts` has `enable row level security` with **no** anonymous,
public, or authenticated-client policies — identical to every other table in
this schema. All access goes through `supabaseServer`, which uses the
service-role key and bypasses RLS entirely. This is a defense-in-depth
measure against accidental exposure via the anon key, not the primary access
control (which is `checkPermission` + the Basic Auth gate).

## Created files

- `supabase/migrations/013_company_contacts.sql`
- `app/api/admin/companies/[id]/contacts/route.ts` — `GET` (list, ordered
  primary → active → alphabetical), `POST` (create)
- `app/api/admin/company-contacts/[id]/route.ts` — `PATCH` (edit / make
  primary), `DELETE` (soft-deactivate)
- `app/admin/_components/company-contacts.tsx` — the Company Contacts card
- `docs/phase-5.2-stage-5.2.1-company-contacts.md` — this document

## Modified files

- `lib/supabase-server.ts` — added `CompanyContactRecord` type and
  `getCompanyContactsServer`, `getAllCompanyContactsServer`,
  `getCompanyContactServer`, `createCompanyContactServer`,
  `updateCompanyContactServer`, `deactivateCompanyContactServer`
- `app/admin/companies/[id]/page.tsx` — mounted `<CompanyContacts>` below
  `CompanyForm`
- `lib/activity-helpers.ts` — `buildActivityFeed()` accepts a
  `companyContacts` array and emits "Company contact added" / "Company
  contact updated" events
- `app/admin/activity/page.tsx` — fetches all company contacts and passes
  them into `buildActivityFeed()`
- `supabase/schema.sql` — appended the `company_contacts` section (additive
  only; no existing content changed)

## Manual migration instructions

1. Open the Supabase SQL Editor for the project.
2. Paste the full contents of `supabase/migrations/013_company_contacts.sql`.
3. Execute once. All statements are `IF NOT EXISTS` / idempotent, so it is
   safe to run again if needed.
4. No data backfill is required — the table starts empty; existing companies
   are untouched.

**This migration has not been run as part of this task.** No `supabase db
push` or SQL execution occurred.

> **✅ PRODUCTION STATUS (verified 2026-08-30):** migration 013 **has since been
> applied** to the production Supabase project `biudpxkpbxlbzbphyhmu`. Verified
> by PostgREST schema introspection with a negative control — `company_contacts`
> returns HTTP 200 and the `is_primary` column resolves, while a
> known-nonexistent table returns HTTP 404 / `PGRST205`. Further confirmed
> end-to-end: the Phase 5.2 / 5.3 Production Release Smoke Test read and wrote
> live `company_contacts` data.
>
> The statement above is retained because it was accurate when written. This
> note supersedes it for current state.

## Manual testing checklist

- [ ] Run migration 013 in a non-production/staging Supabase project first.
- [ ] Open an existing company detail page — confirm the page still loads,
      `CompanyForm` still saves, and layout is visually unchanged.
- [ ] Confirm the new "Company Contacts" card renders with an empty state.
- [ ] Add a contact with only a first name — confirm it saves.
- [ ] Add a second contact with full details (email, phone, mobile, country,
      preferred contact method, notes) — confirm all fields display.
- [ ] Mark a contact primary — confirm the "Primary" badge appears and any
      previously-primary contact loses its badge.
- [ ] Edit a contact's job title/department — confirm the change persists
      after a page refresh.
- [ ] Deactivate the primary contact — confirm its badge and primary status
      clear, and "Make Primary" is no longer needed to add a new primary.
- [ ] Deactivate a non-primary contact — confirm it's no longer editable via
      "Deactivate" (button hidden once inactive) but remains visible with an
      "inactive" badge.
- [ ] Attempt the same actions logged in as a `viewer` role — confirm 403s.
- [ ] Visit `/admin/activity` — confirm "Company contact added" / "Company
      contact updated" events appear and link back to the company.
- [ ] Run `npm run lint` and `npm run build` — confirm no new failures beyond
      the one documented below.

## Rollback plan

- **Application code**: revert the modified/created files listed above via
  `git checkout` on this branch, or drop the branch entirely — none of this
  work has been committed, pushed, or deployed.
- **Database**: if migration 013 was run in a test/staging environment and
  needs to be undone:
  ```sql
  drop table if exists public.company_contacts;
  ```
  This is safe because `company_contacts` has no inbound foreign keys from
  any other table (no other table references it yet — see "Recommended next
  step" below) and cascades only outward to `companies`, which is untouched
  by the drop.

## Known limitations

- **Activity feed is not field-level.** Like companies, projects, and
  contracts (and unlike inquiries, which has `inquiry_history`), contact
  events are derived generically from `created_at`/`updated_at`. "Marked
  primary" and "deactivated" are not distinguishable from any other edit in
  the activity feed — both surface as a generic "Company contact updated"
  event. Building field-level attribution would require a new
  `company_contact_history` table, which is out of scope for this stage and
  was not added, per the instruction not to invent a second/conflicting
  activity-history system.
- **Lint**: this branch's true baseline (via `git stash -u`) is 15 problems
  (9 errors, 6 warnings) from `npm run lint`, all pre-existing and unrelated
  to this work. `company-contacts.tsx` adds exactly one additional error —
  `react-hooks/set-state-in-effect` on the initial `loadContacts()` call
  inside `useEffect` — which is the identical pattern already present in four
  other existing components (`reminder-list.tsx`, `email-timeline.tsx`,
  `document-uploader.tsx`, `identity-bar.tsx`). This was a deliberate choice
  to match established project convention rather than introduce a different
  data-fetching pattern for one component.
- **No inquiry-to-contact linking yet** — see below.

## Recommended next step: inquiry-to-company / inquiry-to-contact linking

`public.inquiries` was **not** modified in this stage. The contact table and
helpers were designed so a future migration can add this linkage additively:

```sql
-- Recommended future migration (not part of this stage):
alter table public.inquiries
  add column if not exists company_id uuid references public.companies(id) on delete set null;

alter table public.inquiries
  add column if not exists company_contact_id uuid references public.company_contacts(id) on delete set null;

create index if not exists inquiries_company_id_idx on public.inquiries(company_id);
create index if not exists inquiries_company_contact_id_idx on public.inquiries(company_contact_id);
```

This would let an inquiry point directly at both its company and the specific
contact who submitted or owns it, without altering any existing inquiry
columns or data. `getCompanyContactsServer(companyId)` already returns
contacts ordered primary-first, so an inquiry-side "assign contact" dropdown
could be built directly on top of the existing helper.
