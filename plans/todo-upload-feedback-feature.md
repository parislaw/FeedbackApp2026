# Todo: Upload Recording / Transcript → Feedback & Recommendations

User story: A user can upload an audio recording or meeting transcript of a feedback session or meeting and receive feedback with recommendations about the feedback and how things could be phrased better.

---

## Backend

- [x] Add `POST /api/transcribe`: accept audio (base64 + mimeType), return `{ transcript: string }`. 5 MB limit, rate limit. (Existing; added `audio/webm`.)
- [x] Add `POST /api/feedback-on-transcript`: accept `{ provider, transcript }` (string or `{ role, text }[]`). New prompt `buildFeedbackOnTranscriptPrompt` in `api/_lib/prompt-builder.ts`; returns `EvaluationReport`. Rate limited.
- [x] Reuse `EvaluationReport` type; prompt returns valid JSON.

## Frontend

- [x] Entry point: “Upload for feedback” button on dashboard (App.tsx).
- [x] New view `UploadFeedbackView`: audio file upload and/or transcript paste or .txt file; single “Analyze” submit.
- [x] If audio: call `/api/transcribe` then `/api/feedback-on-transcript` with transcript string. If transcript only: call `/api/feedback-on-transcript` only.
- [x] Loading state during transcribe/analyze; display report via `EvaluationReport` with “Analyze another” and “Practice Another Scenario”.

## Quality & docs

- [x] Smoke tests for `transcribe` and `feedback-on-transcript` in `api/smoke.test.ts`; `docs/api-reference.md` updated for both endpoints.
