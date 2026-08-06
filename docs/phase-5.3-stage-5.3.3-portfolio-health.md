# Phase 5.3 — Stage 5.3.3: Portfolio Health in the Company Directory

## Purpose

Scale company intelligence from one company to the whole desk: show every
company's health level in the company directory, so risk is visible without
opening each profile one at a time.

## Existing functionality reused

- `computeCompanyHealth()` — **no new rules and no second scoring engine.** The
  new rollup groups desk-wide arrays by company, then delegates each company to
  the same function the profile page calls, so a company's directory badge and
  its profile card cannot disagree.
- `matchInquiriesToCompany()` (`lib/company-intelligence.ts`) — this stage is
  its first real caller. It had been written in 5.3.1A and left unused.
- The company directory page's existing server-side grouping pattern. It
  already fetched desk-wide and grouped in memory for `inquiryCounts`; health
  scoring extends that same pattern rather than introducing a new one.
- Existing desk-wide fetchers: `getAllCompanyContactsServer`,
  `getProjectsServer`, `getContractsServer`, `getSupportRequestsServer`,
  `getAllRemindersServer`, `getDealMatchesServer`.
- The `getAll*Server` naming and body convention (from
  `getAllRemindersServer`) for the two fetchers this stage had to add.
- The roster's existing table, row styling, and badge scale — the new column
  reuses the same badge sizing as the verification and status columns, and the
  `—` empty-cell idiom already used for registration/country/industry.
- `/admin/activity`'s defensive posture around `buildActivityFeed()`, copied
  for the rollup call.

## Database schema

**No schema changes.**

## Why the directory, and not `/admin`

`/admin/companies/page.tsx` is a server component that already fetched
desk-wide and grouped in memory, so this extended an existing pattern.
`/admin/page.tsx` is a `"use client"` component that receives intelligence
through `/api/admin/executive-analytics`; putting company health there would
have meant a new client-fetch path. That surface was instead handled properly
in Stage 5.3.4, through the existing executive alert pipeline.

## Query cost

The directory issues **10 desk-wide queries — one per entity type — regardless
of how many companies exist.** Adding a company adds no queries. Grouping is
O(rows), so cost scales with total rows rather than companies × rows. This is
up from 2 queries before this stage; the increase is the price of health
scoring and is a fixed cost, not an N+1.

Every health input is individually `.catch(() => [])`, and the rollup call is
wrapped in `try/catch`. The directory is a working CRM screen first: a failure
in one health input degrades the Health column rather than taking the roster
down.

## Why two new fetchers were required

`getRecentDocumentsServer(limit = 50)` and `getRecentEmailsServer(limit = 50)`
already existed, but their caps are an **activity-feed** concern. Those rows
feed `findLastInteraction()` → `lastInteractionAt` → the `no_recent_activity`
**at-risk** rule. Reusing the capped fetchers would have flagged any company
whose last interaction fell outside the newest 50 desk-wide rows as at risk in
the directory while its own profile page said otherwise. `getAllDocumentsServer`
and `getAllEmailsServer` remove that silent cap. They return plain records —
unlike `getDocumentsForEntityServer`, they do not sign URLs, which health
scoring does not need.

## Created files

- `app/admin/_components/company-health-badge.tsx` — the single home for the
  health-level → colour/label mapping, shared by the profile card and the
  directory. Values were lifted verbatim from `CompanyHealthCard`, which owned
  them when it was the only caller. Size/weight utilities are left to the
  caller via `className`, since the profile badge is a card heading affordance
  while the roster's must match the smaller in-row badge scale.
- `docs/phase-5.3-stage-5.3.3-portfolio-health.md` — this document

## Modified files

- `lib/company-intelligence.ts` — added `CompanyPortfolioInput` and
  `computeCompanyPortfolioHealth()`, plus two private grouping helpers.
  `groupByCompany` buckets rows by `company_id`, skipping unlinked rows;
  `groupDealMatchesByCompany` files each match under **both** its buyer and
  seller company, mirroring the both-columns lookup in
  `getDealMatchesForCompanyServer`. `now` is passed explicitly into every
  `computeCompanyHealth()` call so all companies in one render are scored
  against the same instant — the per-call `new Date()` default would drift
  across the loop and make time-based rules non-reproducible.
- `lib/supabase-server.ts` — added `getAllDocumentsServer()` and
  `getAllEmailsServer()`
- `app/admin/companies/page.tsx` — extended the existing single `Promise.all`;
  calls the rollup and projects it down to `{ level, reason }` per company
  before passing it to the client component
- `app/admin/companies/company-roster.tsx` — added the `Health` column (both
  the read and the edit row branches) and the exported `CompanyHealthSummary`
  type. Renders what it is handed and evaluates no rules of its own.
- `app/admin/_components/company-health-card.tsx` — now uses the shared badge
  instead of its own copy of the maps. **Rendered markup is unchanged**: same
  class set (reordered, with no conflicting utilities) and same labels.

## Manual testing checklist

- [ ] Open `/admin/companies` — confirm the table still renders and that
      header and cell counts align (9 columns) in both normal and edit rows.
- [ ] Confirm each company's directory badge matches the badge on its own
      profile page, for a healthy, an attention-needed, and an at-risk company.
- [ ] Hover a badge — confirm the tooltip shows the leading health reason.
- [ ] Add a company via the roster form — confirm the Health cell shows `—`
      momentarily and populates after `router.refresh()` completes.
- [ ] Edit a company inline — confirm the Health cell persists through the
      edit-row branch and that saving does not clear it.
- [ ] Confirm a company with documents/emails older than the newest 50
      desk-wide rows is **not** falsely flagged `no_recent_activity`.
- [ ] Confirm the company profile page's health card is visually identical to
      before this stage.
- [ ] Spot-check directory load time with the full company list.
- [ ] Run `npm run lint` and `npm run build` — confirm no new failures.

## Rollback plan

- **Application code**: revert the commit. If a partial rollback is needed,
  removing the `healthByCompanyId` prop and the `Health` column from the roster
  is sufficient to restore the previous directory; the rollup and the two
  fetchers then become uncalled but remain harmless. Note that
  `company-health-card.tsx` depends on the shared badge, so
  `company-health-badge.tsx` must not be deleted without restoring the card's
  local maps.
- **Database**: nothing to roll back.

## Known limitations

- **`dealMatches` is fetched but no current rule reads it.** It is grouped and
  passed for exact parity with the profile page, so a future match-based rule
  behaves identically on both surfaces. Until then it is one desk-wide query
  whose result is unread; dropping it changes no output today.
- **Directory query count rose from 2 to 10.** Fixed, not per-company, but it
  is 8 more round trips per directory load. If this becomes slow the fix is
  caching the rollup — not reintroducing per-company fetches.
- **Name-based inquiry matching** applies here too, inherited from 5.3.1A.
- **The Health column is not sortable or filterable.** The directory has no
  existing sort/filter controls, and adding them would have been a redesign.
- **Newly created companies briefly show `—`.** Optimistic local state has no
  server-scored entry until `router.refresh()` lands. This is a one-render
  gap, not a persistent blank.
- **No test coverage** — verified manually.
