---
title: "GAIN Framework Evaluation Improvements"
description: "Align scoring rubrics, persona behavior, and report UI with the GAIN (Goal-Actions-Impacts-Next) feedback framework"
status: pending
priority: P1
effort: 6h
branch: main
tags: [gain-framework, evaluation, prompt-engineering, frontend]
created: 2026-02-27
---

# GAIN Framework Evaluation Improvements

## Summary

The current evaluation system uses 6 generic scoring dimensions that partially overlap with GAIN but miss key elements: goal framing quality, giver self-acknowledgment, observation-vs-judgment separation, dialogue quality, and structured next actions. The persona prompt also doesn't reward/penalize GAIN-aligned behavior.

## Affected Files

| File | Change Type |
|------|-------------|
| `api/_lib/prompt-builder.ts` | Modify (primary) |
| `types.ts` | Modify |
| `components/EvaluationReport.tsx` | Modify |
| `api/evaluate.ts` | Minor (increase max_tokens) |
| `api/feedback-on-transcript.ts` | Minor (increase max_tokens) |

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [Update scoring rubrics](./phase-01-update-scoring-rubrics.md) | pending | 1.5h |
| 2 | [Update JSON output schema](./phase-02-update-json-output-schema.md) | pending | 1h |
| 3 | [Update persona prompt](./phase-03-update-persona-prompt.md) | pending | 0.5h |
| 4 | [Update TypeScript types](./phase-04-update-types.md) | pending | 0.5h |
| 5 | [Update frontend display](./phase-05-update-frontend-display.md) | pending | 2.5h |

## Dependencies

- Phase 2 depends on Phase 1 (rubrics define what JSON to request)
- Phase 4 depends on Phase 2 (types match JSON shape)
- Phase 5 depends on Phase 4 (frontend consumes types)
- Phase 3 is independent (persona prompt is separate)

## Execution Order

Phases 1+3 in parallel, then 2, then 4, then 5.

## Risks

- AI providers may not consistently produce the new JSON shape (mitigate: keep structure flat, test with all 3 providers)
- Larger JSON output may hit Anthropic's 1500 max_tokens limit (mitigate: increase to 2500 in evaluate.ts)
- Existing conversations in progress will get old-format reports until page refresh (acceptable)
