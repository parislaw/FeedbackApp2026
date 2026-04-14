# Phase 4: Update TypeScript Types

## Context Links
- Current types: `types.ts` (lines 61-75)
- New JSON schema: Phase 2

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Update `EvaluationReport` interface in `types.ts` to match the new JSON output shape with `gainAnalysis` and structured `recommendations`.

## Key Insights
- `EvaluationReport` is used by: `api/evaluate.ts`, `api/feedback-on-transcript.ts`, `services/api-client-service.ts`, `components/EvaluationReport.tsx`, `App.tsx`
- Must be backward-compatible during rollout: make `gainAnalysis` optional so old cached reports don't crash
- `recommendations` changes from `string[]` to `GainRecommendation[]` -- this is a breaking change; update all consumers

## Requirements

### Functional
Add new types:
```typescript
export interface GainAnalysis {
  goalFraming: 'gain-oriented' | 'pain-oriented' | 'missing';
  selfAcknowledgment: boolean;
  judgmentsUsed: string[];
  strongObservations: string[];
  nextActionCompleteness: 'complete' | 'vague' | 'missing';
  checkInScheduled: boolean;
}

export interface GainRecommendation {
  issue: string;
  gainReframe: string;
}
```

Update `EvaluationReport`:
```typescript
export interface EvaluationReport {
  giverScores: EvaluationScore[];
  summary: {
    whatWorked: string[];
    whatBrokeDown: string[];
    highestLeverageImprovement: string;
  };
  gainAnalysis?: GainAnalysis;
  recommendations: GainRecommendation[];
}
```

### Non-functional
- `gainAnalysis` marked optional (`?`) for backward compat
- All consuming files must compile

## Related Code Files
- **Modify:** `types.ts`

## Implementation Steps

1. Add `GainAnalysis` interface after `EvaluationScore`
2. Add `GainRecommendation` interface after `GainAnalysis`
3. Update `EvaluationReport` to add optional `gainAnalysis` and change `recommendations` type
4. Run `npx tsc --noEmit` -- expect errors in `EvaluationReport.tsx` (resolved in Phase 5)
5. Temporarily verify compile by checking only backend files if needed

## Todo List
- [ ] Add `GainAnalysis` interface
- [ ] Add `GainRecommendation` interface
- [ ] Update `EvaluationReport` interface
- [ ] Verify compilation (may have frontend errors until Phase 5)

## Success Criteria
- Types accurately represent the new JSON output
- Backend files compile
- `gainAnalysis` is optional for backward compatibility

## Risk Assessment
- Changing `recommendations` type will cause compile errors in `EvaluationReport.tsx` -- resolved in Phase 5
- If Phase 5 isn't done in same deploy, frontend will crash on new reports. Mitigate: deploy phases 1-5 together.

## Security Considerations
- No security impact; types are compile-time only
