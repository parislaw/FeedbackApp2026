# Phase 5: Update Frontend Display

## Context Links
- Current report component: `components/EvaluationReport.tsx` (100 lines)
- Current types: `types.ts`
- Upload view: `components/UploadFeedbackView.tsx` (uses same `EvaluationReport` component)

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Update `EvaluationReport.tsx` to display `gainAnalysis` block and render structured `recommendations` with issue/reframe pairs. Both scenario-based and upload-based evaluation flows use the same component, so a single update covers both.

## Key Insights
- `EvaluationReport.tsx` is currently 100 lines; adding gainAnalysis display will push it near 200. Consider extracting sub-components if needed.
- The `UploadFeedbackView.tsx` renders `<EvaluationReport>` directly, so no changes needed there.
- Score card labels should now show GAIN letter tags (G, A, I, N) for recognition.

## Requirements

### Functional
1. **Score cards:** Prepend GAIN letter to dimension label where applicable:
   - "Goal framing" -> "[G] Goal Framing"
   - "Observation quality" -> "[A] Observation Quality"
   - "Giver self-acknowledgment" -> "[A] Self-Acknowledgment"
   - "Impact articulation" -> "[I] Impact Articulation"
   - "Next action quality" -> "[N] Next Actions"
   - "Dialogue quality" -> "Dialogue Quality" (no letter, cross-cutting)

2. **GAIN Analysis panel** (new section after score cards, before summary):
   - Show `goalFraming` as a colored badge: green=gain-oriented, amber=pain-oriented, red=missing
   - Show `selfAcknowledgment` as check/cross icon
   - Show `judgmentsUsed` as a list of quoted phrases with amber highlight
   - Show `strongObservations` as a list of quoted phrases with green highlight
   - Show `nextActionCompleteness` as colored badge
   - Show `checkInScheduled` as check/cross icon
   - If `gainAnalysis` is undefined (old report), hide this section entirely

3. **Structured recommendations:** Change from plain text cards to two-column cards:
   - Left: "What was said:" with `issue` text
   - Right: "GAIN reframe:" with `gainReframe` text in blue highlight
   - Handle backward compat: if `recommendations[0]` is a string, render as before

### Non-functional
- Keep `EvaluationReport.tsx` under 200 lines; extract `GainAnalysisPanel` component if needed
- Maintain existing color scheme and design language
- Responsive on mobile

## Architecture
- If file exceeds 200 lines, extract:
  - `components/gain-analysis-panel.tsx` -- renders the gainAnalysis block
  - `components/gain-recommendation-card.tsx` -- renders a single recommendation

## Related Code Files
- **Modify:** `components/EvaluationReport.tsx`
- **Create (if needed):** `components/gain-analysis-panel.tsx`
- **Create (if needed):** `components/gain-recommendation-card.tsx`

## Implementation Steps

1. Update import to include `GainAnalysis`, `GainRecommendation` from `../types`
2. Add GAIN letter prefix mapping for dimension labels
3. Add GAIN Analysis panel section (conditionally rendered when `gainAnalysis` exists)
4. Update recommendations rendering to handle both `string` and `GainRecommendation` formats
5. If total lines exceed 200, extract sub-components
6. Run `npx tsc --noEmit` to verify full compilation
7. Run `npm run build` to verify production build

## Todo List
- [ ] Update score card labels with GAIN letters
- [ ] Create GAIN Analysis panel section
- [ ] Update recommendations to show issue/reframe pairs
- [ ] Handle backward compatibility (string recommendations)
- [ ] Extract sub-components if needed for 200-line limit
- [ ] Verify TypeScript compilation
- [ ] Verify production build

## Success Criteria
- GAIN Analysis panel renders correctly with all 6 fields
- Structured recommendations show side-by-side issue/reframe
- Old-format reports (no gainAnalysis, string recommendations) still render
- File stays under 200 lines (with extraction if needed)
- Builds successfully

## Risk Assessment
- `gainAnalysis` may have unexpected null fields from AI; add defensive checks (optional chaining, fallback values)
- Mobile layout for two-column recommendation cards may need stacking; use responsive grid

## Security Considerations
- `judgmentsUsed` and `strongObservations` contain user transcript text; render as text content (no `dangerouslySetInnerHTML`)
