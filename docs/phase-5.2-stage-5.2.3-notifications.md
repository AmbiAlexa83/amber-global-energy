# Phase 5.2 — Stage 5.2.3: Intelligent Notifications & Email Automation

## Architecture summary

A server-only transactional-email layer sits on top of the existing Client
Support Center (Stage 5.2.2.1). It never changes support-request workflow
state itself — it only reads a support request, decides (deterministically,
not with AI) whether an email is warranted, and records the attempt:

```
POST /api/admin/support-requests          PATCH /api/admin/support-requests/[id]
        │ (request created)                       │ (status actually changed)
        ▼                                          ▼
dispatchNewSupportRequestNotifications      dispatchSupportStatusNotification
        │                                          │
        ├─ acknowledgment → client contact         └─ waiting_for_client /
        └─ internal alert → assigned broker /         resolved / closed
           SUPPORT_NOTIFICATION_EMAIL                 → client contact
                        │
                        ▼
        getOrCreatePendingSupportNotificationServer   (idempotency_key lookup/insert)
                        │
                        ▼
              sendTransactionalEmail (Resend)  ── never throws, returns a result
                        │
                        ▼
        updateSupportNotificationDeliveryServer (sent / failed / skipped)
                        │
                        ▼ (only on 'sent')
              createEmailServer (existing Email Timeline, linked via company_id)
```

Responsibilities are split across three files, as requested:
- **`lib/support-request-helpers.ts`** (existing, extended) — label/style
  formatters, now including notification delivery states.
- **`lib/transactional-email.ts`** — the *only* file that reads
  `RESEND_API_KEY` / talks to Resend. HTML escaping and the branded email
  layout live here too.
- **`lib/support-notification-helpers.ts`** — recipient selection, email
  content per type, idempotent dispatch, and retry orchestration. Nothing
  here mutates `support_requests` — it only reads it.

## Files created

- `supabase/migrations/015_support_notifications.sql`
- `lib/transactional-email.ts`
- `lib/support-notification-helpers.ts`
- `app/api/admin/support-notifications/route.ts` — `GET` (all, or filtered
  by `?support_request_id=` / `?company_id=`)
- `app/api/admin/support-notifications/[id]/retry/route.ts` — `POST`
- `docs/phase-5.2-stage-5.2.3-notifications.md` — this document

## Files modified

- `package.json` — added `resend` dependency (installed; see `npm install`
  note below).
- `.env.example` — added the six new variables (see below).
- `docs/environment-variables.md` — documented the new variables; updated
  `NEXT_PUBLIC_SITE_URL`'s entry to reflect it now has a live consumer
  (moved out of "configured but unused").
- `supabase/schema.sql` — appended the `support_notifications` section
  (additive only; no existing section altered).
- `lib/supabase-server.ts` — added `SupportNotificationRecord` type and
  `getSupportNotificationsForRequestServer`,
  `getSupportNotificationsForCompanyServer`, `getAllSupportNotificationsServer`,
  `getSupportNotificationServer`, `getSupportNotificationByIdempotencyKeyServer`,
  `getOrCreatePendingSupportNotificationServer`,
  `updateSupportNotificationDeliveryServer`.
- `lib/support-request-helpers.ts` — added `notificationDeliveryOptions`,
  `notificationDeliveryStyles`, `formatNotificationDeliveryLabel`.
- `app/api/admin/support-requests/route.ts` — `POST` now dispatches
  acknowledgment + internal-alert notifications after the request is saved.
- `app/api/admin/support-requests/[id]/route.ts` — `PATCH` now dispatches
  the matching status-change notification only when `status` was supplied
  and actually differs from the prior value.
- `app/admin/support/page.tsx` — fetches the latest notification per
  request server-side and passes it to the table.
- `app/admin/support/support-request-table.tsx` — new "Notification" column
  with a delivery badge and a "Retry Email" action for failed sends.
- `app/admin/_components/support-request-card.tsx` — same badge/retry
  treatment on the company-page request list.

## Database migration

`supabase/migrations/015_support_notifications.sql` creates
`public.support_notifications` — a delivery-attempt log, not a queue. Every
column matches the brief's recommended structure. Notable specifics:

- `notification_type` is constrained to the 5 required types.
- `delivery_status` is constrained to `pending | sent | failed | skipped`.
- `idempotency_key` has a **unique index**
  (`support_notifications_idempotency_key_idx`) — this is the actual
  duplicate-prevention mechanism, not just an application-level check.
- FKs: `support_request_id → support_requests(id) on delete cascade`,
  `company_id → companies(id) on delete cascade`,
  `contact_id → company_contacts(id) on delete set null` — same cascade
  conventions as `support_requests` itself.
- `updated_at` trigger reuses `public.set_updated_at()`.
- RLS enabled, no public/anon policies — service-role access only, same as
  every other table in this schema.
- Appended to `supabase/schema.sql` in the same consolidated-snapshot style
  as every prior migration.

**Not executed.** No `supabase db push`, no SQL run against any database.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `RESEND_API_KEY` | No (fails safe) | Server-only. Authenticates Resend. |
| `EMAIL_FROM_NAME` | No (defaults to `Amber Global Energy`) | Email `From` display name. |
| `EMAIL_FROM_ADDRESS` | Yes, once `RESEND_API_KEY` is set | Verified sending address. |
| `SUPPORT_EMAIL` | No (defaults to `support@amberglobalenergy.in`) | Shown in email bodies; matches the existing UI value. |
| `SUPPORT_NOTIFICATION_EMAIL` | No | Fallback internal-alert recipient when no broker is assigned/has an email. |
| `NEXT_PUBLIC_SITE_URL` | No | **Reused, not duplicated** — already existed (inert). Now used to build the admin link in internal-alert emails. |

All added to `.env.example` with no real values, and documented in
`docs/environment-variables.md`. None are `NEXT_PUBLIC_*` except the
pre-existing site URL.

**`npm install` is required** — `resend` was added to `package.json` and
installed into this environment's `node_modules`, but that install does not
carry over anywhere the repository is freshly cloned or reinstalled.

## Email-provider configuration

Resend was chosen: no email provider existed anywhere in the codebase
(audited — see "Audit findings" in the final response), it's the smallest
dependency that satisfies "server-side transactional email," and its SDK has
no other transitive dependencies of note. `lib/transactional-email.ts` is
the sole integration point; swapping providers later means changing that one
file only.

## Recipient-selection rules (as implemented)

**Client-facing** (`selectClientRecipient` in `support-notification-helpers.ts`):
1. The request's explicitly selected `contact_id`, if that contact is
   `status = 'active'` and has an `email`.
2. Otherwise, the company's active primary contact (`is_primary = true`,
   `status = 'active'`, has an `email`).
3. Otherwise, any other active contact with an email, in the same
   primary-first/alphabetical order `getCompanyContactsServer` already
   returns.
4. Otherwise `null` — the caller records the attempt as `skipped` with a
   clear reason. **The administrator/support inbox is never substituted as
   a stand-in client recipient.**

**Internal alert** (`selectInternalRecipient`):
1. The assigned broker's `admin_users.email`, if `assigned_to` is set and
   that user has an email on file.
2. Otherwise `SUPPORT_NOTIFICATION_EMAIL`, if configured.
3. Otherwise `null` — recorded as `skipped`.

## Notification types & triggers

| Type | Trigger | Recipient |
|---|---|---|
| `support_acknowledgment` | Request created | Client (selection above) |
| `support_internal_alert` | Request created | Broker/fallback (selection above) |
| `support_waiting_for_client` | Status → `waiting_for_client` | Client |
| `support_resolved` | Status → `resolved` | Client |
| `support_closed` | Status → `closed` | Client |

`new`, `open`, and `in_progress` intentionally have **no** entry in
`CLIENT_FACING_STATUS_TYPES` — transitions into or between them never
trigger a client email, per the brief ("do not send client-facing emails for
every internal status change").

## Idempotency strategy

Deterministic key, built in `buildIdempotencyKey()`:
- Creation events: `{support_request_id}:{notification_type}`
- Status-change events: `{support_request_id}:{notification_type}:{status}`

The unique index on `idempotency_key` is the actual guarantee (not just an
in-application check — a concurrent duplicate insert hits Postgres error
`23505`, which `getOrCreatePendingSupportNotificationServer` catches and
resolves by re-selecting the winning row). A notification already in a
terminal state (`sent` or `skipped`) is never re-attempted; only a fresh row
or one still `pending`/`failed` proceeds to send.

**Known tradeoff, by design**: because the key includes the target *status*
rather than a per-transition counter, a support request that reaches
`waiting_for_client` twice (e.g. reopened after being resolved, then set
back to `waiting_for_client` again later) will **not** get a second email —
the first `sent` row for that `(request, status)` pair already satisfies the
key. This was chosen deliberately: the brief's duplicate-prevention
requirement is explicit and testable; "always notify on every re-occurrence"
is not required and re-introduces the exact duplicate-risk surface the
brief asks to close. A true per-transition version counter (e.g. incrementing
a `status_version` column) is a natural follow-up if re-entry notifications
are wanted later — see Known Limitations.

Two independent guards prevent duplicates in practice:
1. **Route-level**: the PATCH route only calls the dispatcher when
   `status !== existing.status` — an unchanged-status save, or a save that
   only touches `assigned_to`/`category`/`priority`, never reaches the
   notification layer at all.
2. **Idempotency-key level**: even if the dispatcher were called twice for
   the same real transition (retry, double-submit, route retry), the second
   call finds the existing row and returns it without sending again.

## Failure behavior

`sendTransactionalEmail()` in `lib/transactional-email.ts` never throws —
every path (missing config, provider error, network failure) returns a
structured `{ ok: false, ... }` result. `dispatchNewSupportRequestNotifications`
and `dispatchSupportStatusNotification` each wrap their own logic in
try/catch and log to the server console; the calling routes wrap the dispatch
call in one more try/catch as a backstop. **A support request is always
created/updated successfully regardless of email outcome** — verified live
against the current dev database, which does not yet have migration 015
applied (see Local Testing Checklist below): both `POST` and `PATCH`
returned normal 200/201 responses with full data while the server log showed
`[support-notifications] ... dispatch failed: Error: Could not find the
table 'public.support_notifications' in the schema cache` — the exact
fail-safe behavior required, exercised by a genuine current condition rather
than a simulated one.

## Retry behavior

`POST /api/admin/support-notifications/[id]/retry`:
- Reuses the **same row** (same `id`, same `idempotency_key`) — never
  inserts a new one.
- No-ops (returns the row as-is) if it's already `sent`.
- Rejects with a clear, safe message if the row has no real recipient on
  file (the `skipped`-due-to-no-contact case) rather than attempting to
  send to a placeholder value.
- Rebuilds the email content fresh from the support request's **current**
  state rather than replaying stale content — correct if the request has
  moved on since the original failure.
- Authorization: `checkPermission("support_requests")` — the same check
  already used by the create/update routes. `support_requests` is not in
  `BROKER_RESTRICTED_RESOURCES`, so admins and brokers can retry; viewers
  are blocked (403) automatically, with no new resource type needed.

## In-app visibility

- **Admin Support Panel** (`/admin/support`): a new "Notification" column
  shows the latest notification's delivery badge (Sent / Pending / Failed /
  Skipped) per row, computed server-side in `page.tsx` from
  `getAllSupportNotificationsServer()` (one query, grouped client-side into
  the newest-per-request map — no N+1 queries). A "Retry Email" button
  appears only when the latest state is `Failed`.
- **Company page card** (`app/admin/_components/support-request-card.tsx`):
  same badge + retry treatment per request in that company's list, fetched
  via the new `company_id`-filtered notifications endpoint.
- Failed notifications never surface the raw provider/database error in the
  browser — the stored `error_message` is already a short, sanitized string
  (`lib/transactional-email.ts` never lets a raw Resend error or exception
  reach the caller), and the UI additionally only ever displays the fixed
  label "Failed" plus a `title` tooltip of "Email could not be delivered."
- This is intentionally **not** a full notification dashboard — no separate
  top-level notifications page, no bulk-retry, no filtering/search. Per the
  brief: "Keep this stage focused."

## Email Timeline integration

Audited first: `public.emails` links via
`inquiry_id | company_id | project_id | contract_id`, with no
`support_request_id` column, and is accessed exclusively through the
existing `createEmailServer()` helper. A successfully **sent** notification
is logged into this existing table via `company_id` — no schema change, no
second email-history system. `logged_by` is left at its existing default
(`'admin'`); the entry is distinguishable as automated by its subject lines
(e.g. "We've received your support request — …", "Resolved — …") and by
`from_address` matching `EMAIL_FROM_ADDRESS`. `skipped` and `failed`
attempts are **not** written to the Email Timeline — only `support_notifications`
is the record of those, which is the correct place for delivery-attempt
bookkeeping versus a client-facing correspondence log.

## Security controls

- `RESEND_API_KEY` is read only inside `lib/transactional-email.ts`, which
  is only ever imported from `lib/support-notification-helpers.ts`, which is
  only ever imported from `app/api/admin/support-requests*` route files and
  the new retry route — all server-only route handlers, never a `"use
  client"` component. Verified via `grep -rn "transactional-email\|support-notification-helpers"` across `app/`.
- No email-related environment variable uses the `NEXT_PUBLIC_` prefix
  except the pre-existing, non-secret `NEXT_PUBLIC_SITE_URL`.
- `escapeHtml()` in `lib/transactional-email.ts` sanitizes every dynamic
  value (subject, message, contact name, company name) before it's
  interpolated into an HTML email body. Plain-text bodies need no escaping.
- Retry authorization reuses `checkPermission("support_requests")` — no new
  bypass path. Viewers get a 403 with no side effects.
- Emails never include `admin_users.access_code_hash`, notes fields, or any
  other admin-only/internal data — only fields already surfaced elsewhere in
  the CRM (subject, category, priority, message, company/contact names).
- Provider errors are sanitized before storage (`"The email provider
  declined to send this message."` / `"...could not be reached."`) — the
  raw Resend error object never reaches `support_notifications.error_message`,
  let alone the browser.
- `/api/admin/support-notifications*` sits under the existing `proxy.ts`
  Basic Auth perimeter (`matcher: ["/admin/:path*", "/api/admin/:path*"]`) —
  verified directly in `proxy.ts`; no anonymous access is possible.

## Workflow control (human-in-the-loop boundary)

- Humans (Amber Harrison as administrator, and permitted brokers) remain
  solely responsible for setting support-request status and assigning
  brokers — this stage introduces no automated status transitions, no
  automated broker assignment, and no automated request closure.
- This notification layer only **reacts** to a status change an admin/broker
  already made through the existing PATCH route; it never initiates one.
- No AI model, heuristic classifier, or autonomous agent is present anywhere
  in this stage's code. `lib/support-notification-helpers.ts` and
  `lib/transactional-email.ts` contain zero calls to any AI/LLM API.
- **Foundation for later AI recommendations**: `support_notifications.metadata`
  (jsonb) and the clean separation between "build content" / "record" /
  "send" / "update status" steps in `support-notification-helpers.ts` are
  structured so a future stage could add an AI-generated *recommendation*
  (e.g., "consider marking resolved") as data, without touching the send
  path. That stage must still require an explicit human action to act on any
  recommendation — AI must not autonomously close requests, assign brokers,
  or contact clients. Administrator override rules for that future stage are
  explicitly out of scope here and will be handled separately.

## Manual migration instructions

1. Confirm migrations 013 and 014 are already applied (required — 015
   references both `support_requests` and `company_contacts`).
2. Open the Supabase SQL Editor.
3. Paste the full contents of `supabase/migrations/015_support_notifications.sql`.
4. Execute once. All statements are `IF NOT EXISTS` / idempotent.
5. Run `npm install` to install the `resend` dependency added to
   `package.json`.
6. Set `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, and (recommended)
   `EMAIL_FROM_NAME` / `SUPPORT_NOTIFICATION_EMAIL` in `.env.local` (and in
   Vercel's environment variables for Preview/Production when ready).
   `SUPPORT_EMAIL` and `NEXT_PUBLIC_SITE_URL` may already be set from prior
   stages.

**None of the above was executed as part of this task.**

## Local testing checklist

Performed live against the current dev database (migration 015 **not**
applied — a genuine, not simulated, "notification system down" condition),
using `curl` with the existing Basic Auth credentials:

- [x] `POST /api/admin/support-requests` with a real `company_id` → **201**,
  full support-request data returned.
- [x] Server log shows `[support-notifications] acknowledgment dispatch
  failed: ... Could not find the table 'public.support_notifications'` and
  the equivalent for the internal alert — caught, logged, response
  unaffected.
- [x] `PATCH .../[id]` with `{"status":"waiting_for_client"}` → **200**,
  updated data returned, no crash despite the same missing-table condition.
- [x] `PATCH .../[id]` with `{"status":"closed"}` → **200**, `resolved_at`
  correctly stamped.
- [x] `GET /api/admin/support-notifications` → clean **500** with a message
  (same error-surfacing convention every other list route in this codebase
  already uses — not a new pattern), not a server crash.
- [x] `GET /admin/activity` → **200**, "Activity Feed" and "Support request
  submitted" both present — unaffected by this stage's changes.
- [x] `GET /admin/companies/[id]` → **200**, "Need Assistance?" and "Company
  Contacts" both present — company page unaffected.
- [x] `GET /admin/support` → **200**, "Support Requests" heading present.
- [x] `npm run build` → succeeds, all routes (including the two new ones)
  compile.
- [x] `npm run lint` → 18 problems (11 errors, 7 warnings), **identical
  count to before this stage's changes** — no new findings introduced.

Not performed locally (requires `RESEND_API_KEY` + `EMAIL_FROM_ADDRESS`,
which are intentionally left unset in this environment): items 4–6, 8, 10,
12 below.

## Production/full testing checklist (requires provider credentials)

1. Submit a support request with a valid active primary contact.
2. Confirm the request is saved even if email credentials are absent
   (verified locally above; also re-verify once credentials **are** set, by
   temporarily unsetting them, to confirm the same fail-safe path holds).
3. Confirm a notification record is marked `skipped` (no contact) or
   `failed` (provider misconfigured) appropriately.
4. With `RESEND_API_KEY` + `EMAIL_FROM_ADDRESS` configured, confirm the
   acknowledgment email sends once and `support_notifications.delivery_status
   = 'sent'`.
5. Confirm the internal alert sends to the assigned broker's email, or to
   `SUPPORT_NOTIFICATION_EMAIL` when unassigned.
6. Re-submit the same request payload (simulating a retry/duplicate) and
   confirm no second email is sent — the existing `idempotency_key` row is
   reused.
7. Change status New → Open and confirm no client email is sent (and no new
   `support_notifications` row is created).
8. Change status → Waiting for Client and confirm exactly one client email
   sends.
9. Save "Waiting for Client" again without changing it and confirm no
   duplicate email (route-level guard: `status === existing.status`).
10. Change status → Resolved and confirm one client email.
11. Change status → Closed and confirm one client email.
12. Force a failure (e.g. temporarily invalid `EMAIL_FROM_ADDRESS`), confirm
    the row is `failed`, then use "Retry Email" as an admin/broker and
    confirm it succeeds and reuses the same row (`id` unchanged).
13. Confirm a `viewer`-role session gets a 403 from the retry endpoint and
    from PATCH — no email is triggered.
14. Confirm `/admin/activity` still loads and includes support-request
    events (verified locally above).
15. Confirm company contacts, documents, email timeline, reminders,
    contracts, projects, and inquiries all still function (spot-checked
    company-page rendering locally above; full click-through recommended
    before considering the stage complete).
16. Confirm no secret or provider credential appears in browser dev tools
    (Network tab responses, page source), server logs beyond the intended
    short error strings, or any file in this diff (`git diff` reviewed —
    only variable *names* were added to `.env.example`/docs, never values).

## Rollback plan

- **Application code**: revert the files listed under "Files created" /
  "Files modified" via `git checkout` on this branch, or discard the
  branch — nothing has been committed.
- **`resend` dependency**: remove the `"resend"` line from `package.json`
  and run `npm install` again (or `npm uninstall resend`) if the dependency
  itself needs to be removed.
- **Database**: if migration 015 was applied to a staging/test project and
  needs to be undone:
  ```sql
  drop table if exists public.support_notifications;
  ```
  Safe because no other table has a foreign key pointing *into*
  `support_notifications` — it only references outward to
  `support_requests`, `companies`, and `company_contacts`, none of which are
  affected by dropping it.

## Known limitations

- **Idempotency key does not version re-entries into the same status** — see
  "Idempotency strategy" above for the explicit tradeoff and rationale.
- **No background retry/scheduler**: a `failed` notification stays `failed`
  until an admin/broker clicks "Retry Email." There is no automatic retry
  queue or exponential backoff — consistent with "do not build a full
  notification dashboard... keep this stage focused."
- **`GET` list routes are unauthenticated at the route level** (same as
  every other list route in this codebase — protected by the `proxy.ts`
  Basic Auth perimeter over `/api/admin/*`, not by `checkPermission`). This
  matches, rather than introduces, the existing security model.
- **Error messages on `GET` failures include the raw Supabase error text**
  (e.g. "Could not find the table...") — this is the pre-existing pattern
  used by every list route in `lib/supabase-server.ts`/`app/api/admin/*`,
  not something new introduced here. Hardening this project-wide is a
  separate, broader concern outside this stage's scope.
- **One notification email per event, not a full audit trail of every retry
  attempt**: each retry updates the *same* `support_notifications` row in
  place (by design, to satisfy "must not create uncontrolled duplicates"),
  so the row's `error_message`/`provider_message_id` reflect only the most
  recent attempt, not a history of every prior failed attempt. If a
  per-attempt audit trail is wanted later, that's an additive change (e.g. a
  `support_notification_attempts` child table) rather than a redesign.
- **A live test support request was created** against the connected
  Supabase project while verifying the fail-safe behavior above (id
  `dc35ca68-dbde-44f1-bcc5-28f40d19be8d`, company "egnite the world",
  subject "Stage 5.2.3 fail-safe test"). It was set to `closed` status
  afterward via the existing PATCH route to keep the queue tidy, but was not
  deleted — there is no delete endpoint for support requests, by design
  (matching the closed-not-deleted convention already established for
  contracts and reminders). Remove it directly in Supabase if it should not
  remain.

## Future AI-recommendation boundary

Restated for visibility (also embedded as comments in
`lib/support-notification-helpers.ts`):

- Humans remain responsible for support statuses and broker assignments.
- AI may, in a future stage, generate a *recommendation* (e.g., surfaced as
  read-only text or a suggested next action) — never an autonomous action.
- AI must not autonomously close requests, reassign brokers, or send client
  communications without an explicitly approved rule from a separate,
  future workflow-control stage.
- No AI/LLM integration exists anywhere in this stage's code.

## Confirmation

- **No Supabase migration was executed.** `support_notifications` does not
  exist in the connected database — confirmed live via the error message
  captured in "Local testing checklist" above.
- **No deployment occurred.** No Vercel command was run.
- **No commit or push occurred.** All changes remain unstaged/untracked on
  `phase-5.2-executive-crm`.
