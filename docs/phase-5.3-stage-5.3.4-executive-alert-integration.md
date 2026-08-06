# Phase 5.3 — Stage 5.3.4: Company Health in the Executive Alert Stream

## Purpose

Bring company relationship risk to the executive dashboard, so `/admin` shows
one complete view of what needs attention — deal execution *and* relationship
health — without maintaining a second alert system or a second set of rules.

## Existing functionality reused

- **`CompanyHealthFlag`'s deliberate shape.** 5.3.1A authored it to mirror the
  `ExecutiveAlert` contract (`severity`, `reason`, `recommendedAction`, entity
  context, `href`). Each flag therefore maps into an alert **field-for-field as
  a projection** — `lib/executive-alerts.ts` evaluates no company rules, so the
  dashboard and the company profile cannot disagree.
- `generateExecutiveAlerts()`'s existing `severityRank` sort — merged company
  flags rank alongside deal alerts with no new ranking logic.
- `computeCompanyPortfolioHealth()` from Stage 5.3.3 — reused as-is to score
  the desk; no company grouping logic was re-written.
- The executive-analytics route's existing single `Promise.all`, extended
  rather than supplemented with a second fetch phase.
- The desk-wide fetchers, including `getAllDocumentsServer` /
  `getAllEmailsServer` added in 5.3.3.
- `app/admin/_components/executive-alerts-panel.tsx` — **no UI component was
  needed.** The panel already renders `ExecutiveAlert[]` generically, so
  company risk appears in it with no markup change. Only its subtitle copy
  changed, to state the widened scope.

## Database schema

**No schema changes.**

## Why the ids had to be re-keyed

`CompanyHealthFlag` ids (e.g. `no_primary_contact`) are unique only *within*
one company's report, which is all `CompanyHealthCard` ever needed. Pooled
desk-wide they collide — two companies missing a primary contact emit the same
id — which would have produced duplicate React keys in the alert panel.
`flattenPortfolioHealthFlags()` re-keys each flag with its company id, and
`generateExecutiveAlerts()` additionally namespaces them as
`company_health-<id>` against the deal-alert ids.

## No duplicated inquiry fetch

`AnalyticsInquiryRecord` is `InquiryRecord & { role_type?: string | null }` — a
superset — so the route's existing `getInquiriesForAnalyticsServer()` result
satisfies the rollup's inquiry input directly. No second inquiry query was
added.

A single `now` is created in the route and passed to both the portfolio scoring
and the analytics report, so every time-based rule in one response reads the
same clock.

## Scope split between the two executive panels

Company alerts flow into the panel but are **excluded from the Executive
Summary**, which describes pipeline execution only.

- `isCompanyRelationshipAlert()` / `isPipelineExecutionAlert()`
  (`lib/executive-alerts.ts`) are the single classifier. They discriminate on
  `entityType` — which already is a discriminator, since every deal rule emits
  `inquiry`/`project`/`contract` and `CompanyHealthFlag` only ever emits
  `company`/`contact`/`support_request`/`reminder`. No id-string parsing.
  **Any future company-relationship rule must keep to that entity set for the
  split to hold.**
- `generateExecutiveSummary()` receives `executiveAlerts.filter(isPipelineExecutionAlert)`.
  Its parameter is named `pipelineAlerts` so the narrower contract is
  self-documenting.
- `ExecutiveIntelligenceReport.executiveAlerts` stays the complete merged list.

The filter was applied to the whole summary rather than only its status line,
because `topRisks` also derives from `criticalAndHigh`; leaving it unfiltered
would have kept relationship risks in the summary's prose. The summary's other
alert-derived fields were already deal-only via `type` filters, so passing them
the filtered list is a no-op that keeps the contract consistent.

### Copy states the split

The two panels now legitimately report different counts, so the wording says so
rather than leaving it to look like a contradiction:

- Executive Summary subtitle: "Reflects pipeline execution only. Company
  relationship health is excluded here and reported in Executive Alerts."
- Its risk heading reads **Highest-Priority Pipeline Risks**.
- Its at-risk note counts "high-severity **pipeline** alerts".
- Executive Alerts subtitle adds: "Covers both pipeline execution and company
  relationship health — the complete view of executive risk."

## Created files

- `docs/phase-5.3-stage-5.3.4-executive-alert-integration.md` — this document

## Modified files

- `lib/company-intelligence.ts` — added `flattenPortfolioHealthFlags()`
- `lib/executive-alerts.ts` — widened `ExecutiveAlert["entityType"]` with the
  four company-relationship members (verified non-breaking: nothing anywhere
  consumes the field); added the optional `companyHealthFlags` input, mapped in
  as "rule 9" before the existing severity sort; added the two classifier
  predicates. Imports `CompanyHealthFlag` **type-only**, so no runtime
  dependency is created in either direction — `lib/company-intelligence.ts`
  already type-imports `AlertSeverity` from here.
- `lib/executive-analytics.ts` — threads optional `companyHealthFlags` through
  `computeExecutiveIntelligence()` to `generateExecutiveAlerts()`; filters the
  summary's input; renamed that parameter to `pipelineAlerts`; qualified the
  at-risk note's alert count
- `app/api/admin/executive-analytics/route.ts` — extended the existing
  `Promise.all` by five desk-wide fetchers (contacts, support requests,
  documents, emails, deal matches), computes and flattens portfolio health, and
  passes the flags through. Company scoring is individually caught so a failure
  degrades to the previous deal-only alert set rather than 500ing the dashboard.
- `app/admin/_components/executive-summary.tsx` — scope subtitle; risk heading
  renamed
- `app/admin/_components/executive-alerts-panel.tsx` — subtitle states the
  widened scope

Both engine inputs are **optional**: omitting `companyHealthFlags` reproduces
the previous deal-only alert set exactly.

## Manual testing checklist

- [ ] Open `/admin` — confirm the Executive Alerts panel now includes company
      relationship alerts, interleaved by severity, and that its count in the
      heading includes them.
- [ ] Confirm each company alert links to the correct company profile.
- [ ] Confirm two companies with the same triggered rule both appear (the id
      collision case) and that React logs no duplicate-key warning.
- [ ] Confirm the Executive Summary's pipeline verdict does **not** change when
      only company relationship alerts are added or resolved.
- [ ] Confirm Highest-Priority Pipeline Risks lists no company relationship
      risk.
- [ ] Confirm the summary's at-risk note and the alerts panel heading count
      legitimately differ, and that both are self-explanatory in wording.
- [ ] Confirm a company alert's severity matches the same flag's severity on
      the company profile card.
- [ ] Temporarily break one company-health input (e.g. force
      `getSupportRequestsServer` to throw) — confirm `/admin` still loads with
      deal-only alerts rather than erroring.
- [ ] Confirm `/admin/companies` and the company profile pages are unchanged.
- [ ] Run `npm run lint` and `npm run build` — confirm no new failures.

## Rollback plan

- **Application code**: revert the commit. For a partial rollback, dropping
  `companyHealthFlags` from the route's `computeExecutiveIntelligence()` call
  restores the previous deal-only alert set immediately — both engine
  parameters are optional — though the copy would then overstate the panel's
  scope and should be reverted with it.
- **Database**: nothing to roll back.

## Known limitations

- **Alert volume is uncapped.** The panel renders every alert with no limit.
  This predates the stage (a missing LOI/ICPO alert already fires per open
  inquiry), but company flags add to the total. Only
  `urgent_support_overdue` and `no_recent_activity` are high/critical, so the
  high-severity band stays meaningful, but a large desk will produce a long
  panel. A cap or grouping control is the natural follow-up.
- **The classifier depends on an entity-type convention**, not a stored
  discriminator field. It is correct for every current rule and documented
  above, but a future rule that emits, say, a `company` entity for a
  pipeline-execution reason would be misclassified. A `domain: "deal" |
  "company_relationship"` field on `ExecutiveAlert` would make this
  structural; it was not added because it would require touching all nine
  existing alert push sites for no behavior change today.
- **Company scoring failure is silent to the user.** The `try/catch` degrades
  to deal-only alerts with no UI indication that relationship health is
  missing from the panel. The panel's subtitle would still claim it covers
  both.
- **The dashboard now fetches 11 desk-wide entity arrays per load** for this
  route. Fixed cost, no N+1, but the executive-analytics endpoint is
  meaningfully heavier than before this phase.
- **No test coverage** — verified manually.
