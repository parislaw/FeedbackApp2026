# Agent Division: Feedback App Priorities Plan

Work from the prioritized plan is split into **3 agents**. Agent 1 should run first; Agents 2 and 3 can run in parallel after Agent 1 is done (or Agent 2 can start once P0 is complete).

---

## Agent 1: Voice security and hardening (Priority 0 + Priority 1 voice)

**Scope:** Secure voice credentials and harden VoiceInterface.

**Tasks:**

1. **Priority 0 – Ephemeral token (critical)**  
   - In `api/voice-token.ts`: stop returning `apiKey`. Use Google’s API to issue a short-lived token (e.g. cached content / ephemeral token); return only `{ token, expiresAt }` (or equivalent). Never send `GEMINI_API_KEY` in the response.  
   - In `components/VoiceInterface.tsx`: consume `token` from the response and pass it to `GoogleGenAI`; remove any use of `apiKey` from the response.  
   - Verify: DevTools → Network → voice mode → response has no raw API key.

2. **Priority 1 – Voice hardening**  
   - In `VoiceInterface.tsx`:  
     - **createBlob:** Clamp float samples to [-1, 1] before converting to Int16 (avoid overflow).  
     - **Cleanup:** In the `useEffect` return, disconnect `scriptProcessor` (and clear ref if used) in addition to closing session and stopping stream.  
     - **Base64:** Optionally validate base64 before decode and handle decode failure without crashing.  
     - **Token refresh (optional):** If session can exceed token TTL, add refresh (e.g. at 80% of TTL).

**Deliverables:**  
- `api/voice-token.ts` returns only a token.  
- `components/VoiceInterface.tsx` uses token only, with clamping, cleanup, and optional base64/token-refresh improvements.

**Dependencies:** None. Do this first.

---

## Agent 2: API rate limiting and tests (Priority 1 remainder)

**Scope:** Rate limit all API routes and add basic automated tests.

**Tasks:**

1. **API rate limiting**  
   - Add a rate-limit helper (e.g. in `api/_lib/rate-limit.ts` or in `api/_lib/response-helpers.ts`). Use per-IP (or per-origin) limits; use a simple in-memory or Vercel-friendly store.  
   - Apply to: `/api/chat`, `/api/evaluate`, `/api/scenario`, `/api/voice-token`.  
   - Document the chosen limits (e.g. 60 req/min per IP).

2. **Basic automated tests**  
   - Add Vitest (or agreed test runner) and scripts in `package.json`.  
   - **Voice-token:** Unit tests that (1) success path returns a token and no `apiKey` in response body, (2) missing env returns 500, (3) no API key ever in response.  
   - **Smoke tests:** For `chat`, `evaluate`, `scenario`: POST with minimal valid body; expect 200 or defined error; assert no credential in response.

**Deliverables:**  
- `api/_lib/rate-limit.ts` (or equivalent) and all four handlers using it.  
- Test suite (e.g. under `api/` or `tests/`) and `npm run test` (or similar).

**Dependencies:** Best to run after **Agent 1** so voice-token tests validate the new token-only behavior. Can start rate-limit work in parallel.

---

## Agent 3: Provider selector, streaming, and scenarios (Priority 2 subset)

**Scope:** Provider selector in UI, text chat streaming, and more preset scenarios + tuning. No auth/DB in this agent.

**Tasks:**

1. **Provider selector in UI**  
   - In `App.tsx`: add state for selected provider (e.g. `AIProvider`). Pass it into `getAIService(provider)`.  
   - Add a control (dropdown or tabs) in the header or scenario area for Gemini / Anthropic / OpenAI.  
   - Voice can remain Gemini-only.

2. **Text chat streaming**  
   - In `api/chat.ts`: stream the model response (Vercel supports streaming).  
   - In `services/api-client-service.ts`: in `ApiChatSession.sendMessage`, consume the stream and return the full message (or expose a streaming callback).  
   - In `components/ChatInterface.tsx`: show streamed chunks (append to the last message as they arrive). Start with one provider (e.g. Gemini) if easier, then extend.

3. **More preset scenarios and tuning**  
   - Add more entries to `constants.ts` (new scenarios with personas).  
   - Refine custom-scenario generation in `api/scenario.ts` and `api/_lib/prompt-builder.ts` (better prompts, difficulty balancing).

**Deliverables:**  
- Provider selector in UI; chat and evaluate use selected provider.  
- Streaming chat for at least one provider; ChatInterface shows incremental response.  
- Additional scenarios in `constants.ts` and improved scenario/prompt logic.

**Dependencies:** None on Agent 1 or 2. Can run in parallel with Agent 2 after Agent 1 is done.

---

## Summary

| Agent | Focus                          | Run order   |
|-------|---------------------------------|------------|
| **1** | Voice security + voice hardening| First      |
| **2** | Rate limiting + tests          | After 1    |
| **3** | Provider selector + streaming + scenarios | In parallel with 2 (after 1) |

Auth, persistence, saved scenarios, export, and analytics stay out of this split and can be planned as a follow-up.

---

## How to Deploy Parallel Agents

Use one of the approaches below. **Work context** for this project (per `.claude/rules/orchestration-protocol.md`):

- **Work context path:** `FeedbackApp2026` (repo root; use your absolute path if spawning tasks)
- **Reports path:** `{work_context}/plans/reports/`
- **Plans path:** `{work_context}/plans/`

### Option 1: Task tool (subagent spawn)

If your environment has a **Task** tool for spawning subagents:

1. **Run Agent 1 first** (blocking):
   - Spawn one task with the full **Agent 1** scope (voice security + hardening).
   - In the task prompt, include:  
     `Work context: <path-to-FeedbackApp2026>. Reports: <path-to-FeedbackApp2026>/plans/reports/. Plans: <path-to-FeedbackApp2026>/plans/`
   - Wait for it to finish and merge/commit before starting 2 and 3.

2. **Run Agent 2 and Agent 3 in parallel** (after Agent 1 is done):
   - Spawn **two tasks at once**: one with the **Agent 2** brief (rate limiting + tests), one with the **Agent 3** brief (provider selector + streaming + scenarios).
   - In each task prompt, include the same work context, reports path, and plans path.
   - When both finish, integrate (merge branches or apply changes, run full build/tests).

**Example task prompts** (replace `WORK_CONTEXT` with your repo path):

- Agent 1:  
  `Implement Agent 1 from plans/agent-division-feedback-app-priorities.md: voice ephemeral token (api/voice-token.ts, VoiceInterface.tsx) and voice hardening (createBlob clamp, scriptProcessor cleanup, base64 validation). Work context: WORK_CONTEXT. Reports: WORK_CONTEXT/plans/reports/. Plans: WORK_CONTEXT/plans/`

- Agent 2:  
  `Implement Agent 2 from plans/agent-division-feedback-app-priorities.md: API rate limiting (api/_lib) for chat, evaluate, scenario, voice-token and Vitest + voice-token + smoke tests. Work context: WORK_CONTEXT. Reports: WORK_CONTEXT/plans/reports/. Plans: WORK_CONTEXT/plans/`

- Agent 3:  
  `Implement Agent 3 from plans/agent-division-feedback-app-priorities.md: provider selector in App.tsx, text chat streaming (api/chat, api-client-service, ChatInterface), more scenarios in constants.ts and scenario/prompt tuning. Work context: WORK_CONTEXT. Reports: WORK_CONTEXT/plans/reports/. Plans: WORK_CONTEXT/plans/`

### Option 2: Multiple Cursor Composer chats (no Task tool)

1. **Agent 1 (single chat):**
   - Open one Composer chat.
   - Paste: the **Agent 1** section from this file and add:  
     `Work in the repo at the root. When done, commit or summarize changes.`
   - Run until done.

2. **Agent 2 and Agent 3 in parallel (two separate chats):**
   - After Agent 1 is merged/applied, open **two new** Composer chats.
   - **Chat A:** Paste the **Agent 2** section and:  
     `Work in the repo at the root. Only touch api/_lib (rate-limit), api/*.ts (wire rate limit), and new test files. Do not change App.tsx or VoiceInterface.`
   - **Chat B:** Paste the **Agent 3** section and:  
     `Work in the repo at the root. Only touch App.tsx, api/chat.ts, services/api-client-service.ts, components/ChatInterface.tsx, constants.ts, api/scenario.ts, api/_lib/prompt-builder.ts. Do not change api/voice-token or add tests.`
   - Run both; when done, merge and run the full test suite.

Minimizing overlap (Agent 2: rate-limit + tests; Agent 3: UI + streaming + scenarios) avoids conflicts.

### Option 3: Git worktrees (isolated branches)

For strong isolation (each agent in its own folder and branch):

1. **Create worktrees** (from repo root, after Agent 1 is done if you run 1 first):
   ```bash
   git worktree add .worktrees/agent-2-rate-limit-tests -b agent-2-rate-limit-tests
   git worktree add .worktrees/agent-3-provider-streaming -b agent-3-provider-streaming
   ```
   Ensure `.worktrees/` is in `.gitignore` (see `.claude/skills/.../using-git-worktrees`).

2. **Run Agent 2:** Open `FeedbackApp2026/.worktrees/agent-2-rate-limit-tests` in a new Cursor window; run the Agent 2 brief in Composer there.

3. **Run Agent 3:** Open `FeedbackApp2026/.worktrees/agent-3-provider-streaming` in another Cursor window; run the Agent 3 brief in Composer there.

4. **Integrate:** Merge `agent-2-rate-limit-tests` and `agent-3-provider-streaming` into main (or your integration branch), resolve conflicts once, run build and tests.

**Order summary:** Agent 1 → then Agent 2 and Agent 3 in parallel (Options 1–3).
