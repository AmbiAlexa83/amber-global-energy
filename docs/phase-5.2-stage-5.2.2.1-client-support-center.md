# Phase 5.2.2 — Stage 5.2.2.1: Executive Client Support Center

## Purpose

Gives clients and brokers a structured way to raise questions, technical
issues, brokerage inquiries, suggestions, and feedback against a company —
tracked as a first-class CRM entity, visible on the company record, queued in
a dedicated admin panel, and reflected in the shared Activity Timeline.

## Design interpretation

The brief describes `company_id` as required and lists an "Admin Support
Panel," so this was built as an **entity-linked CRM feature** (the same
architecture as documents, emails, and reminders), not a public/anonymous
web form. The "Need Assistance?" card lives on the existing company detail
page — the same place `CompanyContacts`, `DocumentUploader`, `EmailTimeline`,
and `ReminderList` already live — where `company_id` (and optionally a
specific `company_contacts` row) is already in scope. No public routes, no
anonymous submission path, and no changes to the public marketing site were
introduced.

## Existing functionality reused

- `public.companies`, `public.company_contacts` (Stage 5.2.1), and
  `public.admin_users` — support requests reference all three by FK.
- `public.set_updated_at()` — reused for the `updated_at` trigger.
- `lib/auth-helpers.ts` `checkPermission()` — added `"support_requests"` as a
  new `ManagedResource` value, left **out** of `BROKER_RESTRICTED_RESOURCES`
  so both brokers and admins can submit/manage requests (matching
  `reminders`/`emails`/`documents`); only `viewer` is blocked.
- `lib/supabase-server.ts` server-helper architecture — typed record,
  `_SELECT` constant with embedded joins (`companies(name)`,
  `company_contacts(first_name,last_name)`, `admin_users(name)` — the same
  embed pattern already used by `ProjectRecord`/`ContractRecord`).
- UI pattern from `reminder-list.tsx` / `email-timeline.tsx` (fetch-on-mount
  card, inline form, loading/empty/error/success states) for the "Need
  Assistance?" card, and from `company-roster.tsx` (rounded-row `<table>`)
  for the Admin Support Panel.
- `lib/activity-helpers.ts` `buildActivityFeed()` — extended with a
  `supportRequests` array, emitting exactly the event described in the brief.
- The existing top nav bar on `/admin` (`Link` chips: Calendar, Activity,
  Team, Search, Analytics, Matches, Contracts, Projects, Companies, Brokers)
  — added one more "Support" chip in the same style.
- The `access_code_hash`-scrubbing convention from `app/admin/users/page.tsx`
  — applied identically before passing `admin_users` rows to the new client
  table component (see Known Limitations / security note below).

No existing page's layout, spacing, typography, colors, or component
structure was altered — only new cards/rows/nav chips were added in the
established visual language.

## Database schema

New table: `public.support_requests` (migration
`supabase/migrations/014_support_requests.sql`, also appended to
`supabase/schema.sql` per the established consolidated-snapshot convention).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| company_id | uuid, not null | FK → `companies(id)` on delete cascade |
| contact_id | uuid | FK → `company_contacts(id)` on delete set null |
| category | text, not null | checked against the 6 categories below |
| priority | text, not null, default `normal` | `normal` \| `high` \| `urgent` |
| subject | text, not null | checked non-blank |
| message | text, not null | checked non-blank |
| status | text, not null, default `new` | 6 statuses below |
| assigned_to | uuid | FK → `admin_users(id)` on delete set null |
| created_at / updated_at | timestamptz | `updated_at` auto-stamped |
| resolved_at | timestamptz | nullable, see logic below |

Categories: `technical_problem`, `brokerage_inquiry`, `account_question`,
`suggestion`, `general_feedback`, `report_bug` (displayed via
`lib/support-request-helpers.ts` as "Technical Problem", "Brokerage
Inquiry", etc. — slug-in-DB / label-in-UI, the same convention as
`contract-helpers.ts` and `reminder-helpers.ts`).

Priorities: `normal`, `high`, `urgent`. Statuses: `new`, `open`,
`in_progress`, `waiting_for_client`, `resolved`, `closed`.

Indexes: `company_id`, `contact_id`, `status`, `priority`, `assigned_to`,
`created_at`.

`resolved_at` logic (in `updateSupportRequestServer`): stamped with `now()`
the first time a request's status becomes `resolved` or `closed`; cleared
back to `null` if the request is reopened into any other status.

## Relationship design

`support_requests.company_id` → `companies.id` (cascade). `contact_id` →
`company_contacts.id` (set null — a deactivated/removed contact doesn't
destroy the request history). `assigned_to` → `admin_users.id` (set null).
Server-side validation (`createSupportRequestServer`) additionally confirms
a supplied `contact_id` actually belongs to the given `company_id` before
insert, since that cross-check can't be expressed as a simple SQL
constraint.

## Permission behavior

`POST /api/admin/support-requests` and `PATCH
/api/admin/support-requests/[id]` call `checkPermission("support_requests")`.
Admins and brokers can submit and manage requests; viewers cannot (403).
`GET` is unauthenticated at the route level, matching every other list route
in this codebase (`/api/admin/companies`, `/api/admin/reminders`, etc.) —
admin-area access is enforced upstream by the site's HTTP Basic Auth gate.

## RLS behavior

`support_requests` has `enable row level security` with **no** anonymous,
public, or authenticated-client policies — identical to every other table.
All access goes through `supabaseServer` (service-role key, bypasses RLS).

## Files created

- `supabase/migrations/014_support_requests.sql`
- `lib/support-request-helpers.ts` — category/priority/status options,
  badge styles, label formatters
- `app/api/admin/support-requests/route.ts` — `GET` (all, or filtered by
  `?company_id=`) / `POST` (create)
- `app/api/admin/support-requests/[id]/route.ts` — `PATCH` (status, priority,
  category, assigned broker)
- `app/admin/_components/support-request-card.tsx` — the "Need Assistance?"
  card (info blurb + form + this company's request history)
- `app/admin/support/page.tsx` — Admin Support Panel page
- `app/admin/support/support-request-table.tsx` — the panel's table
  (inline status change, inline broker assignment)
- `docs/phase-5.2-stage-5.2.2.1-client-support-center.md` — this document

## Files modified

- `lib/supabase-server.ts` — `SupportRequestRecord` type +
  `getSupportRequestsServer`, `getSupportRequestsForCompanyServer`,
  `getSupportRequestServer`, `createSupportRequestServer`,
  `updateSupportRequestServer`
- `lib/auth-helpers.ts` — added `"support_requests"` to `ManagedResource`
- `lib/activity-helpers.ts` — `buildActivityFeed()` accepts a
  `supportRequests` array and emits "Support request submitted" events
- `app/admin/activity/page.tsx` — fetches all support requests and passes
  them into `buildActivityFeed()`
- `app/admin/companies/[id]/page.tsx` — mounted `<SupportRequestCard>`
  between `CompanyContacts` and `DocumentUploader`
- `app/admin/page.tsx` — added a "Support" nav chip next to "Brokers"
- `supabase/schema.sql` — appended (not altered) the `support_requests`
  section

## Manual migration instructions

1. Open the Supabase SQL Editor for the project.
2. Confirm migration 013 (`company_contacts`) has already been applied —
   014 references it.
3. Paste the full contents of `supabase/migrations/014_support_requests.sql`.
4. Execute once. All statements are `IF NOT EXISTS` / idempotent.

**This migration has not been run as part of this task.**

> **✅ PRODUCTION STATUS (verified 2026-08-30):** migration 014 **has since been
> applied** to the production Supabase project `biudpxkpbxlbzbphyhmu`. Verified
> by PostgREST schema introspection with a negative control — `support_requests`
> returns HTTP 200 and the `priority` column resolves, while a
> known-nonexistent table returns HTTP 404 / `PGRST205`.
>
> Confirmed end-to-end by the Phase 5.2 / 5.3 Production Release Smoke Test
> (9/9 PASS): a support request was created in Production (`ZZ-TEST-20260829`,
> `Test 2`), transitioned `new` → `closed`, and had `resolved_at` correctly
> stamped — exercising the full status lifecycle this stage introduced.
>
> The statement above is retained because it was accurate when written. This
> note supersedes it for current state.

## Manual testing checklist

- [ ] Run migrations 013 and 014 in a staging Supabase project.
- [ ] Open an existing company detail page — confirm all prior sections
      (`CompanyForm`, `CompanyContacts`, `DocumentUploader`,
      `EmailTimeline`, `ReminderList`, related contracts/projects/inquiries)
      are still present and unchanged.
- [ ] Confirm the new "Need Assistance?" card renders below Company Contacts
      with the exact heading, description, support email, and response-time
      text from the brief.
- [ ] Submit a request with only Subject + Message filled — confirm it
      succeeds with category defaulting to "Technical Problem" and priority
      to "Normal".
- [ ] Submit a request selecting a specific company contact, a different
      category, and "Urgent" priority — confirm the success message appears
      and the request shows up in the list below the form.
- [ ] Submit with an empty subject or message — confirm the inline
      validation error appears and no request is created.
- [ ] Visit `/admin/support` — confirm the new request appears at the top
      (newest first) with the correct Company/Category/Priority/Status/
      Created/Assigned Broker columns.
- [ ] Change a request's status via the panel's dropdown — confirm the badge
      updates and, on the company page, the same request's badge reflects
      the change after a refresh.
- [ ] Move a request to "Resolved", then back to "Open" — confirm
      `resolved_at` is set then cleared (verify via Supabase table editor).
- [ ] Assign a broker to a request via the panel — confirm "Assigned to
      {name}" appears in the company-page list.
- [ ] Attempt to submit/update as a `viewer` role — confirm 403s.
- [ ] Visit `/admin/activity` — confirm "Support request submitted" events
      appear with "Category: X • Priority: Y" detail and link to the
      correct company.
- [ ] Confirm `/admin` dashboard's nav bar shows the new "Support" chip in
      the same visual style as the others, and it navigates correctly.
- [ ] Run `npm run lint` and `npm run build` — confirm no failures beyond
      the one documented pre-existing pattern below.

## Confirmation that no existing functionality was changed

- No existing file's layout, styling, or component structure was altered —
  every touched file only had new imports, new props, and new JSX/logic
  additively inserted (verified via `git diff --stat`: only insertions
  except two removed lines from moving an argument list in
  `app/admin/activity/page.tsx` to accommodate the additional destructured
  values, and one in `lib/auth-helpers.ts` for the new union member).
- `npm run build` produced the full existing route list plus the new routes
  (`/admin/support`, `/api/admin/support-requests`,
  `/api/admin/support-requests/[id]`) with no errors.
- `npm run lint` true baseline (pre-existing, via `git stash -u` prior to
  this work) was 15 problems; after Stage 5.2.1 it was 16; after this stage
  it is 18 (11 errors, 7 warnings) — exactly 2 more than Stage 5.2.1's
  state, both matching pre-existing, already-tolerated lint patterns already
  present elsewhere in the codebase (see below), not new categories of
  problem.
- No company, contact, contract, project, inquiry, or deal-match record or
  route was modified in behavior.

## Known limitations

- **Lint**: this stage adds exactly two new lint findings, both instances of
  patterns the codebase already ships with elsewhere:
  1. `react-hooks/set-state-in-effect` in `support-request-card.tsx` (the
     initial `loadData()` call inside `useEffect`) — identical to the
     existing pattern in `reminder-list.tsx`, `email-timeline.tsx`,
     `document-uploader.tsx`, and `identity-bar.tsx` (and to
     `company-contacts.tsx` added in Stage 5.2.1).
  2. `@typescript-eslint/no-unused-vars` on the `_unused` destructure in
     `app/admin/support/page.tsx` — identical to the existing pattern in
     `app/admin/users/page.tsx`, `app/api/admin/users/route.ts`, and
     `app/api/admin/session/route.ts`, all of which intentionally destructure
     `access_code_hash` off `AdminUserRecord` to discard it. This is a
     **security-relevant** pattern, not an oversight — `AdminUserRecord`
     includes a scrypt hash of the admin's access code, and the existing
     convention (which this stage now follows in a fourth location) strips
     it before the array is ever passed to a client component.
- **Activity feed granularity**: only the submission event described in the
  brief is emitted ("Support request submitted / Category / Priority").
  Status changes, reassignment, and resolution are not separately logged to
  the activity feed — the brief only asked for a submission event, and
  adding more would mean either inventing a second activity-history system
  or expanding scope beyond what was requested.
- **No delete/archive route**: the brief describes a status lifecycle
  ending in `resolved`/`closed`, not deletion, so no `DELETE` route was
  built — consistent with how the rest of the CRM treats terminal states
  (contracts, reminders' non-pending states) as data to keep, not remove.
- **No email notifications**: `support@amberglobalenergy.in` is displayed as
  contact information only; no outbound email integration exists in this
  codebase (the existing `emails` table is a manually-logged timeline, not a
  send capability), so no notification is sent when a request is submitted
  or reassigned. This mirrors the existing email-timeline's manual-logging
  model rather than introducing new send infrastructure.
