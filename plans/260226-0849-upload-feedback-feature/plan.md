# Upload Feedback Feature - Implementation Plan

**Status:** Ready to Implement
**Created:** 2026-02-26
**Scope:** Audio transcription + feedback analysis + UI for uploads

---

## Architecture Decisions

✓ **File Storage:** In-memory (no persistence) — transcribed text kept in request
✓ **File Types:** Audio files (mp3, wav, m4a) + text paste-in
✓ **UI Flow:** Separate "Upload Feedback" tab (independent from chat scenario)
✓ **Transcript Mode:** `/api/feedback-on-transcript` analyzes without scenario context

---

## Implementation Phases

| Phase | Task | Owner | Status |
|-------|------|-------|--------|
| 1 | Backend: `POST /api/transcribe` | — | Pending |
| 2 | Backend: `POST /api/feedback-on-transcript` | — | Pending |
| 3 | Frontend: Upload UI Component | — | Pending |
| 4 | Frontend: API Integration | — | Pending |
| 5 | Quality: Tests & Documentation | — | Pending |

---

## Phase 1: Backend - Transcribe API

**File:** `api/transcribe.ts`

**Endpoint:** `POST /api/transcribe`

**Request:**
```json
{
  "provider": "Gemini|Anthropic|OpenAI",
  "audio": "base64-encoded-audio-data",
  "audioMimeType": "audio/mp3|audio/wav|audio/m4a"
}
```

**Response:**
```json
{
  "transcript": "Full transcribed text from audio",
  "status": 200
}
```

**Implementation Steps:**
1. Validate method (POST) & rate limit
2. Validate request: `provider`, `audio` base64, `audioMimeType`
3. Decode base64 to buffer
4. Route to provider via factory:
   - **Gemini**: Use `speech-to-text` (check if available)
   - **Anthropic/OpenAI**: Use whisper API or fallback
5. Return transcript text + status 200
6. Handle errors: invalid audio, provider errors, size limits (5MB)

**Notes:**
- Use provider factory pattern from `api/_lib/provider-factory.ts`
- Enforce 5MB size limit on audio
- Return clear error messages (no API key exposure)

---

## Phase 2: Backend - Feedback on Transcript API

**File:** `api/feedback-on-transcript.ts`

**Endpoint:** `POST /api/feedback-on-transcript`

**Request:**
```json
{
  "provider": "Gemini|Anthropic|OpenAI",
  "transcript": "The transcribed text or user-provided text"
}
```

**Response:**
```json
{
  "feedback": {
    "scores": {
      "clarity": { score: 0-3, feedback: "..." },
      "specificity": { score: 0-3, feedback: "..." },
      ...
    },
    "whatWorked": ["item1", "item2"],
    "whatBrokeDown": ["item1", "item2"],
    "phrasingSuggestions": ["suggestion1"],
    "recommendations": ["rec1"]
  },
  "status": 200
}
```

**Implementation Steps:**
1. Validate method (POST) & rate limit
2. Validate request: `provider`, `transcript` string (non-empty)
3. Build evaluation prompt:
   - No scenario context (unlike `/api/evaluate`)
   - Focus on feedback quality, phrasing clarity, structure
   - GAIN framework adapted for feedback giver analysis
4. Route to provider via factory
5. Parse JSON response → feedback object
6. Return feedback + status 200
7. Handle errors: empty transcript, provider errors, parsing failures

**Notes:**
- Create new prompt in `api/_lib/prompt-builder.ts`: `buildFeedbackAnalysisPrompt()`
- Similar to `buildEvaluationPrompt()` but no scenario/role context
- Expect AI to return structured JSON with scores & suggestions
- Reuse `EvaluationReport` type or create new type if needed

---

## Phase 3: Frontend - Upload UI Component

**File:** `components/FileUploadForm.tsx`

**Features:**
1. **Tabs:** Audio Upload | Paste Transcript
2. **Audio Tab:**
   - File input (accept: `.mp3, .wav, .m4a`)
   - Show file name & size when selected
   - Disable upload if >5MB
3. **Paste Tab:**
   - Textarea for pasting transcript
   - Character count
4. **Common:**
   - Provider selector dropdown
   - "Analyze" button (disabled if no input/provider)
   - Loading state during processing

**Implementation Steps:**
1. Create component with tabs (use existing UI patterns)
2. Implement file input with validation (type, size)
3. Implement textarea with character counter
4. Bind to parent state (parent passes `onAnalyze` callback)
5. Style with existing Tailwind patterns

---

## Phase 4: Frontend - Integration & Display

**Files:** `App.tsx`, `api-client-service.ts`

**App.tsx Changes:**
1. Add "Upload Feedback" state/tab alongside existing tabs
2. Add `<FileUploadForm />` when tab active
3. Manage upload state: loading, error, feedback result
4. Display feedback report using `EvaluationReport` component (or adapt if needed)

**API Client Changes:**
1. Add `uploadForFeedback()` method:
   ```typescript
   async uploadForFeedback(provider: AIProvider, audioOrText: AudioInput | string): Promise<FeedbackResult>
   ```
2. If audio:
   - Convert to base64
   - Call `/api/transcribe`
   - Call `/api/feedback-on-transcript` with result
3. If text:
   - Call `/api/feedback-on-transcript` directly
4. Return feedback object

---

## Phase 5: Quality - Tests & Docs

**Tests:**
- `api/transcribe.test.ts` - Mock audio, validate endpoint
- `api/feedback-on-transcript.test.ts` - Mock transcript, validate JSON parsing
- `components/FileUploadForm.test.tsx` - File input, tab switching

**Docs:**
- Update `./docs/api-endpoints.md` with new endpoints
- Update `./docs/deployment-guide.md` if needed (Vercel functions)
- Add comments to new API functions

---

## Type Definitions to Add

**File:** `types.ts`

```typescript
interface UploadFeedbackRequest {
  provider: AIProvider;
  transcript: string;
}

interface FeedbackScore {
  score: 0 | 1 | 2 | 3;
  feedback: string;
}

interface FeedbackResult {
  scores: {
    clarity: FeedbackScore;
    specificity: FeedbackScore;
    grounding: FeedbackScore;
    impact: FeedbackScore;
    emotionalRegulation: FeedbackScore;
    commitment: FeedbackScore;
  };
  whatWorked: string[];
  whatBrokeDown: string[];
  phrasingSuggestions: string[];
  recommendations: string[];
}
```

---

## Success Criteria

- [ ] Both APIs accept requests, validate inputs, return proper errors
- [ ] Audio transcription works for all 3 providers
- [ ] Feedback analysis returns structured JSON
- [ ] Frontend upload form submits both audio & text
- [ ] Feedback displays correctly in UI
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Rate limiting enforced on both APIs

---

## Dependencies & Notes

- Use existing `provider-factory` pattern
- Reuse `response-helpers`, `rate-limit` modules
- Audio encoding: base64 (matches voice interface pattern)
- Prompt builder: add new function, don't modify existing

---

## Next: Proceed to Phase 1?
