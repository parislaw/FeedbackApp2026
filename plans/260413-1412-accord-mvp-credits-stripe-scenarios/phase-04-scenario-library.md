# Phase 4: Scenario Library (15-20 Scenarios)

## Context
- Parent: [plan.md](./plan.md)
- Dependencies: Phase 1 (function consolidation)
- Current state: 6 scenarios in `constants.ts` with inline personas

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** ~4h
- **Description:** Expand from 6 to 18 scenarios across 5 categories. Static TypeScript config (no DB). New scenario selection screen with category filtering replaces current grid.

## Key Insights
- Current `constants.ts` has `PERSONAS` object + `SCENARIOS` array — same pattern scales
- Existing `Scenario` type in `types.ts` already has all needed fields except `category` and `durationMin`
- `ScenarioCard.tsx` exists but needs category badge + difficulty indicator
- Current MainApp shows all scenarios in a flat grid — need category tabs/filter

## Requirements
### Functional
- 18 scenarios across 5 categories:
  - **Performance** (4): underperformer, star retention, PIP conversation, comeback story
  - **Feedback** (4): constructive criticism, positive reinforcement, upward feedback, peer feedback
  - **Conflict** (3): peer disagreement, manager-report tension, cross-team blame
  - **Career** (4): development conversation, promotion denial, role change, resignation response
  - **Change** (3): restructure announcement, process change pushback, layoff survivor
- Each scenario has: id, title, category, difficulty, durationMin, description, context, persona, assertions, personaBackground, successCriteria
- Category filter on scenario selection screen
- Difficulty badge on scenario cards
- Estimated duration shown on cards

### Non-functional
- Static config — no DB queries
- Keep existing 6 scenarios unchanged (backward compat with saved reports)

## Architecture

### Extended Type
```typescript
// Add to types.ts
export type ScenarioCategory = 'performance' | 'feedback' | 'conflict' | 'career' | 'change';

export interface ScenarioMeta {
  category: ScenarioCategory;
  durationMin: number;
  successCriteria: string[];
}
```

### File Structure
Split `constants.ts` (currently 170 lines, will grow to ~500+):
```
constants/
  scenarios/
    index.ts              — re-exports SCENARIOS array
    performance.ts        — 4 performance scenarios
    feedback.ts           — 4 feedback scenarios
    conflict.ts           — 3 conflict scenarios
    career.ts             — 4 career scenarios
    change.ts             — 3 change scenarios
  personas.ts             — all persona definitions
  index.ts                — re-exports everything
```

### Scenario Shape
```typescript
export interface ScenarioConfig extends Scenario {
  category: ScenarioCategory;
  durationMin: number;
  successCriteria: string[];
}
```

### Scenario Selection Screen
Replace the current flat grid in `MainApp.tsx` with a dedicated component:
```typescript
// components/ScenarioSelectionScreen.tsx
// - Category tabs/pills at top (All, Performance, Feedback, Conflict, Career, Change)
// - Grid of ScenarioCards filtered by selected category
// - Each card shows: title, difficulty badge, duration, category tag
// - Search/filter by title (optional, nice-to-have)
```

## Related Code Files

### Create
- `constants/personas.ts` — all persona definitions (moved from constants.ts)
- `constants/scenarios/performance.ts` — 4 scenarios
- `constants/scenarios/feedback.ts` — 4 scenarios
- `constants/scenarios/conflict.ts` — 3 scenarios
- `constants/scenarios/career.ts` — 4 scenarios
- `constants/scenarios/change.ts` — 3 scenarios
- `constants/scenarios/index.ts` — aggregates all scenarios
- `constants/index.ts` — re-exports SCENARIOS + PERSONAS
- `components/ScenarioSelectionScreen.tsx` — category-filtered selection UI

### Modify
- `types.ts` — add `ScenarioCategory`, `ScenarioConfig` (extends Scenario)
- `components/MainApp.tsx` — replace inline grid with `ScenarioSelectionScreen`
- `components/ScenarioCard.tsx` — add category badge, difficulty color, duration

### Delete
- `constants.ts` — replaced by `constants/` directory

## Implementation Steps

1. **Extend types** (`types.ts`)
   - Add `ScenarioCategory` type
   - Add `category`, `durationMin`, `successCriteria` to `Scenario` interface (extend, don't break)

2. **Create `constants/personas.ts`**
   - Move all 6 existing personas from `constants.ts`
   - Add 12 new personas for new scenarios
   - Each persona: id, name, roleDescription, difficulty, characteristics, voiceExamples

3. **Create scenario category files**
   - `constants/scenarios/performance.ts`: keep existing `missed-deadlines` + `quiet-quitter`, add 2 new
   - `constants/scenarios/feedback.ts`: keep existing `code-quality` + `positive-reinforcement`, add 2 new
   - `constants/scenarios/conflict.ts`: keep existing `star-performer-blindspot`, add 2 new
   - `constants/scenarios/career.ts`: 4 new scenarios
   - `constants/scenarios/change.ts`: 3 new scenarios
   - Each file exports array of `ScenarioConfig`

4. **Create `constants/scenarios/index.ts`**
   - Import all category arrays
   - Export combined `SCENARIOS` array
   - Export `SCENARIO_CATEGORIES` for UI labels

5. **Create `constants/index.ts`**
   - Re-export `SCENARIOS`, `PERSONAS`, `SCENARIO_CATEGORIES`

6. **Update imports across codebase**
   - `MainApp.tsx`: `import { SCENARIOS } from '../constants'` (same path works with index.ts)
   - Verify all other imports of `SCENARIOS` or `PERSONAS`

7. **Delete old `constants.ts`**

8. **Create `components/ScenarioSelectionScreen.tsx`**
   - Props: `onSelect(scenario)`, `onCreateCustom()`, `practiceMode`, `setPracticeMode`
   - State: `selectedCategory: ScenarioCategory | 'all'`
   - Category pills at top
   - Filtered grid of ScenarioCards
   - "Create Custom" button

9. **Update `components/ScenarioCard.tsx`**
   - Add category tag (colored pill)
   - Show difficulty as colored dot (green/yellow/red)
   - Show estimated duration
   - Add `successCriteria` count indicator

10. **Update `components/MainApp.tsx`**
    - Replace inline scenario grid with `<ScenarioSelectionScreen />`
    - Pass through callbacks

## New Scenarios (12 additional)

### Performance
- **PIP Conversation**: Telling someone they're on a performance improvement plan. Hard difficulty.
- **Comeback Story**: Recognizing someone who turned around poor performance. Easy.

### Feedback
- **Upward Feedback**: Giving feedback to your own manager about their meeting habits. Hard.
- **Peer Code Review**: Addressing repeated sloppy PRs from a peer you respect. Medium.

### Conflict
- **Peer Disagreement**: Two engineers disagree on architecture decision. Medium.
- **Cross-Team Blame**: Another team's delay is impacting your sprint. Medium.

### Career
- **Development Conversation**: Helping a report identify growth areas. Easy.
- **Promotion Denial**: Explaining why someone isn't getting promoted this cycle. Hard.
- **Role Change**: Discussing a lateral move to a different team. Medium.
- **Resignation Response**: A valued team member just told you they're leaving. Medium.

### Change
- **Restructure Announcement**: Breaking news of a team reorganization. Hard.
- **Process Change**: Explaining new mandatory code review process to resistant team. Medium.
- **Layoff Survivor**: Supporting someone whose close colleague was just laid off. Hard.

## Todo List
- [ ] Add ScenarioCategory + extended fields to types.ts
- [ ] Create constants/personas.ts with all personas
- [ ] Create 5 scenario category files with 18 total scenarios
- [ ] Create constants/scenarios/index.ts aggregator
- [ ] Create constants/index.ts re-export
- [ ] Delete old constants.ts
- [ ] Update all imports
- [ ] Create ScenarioSelectionScreen.tsx with category filter
- [ ] Update ScenarioCard.tsx with badges
- [ ] Update MainApp.tsx to use ScenarioSelectionScreen
- [ ] Verify existing 6 scenarios have unchanged IDs (backward compat)
- [ ] Compile check: `npx tsc --noEmit`

## Success Criteria
- 18 scenarios visible in selection screen
- Category filter works correctly
- Existing 6 scenarios unchanged (same IDs, same behavior)
- Saved reports with old scenario IDs still display correctly
- Each scenario file < 200 lines
- No compile errors

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Changing scenario IDs | Breaks saved reports | Keep exact same IDs for existing 6 |
| constants.ts import paths break | Build failure | Update all import paths, compile check |
| Scenario quality | Poor practice experience | Write realistic personas with specific voice examples |

## Security Considerations
- No security impact — static config, no user data
- Scenario content is non-sensitive workplace practice material

## Next Steps
- Scenarios feed into Phase 5 (history shows scenario metadata) and Phase 7 (SCORM export per scenario)
