# Phase 5: Session History Enhancements

## Context
- Parent: [plan.md](./plan.md)
- Dependencies: Phase 4 (scenario categories for display)
- Current state: `ReportHistoryPage.tsx` exists with KPI strip, report list, transcript viewer

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** ~3h
- **Description:** Extend ReportHistoryPage with GAIN dimension breakdown per report, inline SVG score trend line (last 10 sessions), improved card layout with category/difficulty metadata.

## Key Insights
- `ReportHistoryPage.tsx` already has `KpiStrip`, `TranscriptSection`, `displayScore`, `normalizeScore`
- `evaluation.giverScores` contains per-dimension scores with `dimension`, `score`, `band`, `feedback`
- `evaluation.gainAnalysis` has GAIN framework breakdown
- Data is already stored in `reports` table as jsonb — no new API needed
- File is currently 293 lines — will need to extract components to stay under 200

## Requirements
### Functional
- Each report card shows: scenario title, category badge, date, overall score, mini dimension bars
- GAIN dimension breakdown visible on card (collapsed by default, expand on click)
- Score trend line: inline SVG showing overall score for last 10 sessions
- Trend line shows improvement/decline arrow indicator
- Click-through to full transcript + evaluation report (already works)

### Non-functional
- No new API calls — all data already in GET /api/reports response
- Trend line renders as inline SVG (no chart library dependency)
- Keep total component code under 200 lines per file

## Architecture

### Component Extraction
Current `ReportHistoryPage.tsx` (293 lines) needs splitting:
```
components/
  report-history/
    ReportHistoryPage.tsx    — main page, list + routing (~100 lines)
    KpiStrip.tsx             — KPI cards (~50 lines)
    ReportCard.tsx           — individual report card with dimensions (~80 lines)
    ScoreTrendLine.tsx       — inline SVG trend chart (~60 lines)
    TranscriptSection.tsx    — collapsible transcript viewer (~70 lines)
    report-display-utils.ts  — normalizeScore, displayScore, scoreColorClass (~30 lines)
```

### Score Trend Line (Inline SVG)
```typescript
// components/report-history/ScoreTrendLine.tsx
// Props: scores: number[] (last 10, chronological order)
// Renders: 200x60 SVG with polyline + dots
// Shows: trend arrow (up/down/flat) based on linear regression slope

function ScoreTrendLine({ scores }: { scores: number[] }) {
  const width = 200, height = 60, padding = 8;
  const plotW = width - padding * 2;
  const plotH = height - padding * 2;

  const points = scores.map((s, i) => ({
    x: padding + (i / Math.max(scores.length - 1, 1)) * plotW,
    y: padding + plotH - (s / 100) * plotH,
  }));

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  // ... render SVG
}
```

### Dimension Mini Bars
```typescript
// Inside ReportCard.tsx
// Show top 4 GAIN dimensions as small horizontal bars
// Color: green >= 75, blue >= 50, amber < 50
function DimensionBars({ scores }: { scores: EvaluationScore[] }) {
  return (
    <div className="flex flex-col gap-1 mt-2">
      {scores.slice(0, 4).map(s => (
        <div key={s.dimension} className="flex items-center gap-2 text-xs">
          <span className="w-24 truncate text-slate-500">{s.dimension}</span>
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
            <div className={`h-full rounded-full ${barColor(s.score)}`}
                 style={{ width: `${s.score}%` }} />
          </div>
          <span className="w-6 text-right text-slate-400">{s.score}</span>
        </div>
      ))}
    </div>
  );
}
```

## Related Code Files

### Create
- `components/report-history/ReportHistoryPage.tsx` — refactored main page
- `components/report-history/KpiStrip.tsx` — extracted KPI component
- `components/report-history/ReportCard.tsx` — enhanced card with dimension bars
- `components/report-history/ScoreTrendLine.tsx` — inline SVG trend
- `components/report-history/TranscriptSection.tsx` — extracted transcript viewer
- `components/report-history/report-display-utils.ts` — shared display helpers

### Delete
- `components/ReportHistoryPage.tsx` — replaced by directory

### Modify
- `App.tsx` — update import path for ReportHistoryPage

## Implementation Steps

1. **Create `components/report-history/` directory**

2. **Extract `report-display-utils.ts`**
   - Move `normalizeScore`, `displayScore`, `scoreColorClass` from ReportHistoryPage
   - Export all functions

3. **Extract `KpiStrip.tsx`**
   - Move `KpiStrip` component from ReportHistoryPage
   - Import utils from `report-display-utils`

4. **Extract `TranscriptSection.tsx`**
   - Move `TranscriptSection` + `HighlightedText` components
   - Keep existing functionality unchanged

5. **Create `ScoreTrendLine.tsx`**
   - Accept `scores: number[]` prop
   - Render inline SVG polyline chart (200x60px)
   - Add trend indicator: compare first half avg to second half avg
   - Green upward arrow if improving, red downward if declining, gray dash if flat

6. **Create `ReportCard.tsx`**
   - Enhanced version of current report list item
   - Show: title, category badge (from scenario config lookup), date, overall score
   - Collapsible dimension mini bars (click to expand)
   - Duration/provider metadata

7. **Rewrite `ReportHistoryPage.tsx`**
   - Import all extracted components
   - Add `ScoreTrendLine` between KpiStrip and report list
   - Use `ReportCard` for each report
   - Keep existing detail view (click → full evaluation report)

8. **Update `App.tsx`**
   - Change import: `from './components/report-history/ReportHistoryPage'`

9. **Scenario category lookup**
   - Import `SCENARIOS` from constants
   - Build a `Map<string, ScenarioConfig>` by scenario ID
   - Use to show category badge on ReportCard (fallback to "Custom" if not found)

## Todo List
- [ ] Create report-history/ directory
- [ ] Extract report-display-utils.ts
- [ ] Extract KpiStrip.tsx
- [ ] Extract TranscriptSection.tsx
- [ ] Create ScoreTrendLine.tsx with inline SVG
- [ ] Create ReportCard.tsx with dimension bars
- [ ] Rewrite ReportHistoryPage.tsx using extracted components
- [ ] Update App.tsx import path
- [ ] Verify all files < 200 lines
- [ ] Visual check: trend line renders correctly
- [ ] Visual check: dimension bars display correctly
- [ ] Existing report detail view still works

## Success Criteria
- Report list shows enhanced cards with dimension breakdown
- Score trend line visible for users with 2+ reports
- Trend direction indicator (up/down/flat) is accurate
- All existing functionality preserved (detail view, transcript, KPIs)
- Each component file < 200 lines
- No new npm dependencies

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| SVG rendering issues | Broken trend chart | Test with 1, 2, 5, 10 data points |
| Scenario ID not found in config | Missing category badge | Fallback to "Custom" label |
| Score normalization mismatch | Wrong trend data | Reuse existing normalizeScore for consistency |

## Security Considerations
- No security impact — display-only changes on already-authorized data
- No new API endpoints

## Next Steps
- Phase 6 (Landing Page) can show sample report/trend as social proof
