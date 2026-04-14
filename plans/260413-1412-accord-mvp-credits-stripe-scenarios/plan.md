---
title: "Accord MVP: Credits, Scenarios, History, Landing Page, SCORM/xAPI"
description: "Credit-based monetization + core product features to reach first paying individual manager user"
status: pending
priority: P0
effort: ~4-5 days
branch: main
tags: [mvp, stripe, credits, scenarios, scorm, xapi, landing-page]
created: 2026-04-13
---

# Accord MVP Implementation Plan

## Goal
Ship credit-based monetization + core UX improvements so individual managers can buy credits and practice difficult workplace conversations.

## Phases

| # | Phase | Status | Effort | Risk |
|---|-------|--------|--------|------|
| 0 | Self-Signup | completed | 2.5h | Low |
| 1 | Admin API Consolidation | pending | 2h | Low |
| 2 | Credit System (Stripe) | pending | 8h | Medium |
| 3 | Usage Gate | pending | 3h | Low |
| 4 | Scenario Library (15-20) | pending | 4h | Low |
| 5 | Session History Enhancements | pending | 3h | Low |
| 6 | Public Landing Page | pending | 6h | Low |
| 7 | SCORM + xAPI Export | pending | 4h | Medium |

## Critical Constraint
Vercel Hobby Plan = 12 serverless functions max. Currently at 12. Phase 1 consolidates 4 admin functions into 1 catch-all, freeing 3 slots for `api/billing/[...all].ts` and `api/export.ts`.

## Dependencies
- Phase 1 **must** complete before Phase 2 (need function slots)
- Phase 3 depends on Phase 2 (credits table must exist)
- Phases 4-7 are independent of each other but depend on Phase 1

## New DB Tables
- `credits` (userId FK, balance int, updatedAt)
- `webhook_events` (stripeEventId text PK, processedAt)
- Extend `user`: add `corporateTier` boolean default false

## New npm Packages
- `stripe` (Checkout + webhooks)
- `jszip` (SCORM ZIP generation)

## Architecture
```
Post-consolidation function count: 10/12
  api/chat.ts, api/evaluate.ts, api/feedback-on-transcript.ts,
  api/reports.ts, api/scenario.ts, api/transcribe.ts,
  api/voice-token.ts, api/auth/[...all].ts,
  api/admin/[...all].ts (NEW), api/billing/[...all].ts (NEW)
  + api/export.ts (NEW) = 11/12
```

## Phase Details
- [Phase 0: Self-Signup](./phase-00-self-signup.md)
- [Phase 1: Admin Consolidation](./phase-01-admin-consolidation.md)
- [Phase 2: Credit System](./phase-02-credit-system.md)
- [Phase 3: Usage Gate](./phase-03-usage-gate.md)
- [Phase 4: Scenario Library](./phase-04-scenario-library.md)
- [Phase 5: Session History](./phase-05-session-history.md)
- [Phase 6: Landing Page](./phase-06-landing-page.md)
- [Phase 7: SCORM + xAPI Export](./phase-07-scorm-xapi.md)
