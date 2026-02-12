# Phase 1: Setup Vercel Serverless Functions

## Context Links

- [plan.md](./plan.md)
- [types.ts](../../types.ts) -- AIService, ChatSession, Scenario, Message, EvaluationReport interfaces
- [geminiService.ts](../../services/geminiService.ts) -- reference for Gemini SDK usage
- [anthropicService.ts](../../services/anthropicService.ts) -- reference for Anthropic SDK usage
- [openaiService.ts](../../services/openaiService.ts) -- reference for OpenAI SDK usage
- [constants.ts](../../constants.ts) -- SCENARIOS, PERSONAS definitions

## Overview

- **Priority**: P1 (blocking production deployment)
- **Status**: ✅ completed (2026-02-11)
- **Effort**: 2.5h (actual: completed on schedule)
- **Description**: Create `/api` directory with serverless functions that proxy AI provider requests. Functions use server-side environment variables for API keys. Client sends provider name + payload; server routes to correct SDK.

## Key Insights

1. **Stateful chat problem**: Gemini SDK `Chat` object and Anthropic/OpenAI history arrays cannot persist between serverless invocations. Solution: client sends full message history with each `/api/chat` request; server reconstructs a fresh SDK call using that history every time.
2. **Prompt duplication**: The system prompts and prompt-building logic currently live in each service class. These must be extracted to shared server-side utilities to avoid 3x duplication across the new API functions.
3. **Gemini uses structured JSON schema** for `generateCustomScenario` and `evaluateTranscript`; Anthropic/OpenAI rely on prompt instructions to return JSON. This difference must be handled per-provider in the server function.
4. **No streaming in Phase 1** -- all responses are complete before returning to client.

## Requirements

### Functional
- `/api/chat` accepts: `{ provider, scenario, messages }` -> returns `{ message: string }`
- `/api/evaluate` accepts: `{ provider, scenario, transcript }` -> returns `EvaluationReport`
- `/api/scenario` accepts: `{ provider, description }` -> returns `Scenario`
- All endpoints return consistent error format: `{ error: string, status: number }`

### Non-Functional
- Max execution time: 60s (Vercel Hobby limit; sufficient for AI responses)
- Request body size: <1MB (ample for 50-message transcripts)
- Error responses use appropriate HTTP status codes (400, 500)

## Architecture

```
Client (browser)
  |
  |-- POST /api/chat     { provider, scenario, messages }
  |-- POST /api/evaluate  { provider, scenario, transcript }
  |-- POST /api/scenario  { provider, description }
  |
  v
Vercel Serverless Functions (Node.js)
  |
  |-- api/chat.ts       -> routes to Gemini/Anthropic/OpenAI
  |-- api/evaluate.ts   -> routes to Gemini/Anthropic/OpenAI
  |-- api/scenario.ts   -> routes to Gemini/Anthropic/OpenAI
  |-- api/_lib/          -> shared utilities (NOT auto-routed by Vercel)
  |     |-- provider-factory.ts    -> SDK client instantiation
  |     |-- prompt-builder.ts      -> system prompt construction
  |     |-- response-helpers.ts    -> error formatting, validation
  |
  v
AI Provider APIs (Gemini, Anthropic, OpenAI)
```

**Important Vercel convention**: Files/dirs prefixed with `_` inside `/api` are NOT exposed as routes. Use `api/_lib/` for shared code.

## Related Code Files

### Files to CREATE
| File | Purpose | Lines (est.) |
|------|---------|-------------|
| `api/chat.ts` | Chat endpoint; accepts provider + scenario + messages, returns AI response | ~80 |
| `api/evaluate.ts` | Evaluation endpoint; accepts provider + scenario + transcript, returns report | ~60 |
| `api/scenario.ts` | Custom scenario endpoint; accepts provider + description, returns Scenario | ~60 |
| `api/_lib/provider-factory.ts` | Instantiate correct SDK client from provider enum + env vars | ~60 |
| `api/_lib/prompt-builder.ts` | Build system prompts for persona chat (extracted from existing services) | ~80 |
| `api/_lib/response-helpers.ts` | Shared error response, request validation, JSON parsing | ~40 |

### Files to REFERENCE (read-only during this phase)
- `services/geminiService.ts` -- copy prompt construction logic
- `services/anthropicService.ts` -- copy prompt construction logic
- `services/openaiService.ts` -- copy prompt construction logic
- `types.ts` -- import shared types

## Implementation Steps

### Step 1: Create `api/_lib/response-helpers.ts`

Shared utilities for consistent API responses.

```typescript
// api/_lib/response-helpers.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export function sendError(res: VercelResponse, status: number, message: string) {
  return res.status(status).json({ error: message, status });
}

export function validateMethod(req: VercelRequest, res: VercelResponse, method: string): boolean {
  if (req.method !== method) {
    sendError(res, 405, `Method ${req.method} not allowed`);
    return false;
  }
  return true;
}

export function parseJsonBody(text: string): unknown {
  // Strip markdown code fences if present (some LLMs wrap JSON in ```json...```)
  const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(cleaned);
}
```

### Step 2: Create `api/_lib/provider-factory.ts`

Factory that returns initialized SDK clients using server-side env vars.

```typescript
// api/_lib/provider-factory.ts
import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type Provider = 'Gemini' | 'Anthropic' | 'OpenAI';

const ENV_KEYS: Record<Provider, string> = {
  Gemini: 'GEMINI_API_KEY',
  Anthropic: 'ANTHROPIC_API_KEY',
  OpenAI: 'OPENAI_API_KEY',
};

function getKey(provider: Provider): string {
  const key = process.env[ENV_KEYS[provider]];
  if (!key) throw new Error(`${ENV_KEYS[provider]} not configured`);
  return key;
}

export function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: getKey('Gemini') });
}

export function getAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: getKey('Anthropic') });
}

export function getOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: getKey('OpenAI') });
}
```

**Note**: No `dangerouslyAllowBrowser` needed -- these run server-side.

### Step 3: Create `api/_lib/prompt-builder.ts`

Extract the system prompt construction from existing services. This is the shared persona prompt used by all 3 providers in `createPersonaChat`.

```typescript
// api/_lib/prompt-builder.ts
// Extract from geminiService.ts lines 92-127 (identical across all 3 services)

interface Persona {
  name: string;
  roleDescription: string;
  difficulty: string;
  characteristics: string[];
  voiceExamples?: string[];
}

interface ScenarioInput {
  persona: Persona;
  assertions: string[];
  personaBackground?: string;
}

export function buildPersonaSystemPrompt(scenario: ScenarioInput): string {
  const assertionsList = scenario.assertions.map((a, i) => `${i + 1}. ${a}`).join('\n');
  const voiceBlock = scenario.persona.voiceExamples?.length
    ? `## HOW YOU SPEAK\nSpeak in this voice:\n${scenario.persona.voiceExamples.map(e => `- "${e}"`).join('\n')}`
    : '';
  const backgroundBlock = scenario.personaBackground
    ? `## YOUR PRIVATE CONTEXT RIGHT NOW\n${scenario.personaBackground}`
    : '';
  const emotionalArc = scenario.persona.difficulty === 'Easy'
    ? "Open and seeking clarity -- not hostile, just want to understand."
    : scenario.persona.difficulty === 'Hard'
    ? "Resistant. May only partially concede at the very end, and only if backed by 3+ specific facts."
    : "Defensive. Concede only after 2+ grounded, fact-based exchanges.";

  return `ACT AS: ${scenario.persona.name} -- you are a real person, not an AI.

## WHO YOU ARE
${scenario.persona.roleDescription}

${backgroundBlock}

## THE FACTS IN PLAY
These facts exist. Do NOT recite them unprompted -- react from your private narrative above.
${assertionsList}

## YOUR TRAITS (let these drive your reactions)
${scenario.persona.characteristics.join(', ')}

${voiceBlock}

## BEHAVIORAL RULES
1. OPENING: You just sat down. Start with 1-2 sentences, natural, in-character, slightly guarded.
2. ASSERTIONS: When user cites a specific fact, react from private context.
3. EMOTIONAL ARC: ${emotionalArc}
4. CONCESSION THRESHOLD: Only lower guard when user has cited 2+ specific facts, articulated impact, and offered a path forward.
5. NEVER break character. NEVER be educational. NEVER apologize for being difficult.
6. LENGTH: 2-4 sentences per response. Speak like a colleague in Slack.`;
}

export function buildCustomScenarioPrompt(userDescription: string): string {
  // Extracted from geminiService.ts lines 33-51 (identical across all 3)
  return `Create a highly detailed and psychologically distinct professional feedback simulation scenario based on this description: "${userDescription}"

The scenario should be designed for a "Feedback Giver" (the user).

Requirements:
1. AVOID GENERIC ARCHETYPES. Delve into the specific interpersonal friction.
2. PROFESSIONAL TITLE: Realistic, industry-specific.
3. PROBLEM DESCRIPTION: Synthesize the input into a professional challenge.
4. USER CONTEXT: Define the user's relationship to the persona.
5. COMPLEX PERSONA with: name, role description, difficulty (Easy/Medium/Hard), 3-5 distinct characteristics.

Return ONLY a JSON object with: id, title, description, role ("Giver"), context, persona {id, name, roleDescription, difficulty, characteristics}`;
}

export function buildEvaluationPrompt(scenarioTitle: string, scenarioContext: string, assertions: string[], transcript: { role: string; text: string }[]): string {
  const assertionsList = assertions.map((a, i) => `${i + 1}. ${a}`).join('\n');
  const transcriptText = transcript.map(m => `${m.role === 'user' ? 'User' : 'Persona'}: ${m.text}`).join('\n');

  return `Evaluate this feedback conversation where the user was the "Feedback Giver".
Scenario: ${scenarioTitle}
Context: ${scenarioContext}

AVAILABLE ASSERTIONS:
${assertionsList}

Transcript:
${transcriptText}

SCORING RUBRICS -- score each dimension 0-3:
1. Standard clarity: 0=none, 1=vague, 2=referenced standard, 3=specific measurable standard
2. Specificity of assertions: 0=none, 1=vague, 2=1-2 facts, 3=3+ assertions cited
3. Quality of grounding: 0=pure judgment, 1=weak evidence, 2=mostly fact-based, 3=clean separation
4. Impact articulation: 0=none, 1=vague, 2=team impact, 3=business+team with example
5. Emotional regulation: 0=aggressive, 1=frustrated, 2=professional, 3=compassionate and direct
6. Commitment quality: 0=no next step, 1=vague, 2=specific ask, 3=concrete with timeframe

Return ONLY JSON: { giverScores: [{dimension, score, feedback}], summary: {whatWorked, whatBrokeDown, highestLeverageImprovement}, recommendations }`;
}
```

### Step 4: Create `api/chat.ts`

The chat endpoint. Key design: client sends full message history; server makes a single SDK call with that history to get the next response.

```typescript
// api/chat.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateMethod, sendError, parseJsonBody } from './_lib/response-helpers';
import { getGeminiClient, getAnthropicClient, getOpenAIClient, Provider } from './_lib/provider-factory';
import { buildPersonaSystemPrompt } from './_lib/prompt-builder';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!validateMethod(req, res, 'POST')) return;

  try {
    const { provider, scenario, messages } = req.body as {
      provider: Provider;
      scenario: { persona: any; assertions: string[]; personaBackground?: string };
      messages: { role: string; text: string }[];
    };

    if (!provider || !scenario || !messages?.length) {
      return sendError(res, 400, 'Missing required fields: provider, scenario, messages');
    }

    const systemPrompt = buildPersonaSystemPrompt(scenario);
    let responseText: string;

    switch (provider) {
      case 'Gemini': {
        const ai = getGeminiClient();
        // Gemini: send all messages as a single conversation turn
        // Build conversation content from history
        const contents = messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        }));
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents,
          config: { systemInstruction: systemPrompt, temperature: 0.8 },
        });
        responseText = response.text ?? '';
        break;
      }
      case 'Anthropic': {
        const client = getAnthropicClient();
        const anthropicMessages = messages.map(m => ({
          role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.text,
        }));
        const response = await client.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          system: systemPrompt,
          messages: anthropicMessages,
        });
        responseText = response.content
          .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
          .map(b => b.text)
          .join('');
        break;
      }
      case 'OpenAI': {
        const client = getOpenAIClient();
        const openaiMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...messages.map(m => ({
            role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: m.text,
          })),
        ];
        const response = await client.chat.completions.create({
          model: 'gpt-4o',
          messages: openaiMessages,
          temperature: 0.8,
        });
        responseText = response.choices[0]?.message?.content ?? '';
        break;
      }
      default:
        return sendError(res, 400, `Unknown provider: ${provider}`);
    }

    return res.status(200).json({ message: responseText });
  } catch (error) {
    console.error('Chat API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return sendError(res, 500, message);
  }
}
```

### Step 5: Create `api/evaluate.ts`

```typescript
// api/evaluate.ts -- similar pattern, uses buildEvaluationPrompt
// Routes to provider SDK, returns EvaluationReport JSON
// Gemini: uses responseMimeType: 'application/json' + responseSchema
// Anthropic/OpenAI: uses prompt instruction to return JSON, parses response
```

Key difference by provider:
- **Gemini**: uses `responseMimeType: 'application/json'` with `responseSchema` (structured output)
- **Anthropic**: returns raw text, parse with `parseJsonBody()`
- **OpenAI**: uses `response_format: { type: 'json_object' }`, parse response

### Step 6: Create `api/scenario.ts`

```typescript
// api/scenario.ts -- similar pattern, uses buildCustomScenarioPrompt
// Same provider routing as evaluate.ts
// Post-processes: sets id to `custom-${Date.now()}`, forces role to 'Giver'
```

### Step 7: Install `@vercel/node` type package

```bash
npm install --save-dev @vercel/node
```

This provides `VercelRequest` and `VercelResponse` types. No runtime dependency needed.

### Step 8: Verify locally with `vercel dev`

```bash
npx vercel dev
# Test: curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' \
#   -d '{"provider":"Gemini","scenario":{...},"messages":[{"role":"user","text":"test"}]}'
```

## Todo List

- [x] Create `api/_lib/response-helpers.ts` -- error formatting, validation, JSON parsing
- [x] Create `api/_lib/provider-factory.ts` -- SDK client instantiation per provider
- [x] Create `api/_lib/prompt-builder.ts` -- extract shared prompt logic from 3 services
- [x] Create `api/chat.ts` -- chat endpoint with provider routing + history reconstruction
- [x] Create `api/evaluate.ts` -- evaluation endpoint with structured JSON responses
- [x] Create `api/scenario.ts` -- custom scenario generation endpoint
- [x] Install `@vercel/node` as dev dependency
- [x] Test all 3 endpoints locally with `vercel dev`

## Success Criteria

1. ✅ All 3 API endpoints return correct responses when tested with `curl`
2. ✅ No API keys appear in client-side code or network requests visible in browser DevTools
3. ✅ Each endpoint handles missing/invalid provider gracefully with 400 response
4. ✅ Each endpoint handles SDK errors gracefully with 500 response + meaningful message
5. ✅ Gemini structured output produces valid JSON matching EvaluationReport type

**Phase 1 Status: COMPLETE** — All files created and verified. See tester and code review reports for details.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Gemini `generateContent` with history format differs from `Chat` object | Medium | Blocks chat | Test history format carefully; Gemini `contents` array supports multi-turn |
| Prompt too long for Anthropic max_tokens=1024 | Low | Truncated responses | Monitor; increase max_tokens if needed |
| `@vercel/node` types mismatch with deployed runtime | Low | Type errors | Pin to latest stable version |

## Security Considerations

1. **API keys**: Only accessed via `process.env` in serverless functions; never sent to client
2. **Input validation**: Validate `provider` is one of 3 known values; reject unknown
3. **No user auth needed**: Internal practice tool, not public API; if needed later, add simple token
4. **Request size**: Vercel default 4.5MB limit is sufficient; no additional limiting needed
5. **Rate limiting**: Rely on provider-level rate limits for now; add Vercel rate limiting if abuse detected
6. **CORS**: Vercel automatically handles CORS for same-origin `/api` calls; no explicit config needed

## Next Steps

After Phase 1 is complete, proceed to [Phase 2: Refactor Client Services](./phase-02-refactor-client-services.md) to wire the frontend to these new endpoints.
