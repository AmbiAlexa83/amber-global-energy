# Amber Global Energy CRM — Roadmap & Release Record

## Phase 5.1 — Deal Matching Foundation: **COMPLETE**

- **Completion date**: 2026-07-15
- **Production commit**: `e5d3e97` ("Phase 5.1: Deal Matching Foundation")
- **Release tag**: `v1.1.0` (annotated, points to `e5d3e97`)
- **Deployment status**: Live at `https://amber-global-energy.vercel.app`,
  verified healthy (public site, `/admin`, `/admin/matches`,
  `/admin/matches/[id]`, `/api/admin/deal-matches`, auth perimeter, and full
  Phase 3/4.1 regression all confirmed 200/401 as expected post-deploy).
- **Database migration 012 (`deal_matches` table)**: Applied to production.
  Confirmed via a clean `{"data":[]}` response from
  `/api/admin/deal-matches` (no "relation does not exist" error) and via a
  full end-to-end test-data pass before cleanup (buyer/seller pairs scored
  and reviewed correctly, then removed).

### What shipped
- **Compatibility Score** (0-100) — deterministic trade-mechanics fit:
  product, quantity, geography, incoterms, payment terms, and timing, each
  independently weighted (`lib/deal-matching-rules.ts`).
- **Opportunity Score** (0-100) — compatibility folded in with trust/
  verification and document readiness, minus a risk penalty. Independently
  configurable weights from Compatibility Score.
- **Priority Score** (0-100) — ranks the suggested-match queue for brokers;
  intentionally independent of both scores above (deal value, urgency/
  staleness, and confidence band, not a re-blend of opportunity).
- **Deterministic Match Explanation** — strengths / conflicts / missing
  information / recommended next action, generated from the same component
  scores, on every match, every time (`lib/match-explanations.ts`).
- **Executive Match Summary** — a structured, human-readable digest (why the
  match was created, top strengths/risks, recommended action) built purely
  from already-computed data, no AI (`lib/match-executive-summary.ts`).
- **Match review workflow** — approve / reject / needs-information broker
  decisions, plus a workflow-status dropdown, both RBAC-protected
  (`"deal_matches"` in `lib/auth-helpers.ts`'s `ManagedResource`).
- **Authentication & RBAC**: the existing HTTP Basic Auth perimeter
  (`proxy.ts`) is unchanged and untouched; the internal RBAC layer gates
  every mutating deal-matching route the same way it gates every other
  resource.
- **Production verification completed**: build, full regression sweep,
  live test-data pass (with cleanup), and a follow-up production-readiness
  cleanup pass (security fix to a filter-injection risk, dead-code removal,
  accessibility fixes, duplication removal) — all before this tag was cut.

### Known limitations (by design, not oversights)
- **Match recomputation is manually triggered.** There is no scheduled job
  or automatic recompute — a broker/admin clicks "Recompute All Matches" on
  `/admin/matches`. Production currently has zero computed matches as of
  this writing, since nobody has triggered a recompute against real
  inquiries yet.
- **No automatic introductions or outbound communications of any kind.**
  The system never emails, messages, or otherwise contacts a buyer or
  seller, never changes an inquiry's status, and never creates a contract —
  every consequential action requires an explicit human step outside this
  system. This is a hard architectural boundary, not a placeholder.

---

## Phase 5.2 — Broker Match Workspace (PROPOSED — NOT IMPLEMENTED)

This section is a proposal only. No code, schema, or migration for Phase 5.2
has been written. It requires separate, explicit approval before any
implementation begins.

### Scope
1. Broker assignment to a match.
2. Expanded match workflow statuses: Suggested, Under Review, Approved,
   Contacted, Negotiating, Awaiting Documents, Closed Won, Closed Lost,
   Rejected, Archived.
3. Internal broker notes.
4. Match activity timeline and audit history.
5. Notifications for newly created high-priority matches.
6. AI-assisted recommendations and explanations — clearly separated from
   deterministic scores, always subject to human broker review.

### Safeguards (non-negotiable, carried over from Phase 5.1 and extended)
- No automatic introductions.
- No automatic email or WhatsApp outreach.
- No automatic inquiry status changes.
- No silent overwriting of original scores or explanations — the
  deterministic `compatibility_score`, `opportunity_score`, `priority_score`,
  `strengths`, `conflicts`, and `missing_information` fields from the
  matching engine are never mutated by anything in Phase 5.2 (broker notes,
  status changes, AI recommendations, and activity all live in *additional*
  fields/tables, never overwrite existing ones).
- All assignments, decisions, notes, and status transitions are auditable —
  every mutation produces an immutable activity-log entry with actor
  attribution.
- AI output must be visibly labeled as AI-generated in the UI, with a
  timestamp and the identity of who triggered it, and must never be
  presented as if it were part of the deterministic score.
- Deterministic scoring remains the source of truth unless a future,
  separately approved version changes that architecture.

### Proposed data-model additions
All additive; no existing `deal_matches` columns are altered or removed
except widening the `match_status` check constraint (see migration notes).

**`deal_matches` (altered, additive only):**
- Widen the `match_status` check constraint from the current 7 values
  (`suggested, under_review, approved, rejected, needs_information,
  introduced, archived`) to the 10 requested
  (`suggested, under_review, approved, contacted, negotiating,
  awaiting_documents, closed_won, closed_lost, rejected, archived`).
  **Open design question for approval**: how to handle the two values being
  retired (`needs_information`, `introduced`) — since production currently
  has zero rows, there's no live data to migrate, but the constraint change
  itself needs an explicit decision on whether to drop those values outright
  or keep them as deprecated-but-still-valid for backward compatibility.
- Add `assigned_at timestamptz` (nullable) — when the current
  `assigned_broker_id` was last set.
- Add `ai_generated_at timestamptz` and `ai_generated_by uuid references
  admin_users(id)` (both nullable) — audit metadata for the existing
  (currently unpopulated) `ai_recommendation`/`ai_reasoning` columns.

**New table `match_notes`:**
```
id          uuid primary key default gen_random_uuid()
match_id    uuid not null references deal_matches(id) on delete cascade
author_id   uuid references admin_users(id) on delete set null
note        text not null
created_at  timestamptz not null default now()
```
Append-only from the UI's perspective — no edit/delete exposed initially, to
preserve audit integrity (an admin-only correction path could be considered
later, itself logged in `match_activity`).

**New table `match_activity`** (the audit-history source of truth):
```
id          uuid primary key default gen_random_uuid()
match_id    uuid not null references deal_matches(id) on delete cascade
event_type  text not null   -- 'status_change' | 'broker_assigned' |
                            -- 'note_added' | 'ai_recommendation_generated'
actor_id    uuid references admin_users(id) on delete set null  -- null = system
from_value  text
to_value    text
metadata    jsonb not null default '{}'::jsonb
created_at  timestamptz not null default now()
```
Immutable — no `updated_at`, no update/delete API. Mirrors the existing
`inquiry_history` pattern already proven in this codebase.

**Notifications — two options, recommend Option A:**
- **Option A (recommended)**: add a nullable `deal_match_id uuid references
  deal_matches(id) on delete cascade` to the existing `reminders` table.
  Reuses the whole existing reminder/notification/Calendar infrastructure
  (Phase 3 Feature 12) instead of building a parallel system. Trade-off:
  reminders are due-date-oriented, so a "new high-priority match" alert
  needs a synthetic due date (e.g. now, or +24h) to surface urgently —
  a minor semantic stretch, but low implementation risk and high consistency
  with existing UI the desk already knows.
- **Option B (alternative)**: a purpose-built `match_notifications` table
  (`id, match_id, notified_admin_id, read_at, created_at`) if Option A's
  semantic mismatch proves confusing in practice.
- Either way: triggered only when a newly computed match's Priority Score
  crosses a configurable threshold **and** `match_status` is still
  `suggested` (nobody has looked at it yet) — prevents re-notifying on every
  recompute. Creating a notification must never itself change match state.

### Proposed UI components
- `match-broker-assignment.tsx` — assign/reassign broker control on the
  match detail page.
- `match-status-workflow.tsx` — the 10-state status selector, enforcing a
  configurable valid-transition table server-side (e.g. blocking a jump
  straight from Suggested to Closed Won).
- `match-notes-panel.tsx` — threaded, broker-attributed internal notes.
- `match-activity-timeline.tsx` — chronological, read-only feed of
  `match_activity` rows; mirrors the existing Activity Feed (Phase 3
  Feature 11) presentation pattern.
- `match-ai-recommendation-panel.tsx` — explicitly labeled "AI-Generated —
  Not a Deterministic Score," with a manual "Generate AI Recommendation"
  button (never auto-triggered), a visible timestamp, and "generated by"
  attribution. Rendered separately from, never replacing, the existing
  deterministic Match Explanation and Executive Match Summary panels.
- `/admin/matches` list and `/admin/matches/[id]` detail extended with an
  assigned-broker filter/column and the expanded status set.

### Proposed API routes
- `PATCH /api/admin/deal-matches/[id]/assign` — broker assignment.
- Extend `PATCH /api/admin/deal-matches/[id]` — accept the 10-state status
  enum, enforce valid transitions server-side, write one `match_activity`
  row per change.
- `GET`/`POST /api/admin/deal-matches/[id]/notes` — list/create notes.
- `GET /api/admin/deal-matches/[id]/activity` — read the activity timeline.
- `POST /api/admin/deal-matches/[id]/ai-recommendation` — explicit,
  human-triggered AI-recommendation generation; never called by recompute,
  a cron job, or any other automated path; logs to `match_activity`.
- Notification delivery via either the extended `reminders` API (Option A)
  or a new `match-notifications` route (Option B).

### Proposed permissions
- Reuses the existing `ManagedResource`/`canManage()` RBAC pattern
  (`lib/auth-helpers.ts`). Broker assignment and status transitions: same
  admin+broker access as current `"deal_matches"` permissions. Viewer role
  stays read-only throughout.
- **Open decision for approval**: whether AI-recommendation generation
  should be admin-only initially (a new, more sensitive capability) rather
  than admin+broker, until the feature is proven out in practice.

### Proposed phased testing plan
1. Migration verification against a local/staging copy — confirm the
   `match_status` constraint change and new tables apply cleanly (low risk:
   production currently has zero `deal_matches` rows).
2. Status-transition rule testing — valid transitions succeed, invalid
   transitions are rejected with a clear error.
3. RBAC regression — viewer blocked from every new mutating route; broker
   scoped correctly; the open admin-only-AI question resolved and tested.
4. Audit-trail verification — every mutating action (assignment, status
   change, note, AI-recommendation generation) produces exactly one
   `match_activity` row with correct actor attribution.
5. AI-recommendation safety testing — confirm it is never triggered by
   recompute or any automated path; confirm the UI always labels it
   "AI-Generated"; confirm the deterministic score/explanation fields are
   provably unchanged before and after a call.
6. Notification testing — confirm a qualifying match notifies exactly once
   (no duplicate spam across repeated recomputes); confirm creating or
   reading a notification never triggers any state change.
7. Full regression sweep of every existing Phase 3/4.1/5.1 route, following
   the same process used in every prior phase.
8. Production verification using the established create-test-data → verify
   → delete-test-data pattern, only after explicit approval, with no
   permanent test data left behind.

Implementation of Phase 5.2 does not begin until this proposal is separately
and explicitly approved.

---

## Note on Phase 5.2 numbering

The proposal above (Broker Match Workspace) remains unimplemented. A different
Phase 5.2 track — **Executive CRM** — was built instead, on the
`phase-5.2-executive-crm` branch, and is documented in its own stage files:

- `docs/phase-5.2-stage-5.2.1-company-contacts.md` (migration 013)
- `docs/phase-5.2-stage-5.2.2.1-client-support-center.md` (migration 014)
- `docs/phase-5.2-stage-5.2.3-notifications.md` (migration 015)

Two unrelated scopes therefore share the number 5.2. This note records the
divergence rather than renumbering either, since the branch name, commit
history, and stage documents all already use the existing numbers.

---

## Phase 5.3 — Company Intelligence: **DEPLOYED, PRODUCTION-VERIFIED**

Deterministic, explainable relationship health for every company, surfaced from
the company profile up to the executive dashboard. Built on the
`phase-5.2-executive-crm` branch and released to Production together with
Phase 5.2.

- **Status**: **deployed to Production and verified.** Passed the Phase 5.2 /
  5.3 Production Release Smoke Test (9/9, zero defects — see the release
  record below).
- **Release date**: 2026-08-30
- **Production commit**: `23f709b` ("docs: complete Phase 5.3 Company
  Intelligence documentation") — merged to `main` as a true fast-forward
  (`8155340..23f709b`), so `main`'s tip is byte-identical to the validated
  release commit.
- **Pull request**: #1, merged 2026-08-29T21:39:00Z.
- **Production deployment**: Vercel id `6160399974`, state `success`,
  2026-08-29T21:39:44Z. Live at `https://www.amberglobalenergy.in` (HTTP 200;
  `/admin` returns 401, Basic Auth perimeter enforced).
- **Commits**: `13e4e21` (Stage 5.3.1, inside a WIP commit that also preserved
  Phase 5.2 work), `d20552b` (Stages 5.3.2 + 5.3.3), `eb1d586` (Stage 5.3.4),
  `23f709b` (Phase 5.3 documentation).
- **Database migrations**: **none.** Phase 5.3 added no tables, columns,
  indexes, or migrations. Every metric and rule is derived at read time from
  data Phases 3–5.2 already capture. There is consequently no migration to run
  and no database rollback to plan.
- **New AI/LLM calls**: none. All scoring and all prose are deterministic and
  template-based.

### What shipped

| Stage | Scope | Document |
|---|---|---|
| 5.3.1A | `lib/company-intelligence.ts` — metrics, six health rules, three levels, tunable `COMPANY_HEALTH_RULES`, plus a briefing generator | `phase-5.3-stage-5.3.1-company-intelligence.md` |
| 5.3.1B | Company Health card on the company profile | same |
| 5.3.1C | Relationship Timeline card, reusing `buildActivityFeed()` unmodified with company-scoped arrays | same |
| 5.3.2 | Executive Briefing card — surfaced `computeCompanyBriefing()`, which 5.3.1A had left uncalled | `phase-5.3-stage-5.3.2-executive-briefing.md` |
| 5.3.3 | Health column in the company directory, via a portfolio rollup that delegates to the same per-company engine | `phase-5.3-stage-5.3.3-portfolio-health.md` |
| 5.3.4 | Company health merged into the executive alert stream, with the Executive Summary scoped to pipeline execution only | `phase-5.3-stage-5.3.4-executive-alert-integration.md` |

### Architectural rules held throughout

- **One scoring engine.** `computeCompanyHealth()` is the only place company
  health is evaluated. The profile card, the directory column, and the
  executive alert panel are all views over it, so they cannot disagree.
- **No parallel systems.** The timeline reuses `buildActivityFeed()`; the
  executive integration reuses `generateExecutiveAlerts()` and its severity
  sort; `/admin/activity` was never modified.
- **Fixed query counts.** Desk-wide surfaces fetch one query per entity type
  and group in memory. No surface issues a per-company follow-up query.
- **Existing UI preserved.** No page was redesigned. New cards match the
  existing card chrome; the directory's new column matches the existing badge
  scale; the only edits to existing UI copy are the Stage 5.3.4 wording changes
  that state the summary/alerts scope split.

### Known limitations (by design or deliberately deferred)

- **Inquiries are matched to companies by name**, not by key —
  `public.inquiries` still has no `company_id`. A renamed company or a typo
  silently detaches its inquiries from the score. The additive migration
  recommended in `phase-5.2-stage-5.2.1-company-contacts.md` is the root fix
  and is the single highest-value follow-up for this phase.
- **`dealMatches` is accepted, threaded, and grouped, but no rule reads it** —
  a deliberate placeholder for a future match-based rule.
- **Company timelines omit inquiry field-history events** — including them
  needs a scoped history fetcher to avoid an N+1.
- **Executive alert volume is uncapped**, which predates this phase but is
  added to by it.
- **The pipeline/relationship alert split relies on an `entityType`
  convention** rather than a stored discriminator field. Documented in the
  5.3.4 stage file; any future company-relationship rule must keep to that
  entity set.
- **No automated tests.** The engine is pure and highly testable, but this
  project has no test harness, so every stage was verified manually and via
  `npm run build` / `npm run lint`.

### Release gate — status at close-out

The five conditions this section originally listed as outstanding:

1. ✅ **Push the branch and open/merge a PR** — PR #1, fast-forward merged.
2. ✅ **Deploy and verify `/admin`, `/admin/companies`,
   `/admin/companies/[id]`, `/admin/activity`, `/api/admin/executive-analytics`
   against real data** — all covered by Preview validation Gates 1–6 and the
   Production smoke test.
3. ⚠️ **Partially met.** Read paths were walked exhaustively across seven
   Preview gates; **write paths could not be walked on a non-production
   environment** because Preview and Production share one Supabase project
   (risk R1). This was accepted as risk R3 and discharged instead by the
   Production smoke test. See "Accepted deviation" below.
4. ⚠️ **Not meaningfully testable yet.** `/admin` loaded in ~3s, but against a
   14-row dataset. The widened fetch set (11 desk-wide arrays) remains
   unmeasured at scale — carried into backlog item ④.
5. ✅ **Regression sweep** — Gate 6, scoped by evidence: every consumer of
   every module Phase 5.3 modified was validated, and `/admin/customers/[id]`,
   `lib/inquiry-helpers.ts` and the public site were diff-verified as
   unmodified by either phase.

### Accepted deviation: R3

Phase 5.2's write paths shipped to Production **without pre-production
execution**, because Preview and Production share one database and no isolated
staging environment exists. This was consciously accepted, recorded before
merge, and discharged by the smoke test below rather than waived. Establishing
environment isolation (audit finding H4) is the prerequisite for not repeating
this trade-off.

### Phase 5.2 / 5.3 Production Release Smoke Test

**Verdict: 9/9 PASS, zero defects.** Executed 2026-08-30, owner: release owner.
This test verified **Phase 5.2's write paths** — it is *not* a Stage 5.3.1C
test; Stage 5.3.1C (the Relationship Timeline) is read-only and was validated
in Preview Gates 2, 4 and 6.

| Step | Scope | Verdict |
|---|---|---|
| S1 | Activity Feed gained support-request + company-contact events | PASS |
| S2 | Company directory Health column | PASS |
| S3 | Executive alerts + summary scope split | PASS |
| S4 | Support queue renders | PASS |
| S5 | Support request created on `Test 2` (no contacts, by design) | PASS |
| S6 | 1 `sent` internal alert + 1 `skipped` acknowledgment | PASS |
| S7 | Internal alert received; `From: Amber Global Energy <support@…>` | PASS |
| S8 | Status → `closed`; `support_closed` / `skipped` row; `resolved_at` stamped | PASS |
| S9 | Full row reconciliation and integrity sweep | PASS |

Evidence: Resend `provider_message_id` `2aaad80d-3574-4799-9507-ba504b94cab5`
on the one real send. Final deltas against baseline — `support_requests` 3→4,
`support_notifications` 0→3, `emails` 0→1; the other eleven tables unchanged.
Integrity: zero `failed` rows, unique idempotency keys, zero orphans, zero
collateral writes. The pre-existing urgent `Test 2` request was confirmed
unmodified (`updated_at` 2026-08-03).

Risks **R3** (Phase 5.2 write paths unverified) and **F7** (notification
pipeline never executed) are **CLOSED** by this test.

### Residual risks and observations — carried forward, not defects

No defect was found in Phase 5.2 or Phase 5.3 across seven Preview gates and
nine smoke-test steps. The following remain open and are deliberately retained:

- **F9** — the client-facing status-email **`sent`** branch is unverified.
  Every client-facing notification skipped by design, because `Test 2` has no
  contacts. The send mechanism itself is proven (S6's internal alert traverses
  the same `sendAndRecord()` → `sendTransactionalEmail()` path); only
  client-recipient resolution on its success branch is untested.
- **R6** — 3 of 6 health rules (`unverified_with_active_deals`,
  `reminder_overdue`, `no_recent_activity`) remain unexercised. All are gated
  on `projects` / `contracts` / `reminders`, which are empty in Production.
- **R1** — Preview and Production share one Supabase project and one env-var
  set. Email variables are deliberately **Production-scope only** so Preview
  continues to fail safe.
- **F8** — `logToEmailTimeline()` is best-effort and swallows its own errors, so
  a notification can succeed while its Email Timeline entry silently fails.
  Automated notifications now appear in company Email Timelines alongside
  manually-logged entries, distinguished only by `logged_by: admin`.
- **F1 / F3 / F4 / F5** — cosmetic and spec-conforming: directory tooltip shows
  the first-evaluated rather than the level-driving reason; inquiry alerts are
  labelled with the company name recorded on the inquiry (this caused two
  misreadings during validation itself); *"unknown number of day(s)"* phrasing;
  deal values render without a currency symbol. **F4 and F5 originate in
  Phase 4.1, not 5.3.**
- **R4** — 11 pre-existing lint errors, including `Date.now()` during render at
  `app/page.tsx:180`. Predates this release; backlog item ③.
- Two permanent `ZZ-TEST` / `TEST` support requests remain in Production.
  Support requests have **no delete route** — closure is the only retirement
  path, and both are closed or inert.
