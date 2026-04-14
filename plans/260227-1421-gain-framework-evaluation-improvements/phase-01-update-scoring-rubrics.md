# Phase 1: Update Scoring Rubrics

## Context Links
- Current prompts: `api/_lib/prompt-builder.ts` (lines 95-175)
- GAIN framework reference: sidebar in `App.tsx` (lines 228-256)

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Replace the 6 generic scoring dimensions with 6 GAIN-aligned dimensions in both `buildEvaluationPrompt()` and `buildFeedbackOnTranscriptPrompt()`.

## Key Insights
- "Standard clarity" and "Specificity of assertions" collapse into "Goal framing (G)" and "Observation quality (A)"
- "Emotional regulation" is removed as standalone -- its spirit lives in "Dialogue quality" and "Observation quality"
- Both evaluation prompts share identical rubrics; DRY by extracting a shared rubric string constant

## Requirements

### Functional
- Replace existing 6 rubrics with these 6 GAIN-aligned rubrics (0-3 each):
  1. **Goal framing (G):** 0=no goal stated, 1=pain/avoid framing ("stop doing X"), 2=benefit for recipient ("this will help you..."), 3=shared aspirational framing ("we both want...")
  2. **Observation quality (A):** 0=only character judgments, 1=mix of judgments and observations, 2=mostly behavioral observations, 3=precise observations with zero flattering/negative character labels
  3. **Giver self-acknowledgment (A):** 0=blamed recipient entirely, 1=token acknowledgment, 2=named own specific contribution to the problem, 3=asked "what could I do differently from my side?"
  4. **Impact articulation (I):** 0=none, 1=vague ("it causes problems"), 2=one concrete impact with example, 3=layered impact (team + business) tied to specific actions
  5. **Next action quality (N):** 0=none, 1=vague ("try harder"), 2=specific ask with action, 3=asked recipient ideas first + who/what/when + check-in scheduled
  6. **Dialogue quality:** 0=monologue, 1=one surface question, 2=back-and-forth rhythm, 3=asked perspective first + incorporated responses into plan

### Non-functional
- Rubric text must fit within provider token limits
- Keep prompt under ~800 tokens total (current is ~350)

## Architecture
- Extract `GAIN_SCORING_RUBRIC` as a const string in `prompt-builder.ts`
- Use in both `buildEvaluationPrompt()` and `buildFeedbackOnTranscriptPrompt()`

## Related Code Files
- **Modify:** `api/_lib/prompt-builder.ts`

## Implementation Steps

1. Add `const GAIN_SCORING_RUBRIC` string at top of `prompt-builder.ts` containing the 6 new rubric definitions
2. Replace the inline rubric block in `buildEvaluationPrompt()` (lines 116-122) with `${GAIN_SCORING_RUBRIC}`
3. Replace the inline rubric block in `buildFeedbackOnTranscriptPrompt()` (lines 152-158) with `${GAIN_SCORING_RUBRIC}`
4. Update the "ALSO EVALUATE" section in `buildEvaluationPrompt()` to remove the redundant "Was the GAIN framework followed?" bullet (now implicit in rubrics)
5. Update the "ALSO EVALUATE" section in `buildFeedbackOnTranscriptPrompt()` to match
6. Run `npx tsc --noEmit` to verify compilation

## Todo List
- [ ] Create `GAIN_SCORING_RUBRIC` constant
- [ ] Update `buildEvaluationPrompt()` to use new rubrics
- [ ] Update `buildFeedbackOnTranscriptPrompt()` to use new rubrics
- [ ] Verify TypeScript compilation

## Success Criteria
- Both evaluation prompts use identical GAIN rubrics
- No duplicate rubric text (DRY)
- TypeScript compiles
- Rubric text is clear enough for all 3 AI providers to score consistently

## Risk Assessment
- AI may interpret rubric descriptors differently across providers; mitigate with concrete examples in rubric text
- Longer prompt increases latency ~200ms; acceptable
