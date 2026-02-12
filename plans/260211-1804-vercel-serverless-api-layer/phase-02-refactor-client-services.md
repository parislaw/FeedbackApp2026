# Phase 2: Refactor Client Services

## Context Links

- [plan.md](./plan.md)
- [Phase 1](./phase-01-setup-vercel-functions.md) -- prerequisite; API functions must exist
- [App.tsx](../../App.tsx) -- orchestrator; uses `getAIService()` and `getAllProviderStatuses()`
- [aiServiceFactory.ts](../../services/aiServiceFactory.ts) -- current factory; will be replaced
- [ChatInterface.tsx](../../components/ChatInterface.tsx) -- consumes `AIService` and `ChatSession`
- [types.ts](../../types.ts) -- `AIService`, `ChatSession` interfaces

## Overview

- **Priority**: P1
- **Status**: ✅ completed (2026-02-11)
- **Effort**: 2h (actual: completed on schedule)
- **Description**: Replace direct SDK service calls with a single `ApiClientService` that implements the existing `AIService` interface using `fetch()` calls to `/api/*` endpoints. This is the critical pivot point: after this phase, zero AI SDK code runs in the browser.

## Key Insights

1. **Interface compatibility**: `AIService` has 3 methods: `generateCustomScenario`, `createPersonaChat`, `evaluateTranscript`. The new client service must implement all 3 identically.
2. **ChatSession statefulness**: Current `ChatSession.sendMessage()` relies on SDK-managed history. New `ApiChatSession` must maintain message history client-side and send full history with each `/api/chat` request.
3. **Provider selection**: `getAIService(provider)` currently returns different service instances. New factory returns the same `ApiClientService` instance configured with the provider name.
4. **Provider status**: `getAllProviderStatuses()` currently checks `process.env.X_API_KEY` at build time. Post-migration, keys aren't in the client. Options: (a) add a `/api/status` endpoint, (b) assume all providers available, (c) check via a lightweight ping. Recommendation: **option (b)** for simplicity; if a key is missing, the API call will fail with a clear error message. Revisit if UX demands pre-flight checks.

## Requirements

### Functional
- `ApiClientService` implements `AIService` interface
- `ApiChatSession` implements `ChatSession` interface
- `sendMessage()` maintains local history and sends full history to `/api/chat`
- Provider name passed to all API calls
- Error messages from API propagated to UI

### Non-Functional
- No AI SDK imports in any client-side file after migration
- Bundle size reduction (3 SDK packages no longer bundled)
- Response timeout handling (abort after 60s to match Vercel limit)

## Architecture

```
Before (current):
  App.tsx -> getAIService(provider) -> geminiService / anthropicService / openaiService
                                       (direct SDK calls with browser API keys)

After (target):
  App.tsx -> getAIService(provider) -> ApiClientService(provider)
                                       -> fetch('/api/chat')
                                       -> fetch('/api/evaluate')
                                       -> fetch('/api/scenario')
```

### ApiChatSession Flow

```
ChatInterface.tsx
  |
  useEffect -> aiService.createPersonaChat(scenario)
  |              returns ApiChatSession (stores scenario + provider + empty history)
  |
  sendMessage("user text")
  |   1. Push { role: 'user', text } to local history
  |   2. POST /api/chat { provider, scenario, messages: fullHistory }
  |   3. Receive { message: "AI response" }
  |   4. Push { role: 'model', text: response } to local history
  |   5. Return response text
  v
  ChatInterface renders message
```

## Related Code Files

### Files to CREATE
| File | Purpose | Lines (est.) |
|------|---------|-------------|
| `services/api-client-service.ts` | `ApiClientService` implementing `AIService` + `ApiChatSession` implementing `ChatSession` | ~120 |

### Files to MODIFY
| File | Change | Lines changed (est.) |
|------|--------|---------------------|
| `services/aiServiceFactory.ts` | Replace imports; `getAIService()` returns `ApiClientService`; update `getAllProviderStatuses()` | ~20 |
| `App.tsx` | No changes to imports or usage (factory handles it) | 0 |
| `components/ChatInterface.tsx` | No changes (consumes `AIService` interface; stays identical) | 0 |

### Files to KEEP (not delete yet)
| File | Reason |
|------|--------|
| `services/geminiService.ts` | Keep as reference until Phase 1 API functions are verified working |
| `services/anthropicService.ts` | Same |
| `services/openaiService.ts` | Same |

**Note**: Delete old service files in a separate cleanup commit after full integration test passes.

## Implementation Steps

### Step 1: Create `services/api-client-service.ts`

```typescript
// services/api-client-service.ts
import { AIService, ChatSession, Scenario, Message, EvaluationReport, Role } from '../types';

type Provider = 'Gemini' | 'Anthropic' | 'OpenAI';

class ApiChatSession implements ChatSession {
  private provider: Provider;
  private scenario: {
    persona: Scenario['persona'];
    assertions: string[];
    personaBackground?: string;
  };
  private history: { role: string; text: string }[];

  constructor(provider: Provider, scenario: Scenario) {
    this.provider = provider;
    this.scenario = {
      persona: scenario.persona,
      assertions: scenario.assertions || [],
      personaBackground: scenario.personaBackground,
    };
    this.history = [];
  }

  async sendMessage(message: string): Promise<string> {
    this.history.push({ role: 'user', text: message });

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: this.provider,
        scenario: this.scenario,
        messages: this.history,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `API error: ${res.status}`);
    }

    const data = await res.json();
    this.history.push({ role: 'model', text: data.message });
    return data.message;
  }
}

export class ApiClientService implements AIService {
  private provider: Provider;

  constructor(provider: Provider) {
    this.provider = provider;
  }

  async generateCustomScenario(userDescription: string): Promise<Scenario> {
    const res = await fetch('/api/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: this.provider,
        description: userDescription,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `API error: ${res.status}`);
    }

    const scenario = await res.json();
    // Ensure ID uniqueness and role
    scenario.id = `custom-${Date.now()}`;
    scenario.role = Role.Giver;
    return scenario as Scenario;
  }

  async createPersonaChat(scenario: Scenario): Promise<ChatSession> {
    // No API call here -- just create the session object.
    // The first sendMessage() triggers the actual API call.
    return new ApiChatSession(this.provider, scenario);
  }

  async evaluateTranscript(scenario: Scenario, transcript: Message[]): Promise<EvaluationReport> {
    const res = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: this.provider,
        scenario: {
          title: scenario.title,
          context: scenario.context,
          assertions: scenario.assertions || [],
        },
        transcript,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `API error: ${res.status}`);
    }

    return (await res.json()) as EvaluationReport;
  }
}
```

### Step 2: Update `services/aiServiceFactory.ts`

Replace the factory to return `ApiClientService` instances.

```typescript
// services/aiServiceFactory.ts (UPDATED)
import { AIProvider, AIService } from '../types';
import { ApiClientService } from './api-client-service';

export interface ProviderStatus {
  available: boolean;
  envVar: string;
}

export function getProviderStatus(provider: AIProvider): ProviderStatus {
  // Post-migration: keys are server-side. Assume available.
  // If key is missing, API call will return a clear error.
  return { available: true, envVar: '' };
}

export function getAllProviderStatuses(): Record<AIProvider, ProviderStatus> {
  return {
    [AIProvider.Gemini]: getProviderStatus(AIProvider.Gemini),
    [AIProvider.Anthropic]: getProviderStatus(AIProvider.Anthropic),
    [AIProvider.OpenAI]: getProviderStatus(AIProvider.OpenAI),
  };
}

export function getAIService(provider: AIProvider): AIService {
  return new ApiClientService(provider);
}
```

**Key change**: No more `geminiService`, `anthropicService`, `openaiService` imports. No more `process.env.X_API_KEY` references in client code.

### Step 3: Verify App.tsx requires NO changes

Current usage in `App.tsx`:
- `const aiService = useMemo(() => getAIService(aiProvider), [aiProvider]);` -- works unchanged
- `const providerStatuses = useMemo(() => getAllProviderStatuses(), []);` -- works unchanged
- `aiService.generateCustomScenario(description)` -- interface unchanged
- `aiService.evaluateTranscript(currentScenario, finalTranscript)` -- interface unchanged

Current usage in `ChatInterface.tsx`:
- `await aiService.createPersonaChat(scenario)` -- returns `ChatSession`, unchanged
- `await chatSession.sendMessage(inputText)` -- returns `string`, unchanged

**Zero changes needed in App.tsx or ChatInterface.tsx.**

### Step 4: Verify ChatInterface initialization behavior

Current `ChatInterface.tsx` line 26 sends an initial message to trigger persona opening:
```typescript
const firstResponseText = await chat.sendMessage(
  "You've just sat down for this conversation..."
);
```

This still works: `ApiChatSession.sendMessage()` will make the first `/api/chat` call with a single-message history. The API function builds the system prompt from the scenario and returns the persona's opening line.

### Step 5: Integration test

1. Run `vercel dev` (starts both frontend + API functions)
2. Select a scenario -> verify persona responds (tests `/api/chat`)
3. Complete conversation -> verify evaluation report (tests `/api/evaluate`)
4. Create custom scenario -> verify generation (tests `/api/scenario`)
5. Switch providers mid-session -> verify all 3 work

## Todo List

- [x] Create `services/api-client-service.ts` with `ApiClientService` and `ApiChatSession`
- [x] Update `services/aiServiceFactory.ts` to use `ApiClientService`
- [x] Verify App.tsx requires zero changes
- [x] Verify ChatInterface.tsx requires zero changes
- [x] Integration test: chat flow with all 3 providers
- [x] Integration test: evaluation flow
- [x] Integration test: custom scenario generation
- [x] Remove old SDK service imports from factory (but keep files for reference)

## Success Criteria

1. ✅ Full conversation flow works end-to-end through `/api/chat` (scenario select -> chat -> evaluate)
2. ✅ Custom scenario generation works through `/api/scenario`
3. ✅ All 3 providers (Gemini, Anthropic, OpenAI) work correctly
4. ✅ No AI SDK imports exist in client-side code (only in `/api` directory)
5. ✅ Browser DevTools Network tab shows `/api/*` requests, NOT direct calls to `generativelanguage.googleapis.com`, `api.anthropic.com`, or `api.openai.com`
6. ✅ `App.tsx` and `ChatInterface.tsx` have zero code changes

**Phase 2 Status: COMPLETE** — ApiClientService and factory updated. All integration tests passing. See tester report for details.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Provider status UX regression (all show "available" even if key missing) | Medium | Confusing UX when key is missing | API returns clear error; show in chat as "Failed to start: ANTHROPIC_API_KEY not configured" |
| Large request bodies for long conversations | Low | Slow requests | Limit history to last 50 messages; truncate if needed |
| `createPersonaChat` was sync-like, now first message is slightly slower | Low | Minor UX delay | Already handles loading state with "...Typing" indicator |

## Security Considerations

1. **No API keys in client**: `ApiClientService` uses `fetch('/api/...')` only; zero env var references
2. **No SDK browser flags**: No `dangerouslyAllowBrowser: true` anywhere in client code
3. **Request forgery**: Same-origin `/api` calls only; Vercel handles CORS
4. **Sensitive data in transit**: Conversation content sent to our own API; same trust boundary as current direct-to-provider calls

## Next Steps

After Phase 2 is complete, proceed to [Phase 3: Update Build Config](./phase-03-update-build-config.md) to remove API key exposure from `vite.config.ts`.
