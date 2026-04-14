# Phase 3: Update Persona Prompt

## Context Links
- Current persona prompt: `api/_lib/prompt-builder.ts` (lines 18-55)

## Overview
- **Priority:** P2
- **Status:** pending
- **Description:** Add GAIN-responsive behavioral rules to `buildPersonaSystemPrompt()` so the AI persona rewards gain framing and penalizes judgment language.

## Key Insights
- Currently the persona only reacts to factual assertions cited; it ignores HOW the giver frames things
- GAIN says the persona should become more receptive to aspirational framing and more defensive to labels/judgments
- This is additive -- 3 new rules appended to existing BEHAVIORAL RULES section

## Requirements

### Functional
Add 3 new behavioral rules to persona system prompt:
1. **GAIN FRAMING RESPONSE:** If giver frames feedback as shared aspiration ("I'd love for us to..."), become noticeably more open and engaged. If giver uses blame/complaint framing ("You always..."), become more guarded.
2. **JUDGMENT SENSITIVITY:** If giver uses character labels (positive or negative, e.g. "you're a rockstar" or "you're lazy"), push back or deflect. React better to specific behavioral observations.
3. **SOLUTION DIALOGUE:** If giver asks "what ideas do you have?" or "what would help?" before imposing a solution, engage genuinely and offer realistic suggestions. If giver dictates a solution without asking, become passive-resistant.

### Non-functional
- Keep total persona prompt under 600 tokens
- Rules should feel natural, not mechanical

## Related Code Files
- **Modify:** `api/_lib/prompt-builder.ts` (function `buildPersonaSystemPrompt`)

## Implementation Steps

1. Append rules 7, 8, 9 to the BEHAVIORAL RULES section in `buildPersonaSystemPrompt()`
2. Keep rules concise (1-2 sentences each)
3. Run `npx tsc --noEmit`
4. Manual test: run a practice session and verify persona responds differently to gain-framed vs judgment-framed feedback

## Todo List
- [ ] Add GAIN framing response rule (#7)
- [ ] Add judgment sensitivity rule (#8)
- [ ] Add solution dialogue rule (#9)
- [ ] Verify TypeScript compilation

## Success Criteria
- Persona becomes measurably more open when giver uses aspirational framing
- Persona pushes back on character labels
- Persona engages when asked for input before solutions are imposed

## Risk Assessment
- More behavioral rules may dilute persona's character fidelity; mitigate by keeping rules brief
- Different providers may weight these rules differently; acceptable variance
