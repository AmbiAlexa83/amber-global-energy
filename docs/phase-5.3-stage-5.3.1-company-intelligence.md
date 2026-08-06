# Phase 5.3 — Stage 5.3.1: Company Intelligence Foundation

Covers sub-stages **5.3.1A** (deterministic scoring engine), **5.3.1B**
(Company Health card), and **5.3.1C** (company Relationship Timeline). They are
documented together because 5.3.1B and 5.3.1C add no logic of their own — each
is a presentation layer over an engine 5.3.1A already built.

## Purpose

Give every company profile an at-a-glance, explainable read on the health of
that relationship — which risks are open, why each one triggered, and what to
do about it — derived entirely from CRM data already being captured, with no
new tables and no AI/LLM calls.

## Existing functionality reused

- `lib/executive-alerts.ts` / `lib/executive-analytics.ts` module shape — pure,
  UI-independent, deterministic rules over real CRM data; plain data in, plain
  structured objects out. `lib/company-intelligence.ts` follows this exactly
  rather than introducing a different intelligence pattern.
- `ExecutiveAlert`'s field contract — `CompanyHealthFlag` deliberately mirrors
  it (`severity`, `reason`, `recommendedAction`, entity context, `href`) and
  reuses its `AlertSeverity` type. This is what later made Stage 5.3.4
  possible without a second alert system.
- Existing closed/open state helpers, so "active" means the same thing here as
  everywhere else: `CLOSED_STATUSES` + `normalizeStatusValue`
  (`lib/inquiry-helpers.ts`), `CLOSED_PROJECT_STAGES` +
  `normalizeProjectStage` (`lib/project-helpers.ts`),
  `CLOSED_CONTRACT_STATUSES` (`lib/contract-helpers.ts`),
  `CLOSED_SUPPORT_STATUSES` (`lib/support-request-helpers.ts`).
- `lib/supabase-server.ts` server-helper architecture — company-scoped
  fetchers reuse the existing `_SELECT` constants and service-role-only access.
- `lib/activity-helpers.ts` `buildActivityFeed()` — reused **unmodified** by
  5.3.1C. The company timeline is company-scoped by feeding the existing
  builder company-scoped arrays, not by adding a second feed engine.
- `app/admin/_components/executive-alerts-panel.tsx` `severityStyles`
  convention, followed by the health card's flag badges.
- The company detail page layout, card styling, gold accent, and typography
  are unchanged; both new cards were inserted into the existing card stack.

## Database schema

**No schema changes.** Stage 5.3.1 added no tables, columns, indexes, or
migrations. Every metric and rule is derived at read time from data already
captured by Phases 3–5.2.

## The engine (5.3.1A)

`lib/company-intelligence.ts` is a data layer only — no JSX, no framework
imports, no randomness, no AI calls.

**Tunable thresholds** all live in one exported object, `COMPANY_HEALTH_RULES`:

| Key | Value | Used by |
|---|---|---|
| `urgentSupportHours` | 24 | `urgent_support_overdue` |
| `waitingClientDays` | 7 | `waiting_for_client_stale` |
| `inactivityDays` | 30 | `no_recent_activity` |
| `reminderGraceDays` | 1 | `reminder_overdue` |

**Metrics** (`CompanyHealthMetrics`): active inquiries / projects / contracts,
open and urgent support requests, upcoming and overdue reminders, active
contact count, whether a primary contact exists, and last interaction
(timestamp + whether it was an email, support update, or document).

**Rules** — six, each self-contained, each reading its threshold from
`COMPANY_HEALTH_RULES`, each authored with the health level it drives so the
rule-to-level mapping stays auditable rather than inferred from severity:

| Rule id | Severity | Drives level |
|---|---|---|
| `no_primary_contact` | medium | attention_needed |
| `urgent_support_overdue` | high, or critical if >1 | at_risk |
| `waiting_for_client_stale` | medium | attention_needed |
| `unverified_with_active_deals` | medium | attention_needed |
| `reminder_overdue` | low | attention_needed |
| `no_recent_activity` | high | at_risk |

**Level** (`CompanyHealthLevel`) is `at_risk` if any flag drives it, else
`attention_needed` if any flag drives that, else `healthy`. With no flags,
`reasons` is `["No open risk indicators."]`.

`computeCompanyHealth(input, rules?, now?)` accepts injectable rules and clock,
which is what let Stage 5.3.3 score a whole portfolio against one instant.

`computeCompanyBriefing()` was also written in this sub-stage but had no caller
until Stage 5.3.2 — see that stage's document.

## Created files

- `lib/company-intelligence.ts` — the engine: `COMPANY_HEALTH_RULES`,
  `CompanyIntelligenceInput`, `matchInquiriesToCompany`, metrics, the six
  rules, `computeCompanyHealth`, `computeCompanyBriefing`
- `app/admin/_components/company-health-card.tsx` (5.3.1B) — Company Health
  card: level badge, eight metric tiles, one row per flag with its severity
  and recommended action
- `app/admin/_components/company-timeline.tsx` (5.3.1C) — Relationship
  Timeline card; presentation only, rows mirroring `/admin/activity`
- `docs/phase-5.3-stage-5.3.1-company-intelligence.md` — this document

## Modified files

- `lib/supabase-server.ts` — added company-scoped fetchers
  `getProjectsForCompanyServer`, `getContractsForCompanyServer`, and
  `getDealMatchesForCompanyServer` (the last checks both `buyer_company_id`
  and `seller_company_id`, since a company can sit on either side of a match,
  and validates the id as a UUID before interpolating it into the raw
  PostgREST `.or()` filter — the same safeguard `getDealMatchesServer` already
  applied to `inquiryId`)
- `app/admin/companies/[id]/page.tsx` — assembles the engine input from
  already-fetched arrays and mounts `<CompanyHealthCard>` and
  `<CompanyTimeline>` at the top of the existing card stack

## Manual testing checklist

- [ ] Open a company with no contacts, deals, or activity — confirm the health
      card renders, shows `Attention Needed` (no primary contact), and the
      timeline shows its empty state.
- [ ] Open a company with an active project or contract but no verification —
      confirm `unverified_with_active_deals` appears with its recommended
      action.
- [ ] Leave an urgent support request open >24h — confirm the level becomes
      `At Risk` and severity is `high` (open a second to confirm `critical`).
- [ ] Set a support request to `waiting_for_client` and backdate `updated_at`
      >7 days — confirm `waiting_for_client_stale`.
- [ ] Create a pending reminder due >1 day ago — confirm `reminder_overdue`
      and that the overdue-reminders tile increments.
- [ ] On a company with an active deal and no email/document/support activity
      in 30+ days — confirm `no_recent_activity`.
- [ ] Confirm the Last Interaction tile names the correct source (email vs
      support update vs document) and its relative time.
- [ ] Confirm the timeline lists **only** that company's events, and that
      every row's link resolves to the right record.
- [ ] Visit `/admin/activity` — confirm it is unchanged and still desk-wide.
- [ ] Run `npm run lint` and `npm run build` — confirm no new failures.

## Rollback plan

- **Application code**: `git revert` the relevant commit, or remove the two
  card mounts from `app/admin/companies/[id]/page.tsx` — the engine is pure
  and inert with no caller.
- **Database**: nothing to roll back; no migration was added.

## Known limitations

- **Inquiries are matched to companies by name, not by key.**
  `public.inquiries` has no `company_id` column, so `matchInquiriesToCompany`
  does case-insensitive, trimmed equality on `company_name`. A typo or a
  renamed company silently detaches its inquiries from the score. The
  recommended migration in
  `docs/phase-5.2-stage-5.2.1-company-contacts.md` would fix this at the root.
- **`dealMatches` is accepted but unread.** It is part of
  `CompanyIntelligenceInput` and is threaded through by every caller, but no
  current metric or rule consults it. It is a deliberate placeholder for a
  future match-based rule, not dead weight left by accident.
- **The timeline omits inquiry field-history events.** The company page passes
  `inquiryHistory: []` to `buildActivityFeed()`, so `✏️ Status changed`-style
  events appear on `/admin/activity` but not on a company timeline. Including
  them needs either `getInquiryHistory(inquiryId)` per related inquiry (an
  N+1 query on a page that otherwise has a fixed query count) or the
  row-capped desk-wide `getRecentInquiryHistoryServer()`. Deferred rather
  than solved; the fix is a `company_id`/`inquiry_id`-scoped history fetcher.
- **Contact, company, project, and contract timeline events are not
  field-level** — the same limitation already documented for Stage 5.2.1,
  inherited here because the timeline reuses `buildActivityFeed()`.
- **No test coverage.** The engine is pure and highly testable, but this
  project has no test harness, so all six rules are verified manually per the
  checklist above.
