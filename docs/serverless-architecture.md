# Serverless Architecture Guide

## Overview

Lumenalta uses a **Backend-for-Frontend (BFF) pattern** with Vercel serverless functions to secure AI provider integrations while maintaining a stateless architecture for optimal scalability.

## Architecture Diagram

```
┌─────────────────┐
│   React Client  │
│  (Browser)      │
└────────┬────────┘
         │ HTTP POST
         │ (stateless)
         ▼
┌─────────────────────────────────────┐
│     Vercel Serverless Functions     │
├─────────────────────────────────────┤
│ /api/chat      (streaming support)  │
│ /api/evaluate  (JSON responses)     │
│ /api/scenario  (scenario generation)│
└────────┬────────┬────────┬──────────┘
         │        │        │
    ┌────▼─┐ ┌───▼──┐ ┌───▼──┐
    │Gemini│ │Claude│ │OpenAI│
    │ 2.0  │ │Sonnet│ │GPT-4o│
    └──────┘ └──────┘ └──────┘
```

## Key Design Principles

### 1. Stateless Serverless Design
- **No session storage on server:** Each request is independent
- **Full history in payload:** Client sends complete message history with each request
- **Automatic scaling:** Functions scale elastically with demand
- **Cost efficiency:** Pay only for execution time

### 2. Backend-for-Frontend (BFF) Pattern
- **API key security:** All credentials stored server-side only
- **Request validation:** Server validates provider and scenario data
- **Response sanitization:** Error messages stripped of sensitive details
- **Single entry point:** All AI requests routed through serverless layer

### 3. Multi-Provider Abstraction
- **Provider factory:** Single interface for all AI providers
- **Uniform response format:** Consistent JSON structure across providers
- **Provider switching:** Client selects provider per request (no lock-in)
- **Graceful degradation:** Individual provider outages don't block others

## Request/Response Flow

### Chat Request Flow

```
Client                                  Serverless                 AI Provider
  │                                       │                           │
  ├─ POST /api/chat ──────────────────>  │                           │
  │  {                                    │                           │
  │    provider: "Anthropic"              │                           │
  │    scenario: { persona, ... }         │                           │
  │    messages: [ {...}, {...} ]         │                           │
  │  }                                    │                           │
  │                                       ├─ Validate ────────────>  │
  │                                       │  CreateMessage           │
  │                                       │  (with system prompt)    │
  │                                       │                          │
  │                                       │  <─ response ───────────┤
  │                                       │                           │
  │  <────────────── JSON response ──────┤                           │
  │  {                                    │                           │
  │    message: "AI response text"        │                           │
  │  }                                    │                           │
```

### Evaluation Request Flow

```
Client                                  Serverless                 AI Provider
  │                                       │                           │
  ├─ POST /api/evaluate ──────────────>  │                           │
  │  {                                    │                           │
  │    provider: "Anthropic"              │                           │
  │    scenario: { title, context, ... }  │                           │
  │    transcript: [ {...}, {...} ]       │                           │
  │  }                                    │                           │
  │                                       ├─ Build evaluation ───>  │
  │                                       │  prompt with JSON       │
  │                                       │  format requirement     │
  │                                       │                        │
  │                                       │  <─ JSON response ─────┤
  │                                       │                        │
  │  <────────────── JSON report ────────┤                           │
  │  {                                    │                           │
  │    summary: {...}                     │                           │
  │    feedbackItems: [...],              │                           │
  │    recommendations: [...]             │                           │
  │  }                                    │                           │
```

### Scenario Generation Flow

```
Client                                  Serverless                 AI Provider
  │                                       │                           │
  ├─ POST /api/scenario ──────────────>  │                           │
  │  {                                    │                           │
  │    provider: "Anthropic"              │                           │
  │    description: "..."                 │                           │
  │  }                                    │                           │
  │                                       ├─ Build scenario ────>   │
  │                                       │  prompt with JSON      │
  │                                       │  format requirement    │
  │                                       │                        │
  │                                       │  <─ JSON response ─────┤
  │                                       │                        │
  │  <────────────── JSON scenario ─────┤                           │
  │  {                                    │                           │
  │    title: "...",                      │                           │
  │    context: "...",                    │                           │
  │    persona: {...},                    │                           │
  │    assertions: [...]                  │                           │
  │  }                                    │                           │
```

## Function Architecture

### `/api/chat.ts`
**Purpose:** Multi-turn conversation with AI personas

**Responsibilities:**
- Route requests to selected provider
- Build system prompt from persona data
- Reconstruct conversation history from message array
- Handle provider-specific API differences
- Return AI response text

**Input Validation:**
- `provider`: Must be 'Gemini', 'Anthropic', or 'OpenAI'
- `scenario`: Must contain persona data with name, roleDescription, difficulty
- `messages`: Non-empty array with role and text fields

**Output Format:**
```json
{
  "message": "AI-generated response text"
}
```

### `/api/evaluate.ts`
**Purpose:** Evaluate chat performance against scenario assertions

**Responsibilities:**
- Build structured evaluation prompt
- Request JSON-formatted evaluation from AI
- Parse and validate JSON response
- Return structured EvaluationReport

**Input Validation:**
- `provider`: Must be 'Gemini', 'Anthropic', or 'OpenAI'
- `scenario`: Must contain title, context, and assertions array
- `transcript`: Non-empty array of conversation turns

**Output Format:**
```json
{
  "summary": {
    "overallScore": 0-100,
    "feedbackQuality": 0-100,
    "adherenceToContext": 0-100
  },
  "feedbackItems": [
    {
      "assertion": "assertion text",
      "score": 0-100,
      "feedback": "specific feedback"
    }
  ],
  "recommendations": ["recommendation 1", "recommendation 2"]
}
```

### `/api/scenario.ts`
**Purpose:** Generate custom practice scenarios from user descriptions

**Responsibilities:**
- Build scenario generation prompt
- Request JSON-formatted scenario from AI
- Parse and validate scenario structure
- Return Scenario object for UI consumption

**Input Validation:**
- `provider`: Must be 'Gemini', 'Anthropic', or 'OpenAI'
- `description`: Non-empty string describing desired scenario

**Output Format:**
```json
{
  "title": "Scenario title",
  "context": "Situational context",
  "persona": {
    "name": "Persona name",
    "roleDescription": "Role and responsibilities",
    "difficulty": "easy|medium|hard",
    "characteristics": ["trait1", "trait2"],
    "voiceExamples": ["example quote 1"]
  },
  "assertions": ["assertion 1", "assertion 2"]
}
```

## Stateless Design Benefits

### Scalability
- Functions spin up/down independently
- No shared state to synchronize
- Horizontal scaling with zero configuration
- Load naturally distributed across instances

### Resilience
- Failed requests don't affect future requests
- No cascading failures from state corruption
- Each instance is isolated
- Provider outages isolated to single request

### Developer Experience
- Simple request/response model
- No session management complexity
- Full context visible in each request
- Easy to test and debug

### Cost Efficiency
- Sub-second cold starts (typical: 200-500ms)
- Pay only for execution duration
- Automatic resource cleanup
- No idle instance costs

## Security Architecture

### API Key Protection

**Server-Side Only:**
```typescript
// ✅ Correct: Keys loaded in serverless function
const apiKey = process.env.ANTHROPIC_API_KEY;
const client = new Anthropic({ apiKey });
```

**Never Client-Side:**
```typescript
// ❌ Wrong: Keys would be exposed in bundle
const apiKey = process.env.VITE_ANTHROPIC_API_KEY;
```

### Error Sanitization

All endpoints sanitize error responses to prevent credential exposure:

```typescript
// Detect auth errors
const isAuthError = message.includes('API key') || message.includes('authentication');

// Return generic message to client
const safeMessage = isAuthError ? 'Authentication failed' : 'Failed to generate response';
return sendError(res, 500, safeMessage);
```

### Request Validation

Each function validates:
1. HTTP method (POST only)
2. Required fields present
3. Field types correct
4. Provider supported

### Response Validation

Responses sanitized before returning:
- Auth errors masked
- Internal stack traces removed
- JSON parsing errors handled gracefully
- Empty responses validated

## Performance Characteristics

### Cold Start Times
- **Typical:** 200-500ms first invocation
- **Warm:** <100ms subsequent invocations (within 15 min)
- **Acceptable:** For practice tool (not time-critical user experience)

### Request Processing
- **Chat endpoint:** 2-5 seconds (provider dependent)
- **Evaluation:** 3-8 seconds (depends on transcript length)
- **Scenario generation:** 2-4 seconds

### Payload Limits
- **Request body:** Max 6MB (Vercel limit)
- **Response:** Max 6MB
- **Chat history:** ~50 messages recommended (stays under 500KB)

## Deployment Architecture

### Vercel Configuration

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "outputDirectory": "dist"
}
```

### Build Process
1. Install dependencies (`npm install`)
2. Build frontend with Vite (`npm run build`)
3. Output static assets to `dist/`
4. Vercel auto-detects `/api` directory
5. Compiles serverless functions
6. Deploys functions and assets globally

### Environment Variables
Required in Vercel project settings:
```
GEMINI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
```

## Provider-Specific Implementation Details

### Gemini (Google)
- Uses `@google/genai` SDK
- Supports JSON responses via `responseMimeType`
- Temperature: 0.8 for chat, 0.3 for evaluation
- Model: `gemini-2.0-flash`

### Anthropic (Claude)
- Uses `@anthropic-ai/sdk`
- Standard message format
- Max tokens: 1024 for chat, 1500 for evaluation
- Model: `claude-sonnet-4-5-20250929`

### OpenAI
- Uses `openai` SDK
- Supports JSON responses via `response_format`
- Temperature: 0.8 for chat, 0.3 for evaluation
- Model: `gpt-4o`

## Local Development

### Testing Serverless Functions Locally

**Prerequisites:**
```bash
npm install
```

**Run development server:**
```bash
npm run dev
```

**Vercel CLI mocks functions:**
- Functions available at `http://localhost:3000/api/*`
- Full environment variable support
- Hot reload on code changes

**Testing with curl:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "Anthropic",
    "scenario": { /* scenario data */ },
    "messages": [{ "role": "user", "text": "Hello" }]
  }'
```

## Monitoring & Debugging

### Common Issues

**Cold Start Latency:**
- Expected behavior
- Cannot be eliminated (stateless architecture requirement)
- Minimize impact by keeping function size small

**Provider Authentication Failures:**
- Check environment variables in Vercel project settings
- Verify API keys are valid
- Check rate limiting on provider accounts

**JSON Parsing Errors:**
- Validate request format matches specification
- Check AI provider response format
- Some providers wrap JSON in markdown code fences

### Logging Best Practices
- Use `console.error()` for exceptions
- Include request context in error logs
- Avoid logging sensitive data
- Access logs in Vercel dashboard

## Migration Notes

### From Client-Side SDKs
Previous architecture exposed API keys in bundle. New serverless approach:
- ✅ Moves all API keys server-side
- ✅ Eliminates client SDK bloat
- ✅ Enables provider switching without redeploy
- ✅ Improves security posture significantly

### State Management
Previous client-side session storage still used for:
- Message history (passed in each request)
- User preferences
- Chat UI state

Server no longer handles:
- Session storage
- Message persistence
- User authentication (out of scope)

## Future Enhancements

### Potential Improvements
1. **Message persistence:** Add database for saved conversations
2. **Rate limiting:** Implement per-user request throttling
3. **Caching:** Cache evaluation results for identical transcripts
4. **Streaming:** Implement SSE/WebSocket for real-time responses
5. **Analytics:** Track provider usage and performance metrics
6. **Authentication:** Add user identity and authorization layer

