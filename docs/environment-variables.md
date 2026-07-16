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

### `NEXT_PUBLIC_SITE_URL`
- **Purpose (intended)**: Canonical site URL, presumably for SEO/OG tags.
- **Required**: No — inert.
- **Exposure**: Would be browser-exposed by design if wired in.
- **Environments**: Production, Preview (present in Vercel; not read by any
  code).
- **Example placeholder**: `https://amber-global-energy.vercel.app`
- **Consequence if missing**: None currently.
- **Rotation**: Not applicable.

## Verification performed

- Full-repo `process.env.*` scan (`app/`, `lib/`, `proxy.ts`) — 5 distinct
  variables actively read; cross-referenced against 8 variables present in
  `.env.local` and Vercel.
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
