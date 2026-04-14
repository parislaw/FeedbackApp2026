# Flores Speech Act Analysis Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Flores speech act analysis panel to the evaluation report that identifies assertions, evaluates assessment quality, and checks whether the conversation addressed the receiver's underlying concern.

**Architecture:** Extend the existing `GAIN_JSON_SCHEMA` constant in `prompt-builder.ts` with a `floresAnalysis` block (parallel to `gainAnalysis`). Add corresponding TypeScript interfaces to `types.ts`. Create a new `flores-analysis-panel.tsx` component. Render it conditionally in `EvaluationReport.tsx` after the GAIN panel — same pattern used for GAIN.

**Tech Stack:** TypeScript, React, Tailwind CSS, Vercel serverless functions

---

## Background: Fernando Flores Speech Acts

From *Conversations for Action* (Flores/Winograd):

- **Assertion**: A factual, verifiable claim. The speaker is accountable for its truth. Example: *"You missed 3 of the last 4 standup meetings."*
- **Assessment**: An opinion/judgment. Not true/false on its own. A *well-formed* assessment requires: (1) an explicit standard, (2) behavioral evidence (assertions), and (3) a domain ("good/bad *for* X"). Example of ungrounded assessment: *"You're unreliable."* Example of well-grounded: *"Based on the missed deadlines this quarter, I assess your current workload may be unsustainable for consistent delivery."*
- **Concern**: Every conversation is driven by an underlying care. Feedback that doesn't address what the *receiver* actually cares about fails to create action, even if technically correct.

---

## Files to Modify

| File | Change |
|------|--------|
| `api/_lib/prompt-builder.ts` | Add `FLORES_ANALYSIS_INSTRUCTION` const; extend `GAIN_JSON_SCHEMA` with `floresAnalysis` block |
| `types.ts` | Add `FloresAssertion`, `FloresAssessment`, `FloresAnalysis` interfaces; add optional `floresAnalysis?` to `EvaluationReport` |
| `components/EvaluationReport.tsx` | Import and conditionally render `<FloresAnalysisPanel>` after GAIN panel |
| `components/flores-analysis-panel.tsx` | New component (create) |

---

## Task 1: Extend `GAIN_JSON_SCHEMA` and add Flores prompt instruction

**File:** `api/_lib/prompt-builder.ts`

### Step 1: Add `FLORES_ANALYSIS_INSTRUCTION` constant after `GAIN_SCORING_RUBRIC` (line 25)

Insert this block after the `GAIN_SCORING_RUBRIC` const and before `GAIN_JSON_SCHEMA`:

```typescript
// Flores speech act analysis instruction appended to both evaluation prompts
const FLORES_ANALYSIS_INSTRUCTION = `
FLORES SPEECH ACT ANALYSIS (from Conversations for Action):
- Assertions: identify factual, verifiable claims the giver made. Mark isVerifiable=true if the claim could be confirmed with evidence (e.g. meeting logs, code history). Mark false if it is inherently subjective.
- Assessments: identify opinions or judgments. For each assess:
  - hasStandard: did the giver reference an explicit expectation or benchmark?
  - hasEvidence: is the judgment backed by observable assertions/facts?
  - groundingQuality: "well-grounded" if both present, "partially-grounded" if one, "ungrounded" if neither
- Concern: did the conversation surface and address what the RECEIVER actually cares about (not just what the giver wants to fix)? concernNotes should explain what concern was present or absent.`;
```

### Step 2: Extend `GAIN_JSON_SCHEMA` to include `floresAnalysis`

Replace the current `GAIN_JSON_SCHEMA` const (lines 28-44) with:

```typescript
const GAIN_JSON_SCHEMA = `{
  "giverScores": [{ "dimension": "string", "score": 0, "feedback": "string" }],
  "summary": {
    "whatWorked": ["string"],
    "whatBrokeDown": ["string"],
    "highestLeverageImprovement": "string"
  },
  "gainAnalysis": {
    "goalFraming": "gain-oriented | pain-oriented | missing",
    "selfAcknowledgment": false,
    "judgmentsUsed": ["exact phrase from transcript"],
    "strongObservations": ["exact phrase from transcript"],
    "nextActionCompleteness": "complete | vague | missing",
    "checkInScheduled": false
  },
  "floresAnalysis": {
    "assertionsFound": [{ "text": "exact quote", "isVerifiable": true }],
    "assessmentsFound": [{ "text": "exact quote", "hasStandard": true, "hasEvidence": true, "groundingQuality": "well-grounded | partially-grounded | ungrounded" }],
    "concernAddressed": false,
    "concernNotes": "string"
  },
  "recommendations": [{ "issue": "string", "gainReframe": "string" }]
}`;
```

### Step 3: Append `${FLORES_ANALYSIS_INSTRUCTION}` to both eval prompts

In `buildEvaluationPrompt()`, append `${FLORES_ANALYSIS_INSTRUCTION}` between `${GAIN_SCORING_RUBRIC}` and the `ALSO EVALUATE` section:

```typescript
return `Evaluate the following feedback conversation...
...
${GAIN_SCORING_RUBRIC}
${FLORES_ANALYSIS_INSTRUCTION}

ALSO EVALUATE:
...`;
```

Do the same in `buildFeedbackOnTranscriptPrompt()`.

### Step 4: Verify compilation

```bash
npx tsc --noEmit
```

Expected: no errors.

### Step 5: Commit

```bash
git add api/_lib/prompt-builder.ts
git commit -m "feat(eval): add Flores speech act analysis instruction and JSON schema"
```

---

## Task 2: Add TypeScript interfaces

**File:** `types.ts`

### Step 1: Add three new interfaces after `GainRecommendation` (line 79)

```typescript
export interface FloresAssertion {
  text: string;         // exact quote from transcript
  isVerifiable: boolean; // could be confirmed with objective evidence
}

export interface FloresAssessment {
  text: string;           // exact quote from transcript
  hasStandard: boolean;   // giver referenced an explicit expectation/benchmark
  hasEvidence: boolean;   // judgment backed by observable assertions
  groundingQuality: 'well-grounded' | 'partially-grounded' | 'ungrounded';
}

export interface FloresAnalysis {
  assertionsFound: FloresAssertion[];
  assessmentsFound: FloresAssessment[];
  concernAddressed: boolean;
  concernNotes: string; // what concern was present or absent
}
```

### Step 2: Add optional `floresAnalysis?` to `EvaluationReport` after `gainAnalysis?`

```typescript
export interface EvaluationReport {
  giverScores: EvaluationScore[];
  summary: {
    whatWorked: string[];
    whatBrokeDown: string[];
    highestLeverageImprovement: string;
  };
  gainAnalysis?: GainAnalysis;
  floresAnalysis?: FloresAnalysis;  // optional for backward compat
  recommendations: GainRecommendation[];
}
```

### Step 3: Verify compilation

```bash
npx tsc --noEmit
```

Expected: no errors.

### Step 4: Commit

```bash
git add types.ts
git commit -m "feat(types): add FloresAssertion, FloresAssessment, FloresAnalysis interfaces"
```

---

## Task 3: Create `flores-analysis-panel.tsx` component

**File:** `components/flores-analysis-panel.tsx` (new file)

### Step 1: Create the component

```tsx
import React from 'react';
import { FloresAnalysis } from '../types';

interface FloresAnalysisPanelProps {
  floresAnalysis: FloresAnalysis;
}

// Badge for assessment grounding quality
const GroundingBadge = ({ quality }: { quality: FloresAnalysis['assessmentsFound'][number]['groundingQuality'] }) => {
  const styles: Record<typeof quality, string> = {
    'well-grounded': 'bg-green-100 text-green-800 border-green-200',
    'partially-grounded': 'bg-amber-100 text-amber-800 border-amber-200',
    'ungrounded': 'bg-red-100 text-red-800 border-red-200',
  };
  const labels: Record<typeof quality, string> = {
    'well-grounded': 'Well-Grounded', 'partially-grounded': 'Partially Grounded', 'ungrounded': 'Ungrounded'
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[quality]}`}>
      {labels[quality]}
    </span>
  );
};

export const FloresAnalysisPanel: React.FC<FloresAnalysisPanelProps> = ({ floresAnalysis }) => (
  <div className="border border-slate-200 rounded-2xl p-6 mb-8 bg-slate-50">
    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
      Speech Act Analysis <span className="font-normal text-slate-400 normal-case tracking-normal">(Flores)</span>
    </h3>

    {/* Assertions */}
    <div className="mb-5">
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
        Assertions <span className="font-normal text-slate-400 normal-case">— factual, verifiable claims</span>
      </p>
      {floresAnalysis.assertionsFound.length === 0 ? (
        <p className="text-xs text-red-600 italic">No factual assertions identified in this conversation.</p>
      ) : (
        <div className="space-y-2">
          {floresAnalysis.assertionsFound.map((a, i) => (
            <div key={i} className="flex items-start gap-2 bg-white rounded-lg px-3 py-2 border border-slate-100">
              <span className={`mt-0.5 text-xs font-bold shrink-0 ${a.isVerifiable ? 'text-green-600' : 'text-amber-600'}`}>
                {a.isVerifiable ? '✓' : '~'}
              </span>
              <span className="text-sm text-slate-700 italic">"{a.text}"</span>
              <span className={`ml-auto shrink-0 text-xs px-1.5 py-0.5 rounded border ${a.isVerifiable ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                {a.isVerifiable ? 'Verifiable' : 'Subjective'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Assessments */}
    <div className="mb-5">
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
        Assessments <span className="font-normal text-slate-400 normal-case">— opinions/judgments</span>
      </p>
      {floresAnalysis.assessmentsFound.length === 0 ? (
        <p className="text-xs text-slate-500 italic">No assessments identified.</p>
      ) : (
        <div className="space-y-2">
          {floresAnalysis.assessmentsFound.map((a, i) => (
            <div key={i} className="bg-white rounded-lg px-3 py-2 border border-slate-100 space-y-1.5">
              <p className="text-sm text-slate-700 italic">"{a.text}"</p>
              <div className="flex flex-wrap items-center gap-2">
                <GroundingBadge quality={a.groundingQuality} />
                <span className={`text-xs px-1.5 py-0.5 rounded border ${a.hasStandard ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                  {a.hasStandard ? '✓ Standard' : '✗ No Standard'}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded border ${a.hasEvidence ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                  {a.hasEvidence ? '✓ Evidence' : '✗ No Evidence'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Concern */}
    <div>
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Receiver Concern Addressed</p>
      <div className="bg-white rounded-lg px-3 py-3 border border-slate-100 flex gap-3">
        <span className={`text-lg shrink-0 ${floresAnalysis.concernAddressed ? 'text-green-600' : 'text-red-500'}`}>
          {floresAnalysis.concernAddressed ? '✓' : '✗'}
        </span>
        <p className="text-sm text-slate-600">{floresAnalysis.concernNotes}</p>
      </div>
    </div>
  </div>
);
```

### Step 2: Verify compilation

```bash
npx tsc --noEmit
```

Expected: no errors.

### Step 3: Commit

```bash
git add components/flores-analysis-panel.tsx
git commit -m "feat(ui): add FloresAnalysisPanel component for speech act analysis"
```

---

## Task 4: Integrate panel into `EvaluationReport.tsx`

**File:** `components/EvaluationReport.tsx`

### Step 1: Add import

Add to the existing imports at the top of `EvaluationReport.tsx`:

```tsx
import { FloresAnalysisPanel } from './flores-analysis-panel';
```

Also add `FloresAnalysis` to the type import from `../types` (not strictly required since the panel handles its own types, but good for the prop type if needed).

### Step 2: Add conditional render after `<GainAnalysisPanel>`

Current code (around line 67):
```tsx
{report.gainAnalysis && <GainAnalysisPanel gainAnalysis={report.gainAnalysis} />}
```

Add immediately after:
```tsx
{report.floresAnalysis && <FloresAnalysisPanel floresAnalysis={report.floresAnalysis} />}
```

### Step 3: Verify TypeScript compilation

```bash
npx tsc --noEmit
```

Expected: no errors.

### Step 4: Verify production build

```bash
npm run build
```

Expected: builds successfully (ignore chunk size warning — pre-existing).

### Step 5: Commit and push

```bash
git add components/EvaluationReport.tsx
git commit -m "feat(ui): render FloresAnalysisPanel in EvaluationReport"
git push
```

---

## Success Criteria

- [ ] Both evaluation prompts instruct the AI to identify assertions, assess grounding of assessments, and evaluate concern-addressing
- [ ] `floresAnalysis` field appears in AI JSON output (test with any live conversation)
- [ ] `FloresAnalysisPanel` renders correctly: assertions with verifiability tags, assessments with grounding badges + standard/evidence chips, concern section with notes
- [ ] Old reports without `floresAnalysis` still render (panel hidden when undefined)
- [ ] All files under 200 lines
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes

## Risk Assessment

- AI may not always find assertions or assessments (empty arrays are valid — panel handles them)
- AI may produce partial `floresAnalysis` objects; use optional chaining in panel (`floresAnalysis?.assertionsFound ?? []`)
- Prompt token budget: adding `FLORES_ANALYSIS_INSTRUCTION` adds ~120 tokens — within safe limits

## Notes / Open Questions

- None — scope is self-contained and backward-compatible
