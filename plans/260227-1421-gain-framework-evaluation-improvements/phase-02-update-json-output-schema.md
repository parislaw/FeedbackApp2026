# Phase 2: Update JSON Output Schema

## Context Links
- Current JSON shape: `api/_lib/prompt-builder.ts` (lines 129-138, 165-174)
- Current types: `types.ts` (lines 61-75)

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Add `gainAnalysis` block and change `recommendations` from `string[]` to structured objects in the evaluation prompt's requested JSON output.

## Key Insights
- The `gainAnalysis` block provides structured, machine-readable GAIN assessment separate from scores
- Structured recommendations with `issue`/`gainReframe` pairs are more actionable than plain strings
- Must update the JSON template in BOTH evaluation prompts

## Requirements

### Functional
- Add `gainAnalysis` object to requested JSON output:
  ```
  gainAnalysis: {
    goalFraming: 'gain-oriented' | 'pain-oriented' | 'missing'
    selfAcknowledgment: boolean
    judgmentsUsed: string[]       // exact phrases from transcript
    strongObservations: string[]  // exact phrases from transcript
    nextActionCompleteness: 'complete' | 'vague' | 'missing'
    checkInScheduled: boolean
  }
  ```
- Change `recommendations` from `string[]` to structured:
  ```
  recommendations: Array<{
    issue: string        // what they actually said/did
    gainReframe: string  // verbatim GAIN-style alternative phrasing
  }>
  ```

### Non-functional
- JSON schema must be parseable by all 3 providers
- Keep output instructions concise to avoid confusing AI

## Architecture
- Extract `GAIN_JSON_SCHEMA` constant containing the JSON template string
- Use in both `buildEvaluationPrompt()` and `buildFeedbackOnTranscriptPrompt()`

## Related Code Files
- **Modify:** `api/_lib/prompt-builder.ts`
- **Modify:** `api/evaluate.ts` (increase `max_tokens` from 1500 to 2500)
- **Modify:** `api/feedback-on-transcript.ts` (increase `max_tokens` from 1500 to 2500)

## Implementation Steps

1. Create `GAIN_JSON_SCHEMA` constant with the full JSON template including `gainAnalysis` and structured `recommendations`
2. Replace the JSON template in `buildEvaluationPrompt()` with `${GAIN_JSON_SCHEMA}`
3. Replace the JSON template in `buildFeedbackOnTranscriptPrompt()` with `${GAIN_JSON_SCHEMA}`
4. In `api/evaluate.ts`, change Anthropic `max_tokens: 1500` to `max_tokens: 2500`
5. In `api/feedback-on-transcript.ts`, change Anthropic `max_tokens: 1500` to `max_tokens: 2500`
6. Run `npx tsc --noEmit`

## Todo List
- [ ] Create `GAIN_JSON_SCHEMA` constant
- [ ] Update `buildEvaluationPrompt()` JSON template
- [ ] Update `buildFeedbackOnTranscriptPrompt()` JSON template
- [ ] Increase max_tokens in `evaluate.ts`
- [ ] Increase max_tokens in `feedback-on-transcript.ts`
- [ ] Verify TypeScript compilation

## Success Criteria
- Both prompts request identical JSON shape
- JSON template is DRY (single constant)
- max_tokens sufficient for new output size
- Compiles without errors

## Risk Assessment
- `judgmentsUsed` and `strongObservations` arrays may be empty if AI can't extract verbatim phrases; acceptable, frontend handles empty arrays
- Structured recommendations may occasionally produce low-quality `gainReframe`; acceptable for v1
