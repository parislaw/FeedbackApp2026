# Plan: 100-Point Scoring System

**Status:** Pending
**Goal:** Expand evaluation scores from 0–3 to 0–100 with refined breakpoints, richer feedback granularity, and updated UI.

---

## Context

Current scoring uses 0–3 per GAIN dimension (too coarse — 4 possible values). A 0–100 scale enables finer differentiation, better progress tracking, and more meaningful KPI averages. Breakpoints and rubrics need redesigning to match the new scale.

---

## Score Rubric (0–100 per dimension)

| Range | Label | Meaning |
|-------|-------|---------|
| 0–39 | Needs Work | Dimension largely absent or counterproductive |
| 40–59 | Developing | Partial attempt, key elements missing |
| 60–74 | Proficient | Solid execution with minor gaps |
| 75–89 | Strong | Consistent, effective delivery |
| 90–100 | Exemplary | Masterful, nuanced, nothing to add |

---

## AI Prompt Changes

**File:** `api/_lib/prompt-builder.ts`

Update the evaluation prompt to:
- Score each GAIN dimension 0–100 (integer)
- Provide specific point deductions with reasoning
- Reference observable transcript evidence for each score
- Overall score = weighted average of dimensions

Example prompt addition:
```
Score each dimension from 0 to 100 using this rubric:
0-39: Needs Work | 40-59: Developing | 60-74: Proficient | 75-89: Strong | 90-100: Exemplary

Deduct points for: ungrounded assessments (-10 each), judgments instead of observations (-15 each),
missing next action (-20), no goal framing (-15), no self-acknowledgment (-10).
```

---

## Type Changes

**File:** `types.ts`

`EvaluationScore.score` stays `number` — no type change needed. Range simply expands from 0–3 to 0–100.

---

## UI Color Thresholds

All components using score colors need updated thresholds:

| Old (0–3) | New (0–100) | Color |
|-----------|-------------|-------|
| ≥ 2.5 | ≥ 75 | green |
| ≥ 1.5 | ≥ 50 | blue |
| < 1.5 | < 50 | amber |

---

## Files to Modify

| File | Change |
|------|--------|
| `api/_lib/prompt-builder.ts` | Update scoring rubric in evaluation prompt |
| `components/EvaluationReport.tsx` | Update score display (show `/100`), update color thresholds |
| `components/ReportHistoryPage.tsx` | Update `scoreColorClass()` thresholds + KPI avg display |
| `components/AdminReportsTab.tsx` | Update `heatmapColor()` + `scoreColorClass()` thresholds |
| `components/report-utils.test.ts` | Update test expectations for new thresholds |

---

## Backward Compatibility

Old reports in DB have scores 0–3. They will display incorrectly (0–3 shown as if out of 100).

**Mitigation options (choose one):**
- **A. Score normalization on read:** if `score <= 3`, multiply × 33.3 before display — simple, no DB migration
- **B. DB migration:** backfill `score * 33` for all existing rows — clean but irreversible
- **C. Version flag:** store `scoreVersion: 1 | 2` in evaluation JSONB — most precise, most work

**Recommendation: Option A** — normalize on read in a shared util. Minimal risk, reversible.

---

## Verification

1. Run a practice session → evaluation returns 0–100 scores
2. Old reports display correctly via normalization
3. KPI strip shows correct averages out of 100
4. Heatmap color bands correct (red < 40, yellow 40–74, green ≥ 75)
5. `npx tsc --noEmit` clean
6. `npm test` passes
7. `vercel --prod`
