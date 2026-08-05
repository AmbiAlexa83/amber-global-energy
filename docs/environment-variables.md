# Environment Variables

This document lists every environment variable the Amber Global Energy CRM
reads, where it's configured, and what happens if it's missing. **Names
only — never real values.** Real values live in `.env.local` (gitignored,
never committed) and in Vercel's encrypted Environment Variables store.

Audited against source code (`grep -r "process.env"` across `app/`, `lib/`,
`proxy.ts`), `.env.local` variable names, and `vercel env ls` as of
2026-07-16.

## Core variables (in active use)

### `NEXT_PUBLIC_SUPABASE_URL`
- **Purpose**: The Supabase project's API URL. Used to construct both the
  server-side service-role client (`lib/supabase-server.ts`) and the
  browser-side anon client (`lib/supabase.ts`).
- **Required**: Yes.
- **Exposure**: Browser-exposed (`NEXT_PUBLIC_` prefix — Next.js inlines it
  into the client bundle). This is expected and safe: a Supabase project URL
  is not a secret on its own.
- **Environments**: Local, Preview, Production.
- **Configured in**: `.env.local` (local); Vercel → Project Settings →
  Environment Variables (Preview, Production).
- **Example placeholder**: `https://your-project-ref.supabase.co`
- **Consequence if missing**: `supabaseServer` and `supabase` both become
  `null`; every function in `lib/supabase-server.ts` throws "Supabase
  service role key is not configured on the server." — the entire admin
  backend and the public inquiry form stop working.
- **Rotation**: Not applicable — this only changes if the project migrates
  to a different Supabase instance.

### `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **Purpose**: Supabase anon/publishable key for the browser-side client in
  `lib/supabase.ts`.
- **Required**: Configured, but **currently unused** — `lib/supabase.ts`'s
  exports (`supabase`, `getInquiries`, `submitInquiry`) are not imported
  anywhere in the live app. The public intake form actually submits through
  the server-side `/api/inquiries` route instead. This variable only matters
  if that legacy client-side path is ever wired back in.
- **Exposure**: Browser-exposed by design. Low sensitivity even if it were
  actively used — anon keys are meant to be public, and no table in this
  project has a public RLS policy, so this key alone cannot read or write
  anything.
- **Environments**: Local, Preview, Production.
- **Configured in**: `.env.local`; Vercel (Preview, Production).
- **Example placeholder**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example-anon-key`
- **Consequence if missing**: No current functional impact (unused code
  path). The `supabase` client in `lib/supabase.ts` would be `null`.
- **Rotation**: Not urgent given current non-use; standard anon-key hygiene
  (rotate if ever suspected exposed) applies if the path is revived.

### `SUPABASE_SERVICE_ROLE_KEY`
- **Purpose**: Full-privilege Supabase key that bypasses Row Level Security.
  Used by every function in `lib/supabase-server.ts` and, transitively, every
  `/api/admin/*` route and every `/admin/*` server-rendered page.
- **Required**: Yes — critical.
- **Exposure**: **Server-only.** Verified directly: every `"use client"`
  component that references `lib/supabase-server.ts` does so via
  `import type { ... }` (a compile-time-only TypeScript import that Next.js
  fully erases from the browser bundle). No runtime code, and therefore no
  key material, reaches the client. 49 importing files were checked; zero
  exceptions found.
- **Environments**: Local, Preview, Production.
- **Configured in**: `.env.local`; Vercel (Preview, Production).
- **Example placeholder**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example-service-role-key`
- **Consequence if missing**: Every admin API route and admin page throws
  "Supabase service role key is not configured on the server." — the entire
  CRM backend is down, though the public marketing site and Basic Auth
  perimeter itself are unaffected.
- **Rotation**: **Recommended periodically, and immediately if ever
  suspected exposed.** This is the single most sensitive credential in the
  project — it bypasses every RLS policy on every table.

### `ADMIN_USERNAME`
- **Purpose**: HTTP Basic Auth username for the `/admin/*` and
  `/api/admin/*` perimeter, enforced in `proxy.ts`.
- **Required**: Yes.
- **Exposure**: **Server-only** — referenced only in `proxy.ts` (edge
  middleware), never in client code.
- **Environments**: Local, Preview, Production.
- **Configured in**: `.env.local`; Vercel (Preview, Production).
- **Example placeholder**: `admin`
- **Consequence if missing**: `proxy.ts` fails **closed** — returns
  `503 Service unavailable: admin credentials not configured.` rather than
  allowing unauthenticated access. Verified in source (`proxy.ts:11-13`).
- **Rotation**: Recommended periodically, and immediately if shared with
  anyone who should no longer have access.

### `ADMIN_PASSWORD`
- Same purpose, exposure, consequence, and rotation guidance as
  `ADMIN_USERNAME` — the two form a single credential pair checked together
  in `proxy.ts`.
- **Example placeholder**: `change-me-to-a-strong-password`

## Transactional email (Stage 5.2.3 — Support Center notifications)

### `RESEND_API_KEY`
- **Purpose**: Authenticates server-side calls to Resend for support-request
  transactional emails (acknowledgment, internal alert, status-change
  notices). Used only in `lib/transactional-email.ts`.
- **Required**: No — the app **fails safe** when absent. Support requests
  still create/update normally; every notification attempt is recorded in
  `support_notifications` with `delivery_status = 'skipped'` and an
  explanatory (non-sensitive) `error_message`.
- **Exposure**: **Server-only.** Read only inside `lib/transactional-email.ts`,
  never imported by a `"use client"` component.
- **Environments**: Local (optional), Preview, Production.
- **Configured in**: `.env.local` (local); Vercel (Preview, Production).
- **Example placeholder**: *(left blank in `.env.example` — no fake key
  shape provided, to avoid implying a real key format)*.
- **Consequence if missing**: Every support-request email is skipped
  (recorded, not silently dropped) — the support request itself is
  unaffected.
- **Rotation**: Rotate immediately if ever suspected exposed; this key can
  send email as the configured `EMAIL_FROM_ADDRESS`.

### `EMAIL_FROM_NAME`
- **Purpose**: Display name for the `From` header on support-request emails.
- **Required**: No — defaults to `Amber Global Energy` in code if unset.
- **Exposure**: Appears in outbound email headers only, not the browser.
- **Example placeholder**: `Amber Global Energy`

### `EMAIL_FROM_ADDRESS`
- **Purpose**: The verified sending address for support-request emails.
- **Required**: Effectively yes once `RESEND_API_KEY` is set — Resend will
  reject sends from an unverified address.
- **Exposure**: **Server-only**, appears in outbound email headers only.
- **Consequence if missing**: Send attempts fail; recorded as `failed` in
  `support_notifications` with the request still unaffected.

### `SUPPORT_EMAIL`
- **Purpose**: The public support inbox shown to clients — both in the
  existing "Need Assistance?" card (`app/admin/_components/support-request-card.tsx`,
  already hardcoded there since Stage 5.2.2.1) and now also in the body of
  every automated support email.
- **Required**: No — code falls back to `support@amberglobalenergy.in` if
  unset, matching the existing hardcoded UI value.
- **Exposure**: Appears in email bodies shown to clients — not a secret.

### `SUPPORT_NOTIFICATION_EMAIL`
- **Purpose**: Fallback recipient for the internal "new support request"
  alert when no broker is assigned yet, or the assigned broker's
  `admin_users.email` is empty.
- **Required**: No, but the internal alert is skipped (and recorded as such)
  if both this and a broker email are unavailable.
- **Exposure**: **Server-only** — never sent to the browser.

### `NEXT_PUBLIC_SITE_URL` (reused, not duplicated)
- This variable already existed (see below) and was previously unused. Stage
  5.2.3 is its first live consumer: `lib/transactional-email.ts` uses it to
  build the direct admin link (`{NEXT_PUBLIC_SITE_URL}/admin/companies/{id}`)
  included in internal alert emails. When unset, the link is omitted from
  the email body rather than emitting a broken/relative URL. No new
  site-URL variable was introduced — see the "Configured but currently
  unused" section below for its original entry, now superseded by this note.

## Configured but currently unused

These three exist in both `.env.local` and Vercel but are **not referenced
anywhere in the codebase** (verified via a full-repo `process.env` scan and
a literal-string search for GA/GTM IDs). They appear to be reserved for
analytics/SEO work that was never implemented. Not a security concern —
flagged here purely so they aren't mistaken for load-bearing.

### `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- **Purpose (intended)**: Google Analytics measurement ID.
- **Required**: No — inert.
- **Exposure**: Would be browser-exposed by design if wired in.
- **Environments**: Production, Preview (present in Vercel; not read by any
  code).
- **Example placeholder**: `G-XXXXXXXXXX`
- **Consequence if missing**: None currently.
- **Rotation**: Not applicable.

### `NEXT_PUBLIC_GTM_ID`
- **Purpose (intended)**: Google Tag Manager container ID.
- **Required**: No — inert.
- **Exposure**: Would be browser-exposed by design if wired in.
- **Environments**: Production, Preview (present in Vercel; not read by any
  code).
- **Example placeholder**: `GTM-XXXXXXX`
- **Consequence if missing**: None currently.
- **Rotation**: Not applicable.

`NEXT_PUBLIC_SITE_URL` was previously listed here as inert — as of Stage
5.2.3 it has a live consumer; see "Transactional email" above for its entry.

## Verification performed

- Full-repo `process.env.*` scan (`app/`, `lib/`, `proxy.ts`) — originally 5
  distinct variables actively read (as of 2026-07-16); Stage 5.2.3 added 5
  more (`RESEND_API_KEY`, `EMAIL_FROM_NAME`, `EMAIL_FROM_ADDRESS`,
  `SUPPORT_EMAIL`, `SUPPORT_NOTIFICATION_EMAIL`) and activated one
  previously-inert variable (`NEXT_PUBLIC_SITE_URL`).
- Traced every importer of `lib/supabase-server.ts` (the service-role
  module) and confirmed every client-component import is type-only.
- Confirmed `proxy.ts`'s fail-closed behavior when admin credentials are
  absent.
- Searched `git log --all` for `.env.local`, `.env`, `.env.production` —
  no commit history for any of them.
- Searched tracked files for key-shaped secret patterns (JWT-like service
  role strings, AWS-style access keys, PEM private-key headers) — none
  found.
- Confirmed `.gitignore` covers `.env*`.
