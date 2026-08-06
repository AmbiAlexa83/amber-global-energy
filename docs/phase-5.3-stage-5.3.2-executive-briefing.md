# Phase 5.3 — Stage 5.3.2: Executive Briefing on the Company Profile

## Purpose

Turn the company health report into a plain-English paragraph an executive can
read without interpreting badges and tiles — "what is the state of this
relationship, in words." Deterministic and template-based: every clause traces
back to a specific metric or triggered rule, and nothing is generated,
speculative, or AI-produced.

## Background

`computeCompanyBriefing()` was written in Stage 5.3.1A alongside
`computeCompanyHealth()`, but only the health engine was wired up in 5.3.1B —
the briefing had **no caller in the codebase**. This stage surfaced it. The
engine itself was not modified.

## Existing functionality reused

- `computeCompanyBriefing()` (`lib/company-intelligence.ts`) — used exactly
  as authored in 5.3.1A; not one line changed.
- The already-computed `CompanyHealthReport` — the briefing takes the health
  report as its second argument rather than re-evaluating the rules, so the
  six health rules are evaluated **once per render**, not twice.
- The already-assembled `CompanyIntelligenceInput` — hoisted into a single
  `intelligenceInput` const on the company page and shared by both engine
  calls. Previously it was inlined into the sole `computeCompanyHealth()` call.
- `app/admin/_components/company-health-card.tsx` card chrome — the briefing
  card copies its container (`rounded-[24px] border-white/10 bg-[#071A2D]/90
  p-4`), section-label typography, and nested `#050B16/70` row background, so
  it reads as one more card in the existing stack.
- **No new queries.** The briefing consumes the same arrays the page had
  already fetched for the health card.

## Database schema

**No schema changes.**

## Rendering

`CompanyBriefing` is `{ summary: string; highlights: string[] }`.

- `summary` renders as prose in a single nested row. It is composed of four
  sentences: current activity, verification + primary-contact status, last
  recorded interaction, and overall health level (with the leading triggered
  reason appended verbatim as its own sentence when the level is not
  `healthy`).
- `highlights` render as small subordinate chips.

The card is a server component (no `"use client"`), read-only, with no local
state.

## Created files

- `app/admin/_components/company-briefing-card.tsx` — the Executive Briefing
  card; presentation only, composes no prose of its own (no sentence assembly,
  no pluralization, no threshold checks)
- `docs/phase-5.3-stage-5.3.2-executive-briefing.md` — this document

## Modified files

- `app/admin/companies/[id]/page.tsx` — four additive edits: import
  `computeCompanyBriefing` and the `CompanyIntelligenceInput` type, import the
  card, hoist the shared `intelligenceInput` const, and mount
  `<CompanyBriefingCard>` between the health card and the timeline

## Manual testing checklist

- [ ] Open a company with active contracts, projects, open support requests,
      and upcoming reminders — confirm the summary lists all of them, in
      words, with correct counts and correct singular/plural.
- [ ] Open a company with none of the above — confirm the summary's "has no
      active contracts, projects, open support requests, or upcoming
      reminders on file" fallback sentence.
- [ ] Confirm an urgent-support count renders as e.g. "two open support
      requests (one urgent)".
- [ ] Toggle verification between verified / pending / unset — confirm the
      status sentence changes wording accordingly.
- [ ] Add and remove a primary contact — confirm both the summary sentence and
      the corresponding highlight chip flip.
- [ ] Trigger any health flag — confirm the leading reason appears as its own
      sentence after the health-level sentence, and reads as grammatical
      English (reasons are authored as complete sentences, deliberately not
      grafted into a "due to …" clause).
- [ ] Confirm the briefing's health level always agrees with the health card
      badge directly above it.
- [ ] Confirm no layout shift or restyle anywhere else on the page.
- [ ] Run `npm run lint` and `npm run build` — confirm no new failures.

## Rollback plan

- **Application code**: remove the `<CompanyBriefingCard>` mount and the
  `computeCompanyBriefing` call from `app/admin/companies/[id]/page.tsx`, and
  delete the card. `computeCompanyBriefing()` returns to being uncalled; the
  health card is unaffected.
- **Database**: nothing to roll back.

## Known limitations

- **Highlights restate the summary.** `highlights` is
  `activityParts + primary-contact status + health.reasons` — facts the summary
  sentence and the health card above already display. They are rendered as
  small subordinate chips rather than dropped, so the engine's full output is
  surfaced; showing summary only is a one-line removal if the redundancy is
  unwanted.
- **Template prose, not generated prose.** Sentence structure is fixed. This
  is deliberate (auditability), but it means the briefing reads the same way
  for every company and cannot summarize anything the four sentences don't
  already cover.
- **`HEALTH_LEVEL_LABELS` is duplicated.** `lib/company-intelligence.ts` keeps
  a private copy for the briefing's prose, separate from the UI's labels in
  `app/admin/_components/company-health-badge.tsx` (added in Stage 5.3.3).
  They happen to have identical values. They were left separate so UI copy
  does not become coupled to sentence generation; if they ever need to diverge,
  nothing breaks, but if one is edited the other will not follow.
- **No test coverage** — as with 5.3.1, verified manually.
