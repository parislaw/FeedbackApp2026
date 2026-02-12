# System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Lumenalta System                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐         ┌──────────────────────┐      │
│  │   Browser (Client)   │         │  Vercel CDN/Edge     │      │
│  │  React + TypeScript  │◄───────►│  Static Assets       │      │
│  │  - Chat Interface    │         │  - HTML/CSS/JS       │      │
│  │  - Scenario Select   │         │                      │      │
│  │  - Eval Report       │         └──────────────────────┘      │
│  └──────────┬───────────┘                                        │
│             │                                                    │
│             │ HTTPS POST Requests                                │
│             │ (stateless, full context in body)                  │
│             │                                                    │
│  ┌──────────▼───────────────────────────────────────────┐       │
│  │    Vercel Serverless Functions (Node.js Runtime)    │       │
│  ├──────────────────────────────────────────────────────┤       │
│  │  /api/chat.ts          /api/evaluate.ts            │       │
│  │  - Route to provider   - Build eval prompt         │       │
│  │  - Build system prompt - Request JSON response     │       │
│  │  - Handle multi-turn   - Parse evaluation          │       │
│  │                                                      │       │
│  │  /api/scenario.ts                                  │       │
│  │  - Build scenario prompt                           │       │
│  │  - Request JSON scenario                           │       │
│  │  - Parse & validate                                │       │
│  │                                                      │       │
│  │  /_lib/provider-factory.ts    /_lib/prompt-builder │       │
│  │  /_lib/response-helpers.ts                         │       │
│  └──────┬──────────┬──────────────┬─────────────────┘       │
│         │          │              │                         │
│         │ API Calls with Keys from Environment Variables     │
│         │          │              │                         │
│   ┌─────▼┐    ┌───▼────┐     ┌──▼────┐                  │
│   │ Anthropic │    │ Gemini │     │ OpenAI │                  │
│   │ Claude    │    │ 2.0    │     │ GPT-4o │                  │
│   │ Sonnet    │    │ Flash  │     │        │                  │
│   └─────────┘    └────────┘     └────────┘                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Layer (Client-Side)

**Location:** Root directory (React + Vite)

**Responsibilities:**
- User interface for scenario practice
- Chat interface for multi-turn conversation
- Evaluation report display
- Provider selection
- Local state management

**Key Components:**
- `App.tsx` - Main app component
- `components/ChatInterface.tsx` - Chat UI and message handling
- `components/ScenarioSelector.tsx` - Scenario selection
- `components/EvaluationReport.tsx` - Evaluation display
- `services/api-client.ts` - API request handling

**Technology:**
- React 19 (hooks for state management)
- TypeScript for type safety
- Vite for build and dev server

**Constraints:**
- No API keys stored
- No server-side session management
- Message history maintained in component state
- Cannot make direct AI provider API calls

### Backend Layer (Serverless Functions)

**Location:** `/api` directory

**Responsibilities:**
- Secure API key management
- Request routing to AI providers
- System prompt generation
- Error handling and sanitization
- Response formatting

**Key Functions:**
1. `/api/chat.ts` - Chat endpoint
   - Accepts: provider, scenario, messages
   - Returns: message (string)
   - Uses: Persona system prompt

2. `/api/evaluate.ts` - Evaluation endpoint
   - Accepts: provider, scenario, transcript
   - Returns: EvaluationReport (JSON)
   - Uses: Evaluation prompt with assertions

3. `/api/scenario.ts` - Custom scenario endpoint
   - Accepts: provider, description
   - Returns: Scenario (JSON)
   - Uses: Scenario generation prompt

**Shared Utilities:**
- `_lib/provider-factory.ts` - Create AI SDK clients
- `_lib/response-helpers.ts` - Error handling, validation
- `_lib/prompt-builder.ts` - Build prompts for each operation

**Technology:**
- Node.js serverless runtime (Vercel)
- TypeScript with Vercel types
- AI SDK clients (Anthropic, Google, OpenAI)

**Constraints:**
- 60-second timeout limit
- 6MB payload limit
- Stateless (no persistence)
- Cold starts acceptable (200-500ms)

### AI Provider Integration Layer

**Providers Supported:**
1. **Anthropic**
   - SDK: `@anthropic-ai/sdk`
   - Model: `claude-sonnet-4-5-20250929`
   - Key env var: `ANTHROPIC_API_KEY`

2. **Google Gemini**
   - SDK: `@google/genai`
   - Model: `gemini-2.0-flash`
   - Key env var: `GEMINI_API_KEY`

3. **OpenAI**
   - SDK: `openai`
   - Model: `gpt-4o`
   - Key env var: `OPENAI_API_KEY`

**Integration Pattern:**
```
Provider selection → Factory creates client with API key
→ Format request for provider's SDK → Send request
→ Parse response → Return standardized format
```

**Error Handling:**
- Provider unavailable → 500 with "Authentication failed"
- Invalid response → 500 with "Failed to parse response"
- Invalid input → 400 with specific field error

## Data Flow Diagrams

### Chat Request Flow

```
User Input Text
    ↓
React Component
    ↓ Updates state, renders UI
Client (browser)
    ↓ POST /api/chat with full history
    │ {
    │   provider: "Anthropic",
    │   scenario: {...},
    │   messages: [
    │     {role: "user", text: "..."},
    │     {role: "assistant", text: "..."}
    │   ]
    │ }
    ↓
Vercel Serverless Function
    ↓ Validate request
    ↓ Extract provider, scenario, messages
    ↓ Build system prompt from persona
    ↓ Format messages for provider SDK
    ↓ Call provider API with full history
Provider (Anthropic/Gemini/OpenAI)
    ↓ Generate response
    ↓ Return text response
Vercel Serverless Function
    ↓ Extract response text
    ↓ Sanitize errors (if any)
    ↓ Return JSON: {message: "..."}
    ↓
Client (browser)
    ↓ Parse response
    ↓ Add assistant message to history
    ↓ Re-render chat interface
User sees response
```

### Evaluation Request Flow

```
User clicks "Evaluate"
    ↓
React Component
    ↓ Collects full conversation transcript
Client (browser)
    ↓ POST /api/evaluate with transcript
    │ {
    │   provider: "Anthropic",
    │   scenario: {title, context, assertions},
    │   transcript: [{role, text}, ...]
    │ }
    ↓
Vercel Serverless Function
    ↓ Validate request
    ↓ Build evaluation prompt with assertions
    ↓ Add JSON format requirement
    ↓ Send to provider API
Provider (Anthropic/Gemini/OpenAI)
    ↓ Analyze transcript against assertions
    ↓ Generate evaluation as JSON
    ↓ Return JSON response
Vercel Serverless Function
    ↓ Parse JSON response
    ↓ Validate structure
    ↓ Return EvaluationReport:
    │ {
    │   summary: {overallScore, feedbackQuality, adherenceToContext},
    │   feedbackItems: [{assertion, score, feedback}],
    │   recommendations: [...]
    │ }
    ↓
Client (browser)
    ↓ Parse response
    ↓ Render evaluation report
User sees detailed feedback
```

### Scenario Generation Flow

```
User enters description
    ↓ Clicks "Generate Custom Scenario"
React Component
    ↓ Collects description
Client (browser)
    ↓ POST /api/scenario
    │ {
    │   provider: "Anthropic",
    │   description: "..."
    │ }
    ↓
Vercel Serverless Function
    ↓ Validate description
    ↓ Build scenario prompt
    ↓ Add JSON format requirement
    ↓ Send to provider API
Provider (Anthropic/Gemini/OpenAI)
    ↓ Generate scenario from description
    ↓ Create persona with characteristics
    ↓ Define assertions
    ↓ Return JSON response
Vercel Serverless Function
    ↓ Parse JSON response
    ↓ Validate Scenario structure
    ↓ Return Scenario object:
    │ {
    │   title: "...",
    │   context: "...",
    │   persona: {name, roleDescription, difficulty, characteristics, voiceExamples},
    │   assertions: [...]
    │ }
    ↓
Client (browser)
    ↓ Parse response
    ↓ Add to available scenarios
    ↓ Allow selection for practice
User can now practice custom scenario
```

## Data Models

### Scenario
```typescript
interface Scenario {
  title: string;                          // e.g., "Salary Negotiation"
  context: string;                        // e.g., "1-on-1 with manager..."
  persona: {
    name: string;                         // e.g., "Michael Torres"
    roleDescription: string;              // e.g., "VP of Engineering"
    difficulty: 'easy' | 'medium' | 'hard';
    characteristics: string[];            // e.g., ["pragmatic", "thoughtful"]
    voiceExamples?: string[];            // e.g., ["I appreciate your thinking"]
  };
  assertions: string[];                   // e.g., ["Acknowledges concerns", "Offers concrete next steps"]
  personaBackground?: string;             // Additional context (optional)
}
```

### Message
```typescript
interface Message {
  role: 'user' | 'assistant';
  text: string;
}
```

### Chat Request
```typescript
interface ChatRequest {
  provider: 'Anthropic' | 'Gemini' | 'OpenAI';
  scenario: Scenario;
  messages: Message[];
}
```

### Chat Response
```typescript
interface ChatResponse {
  message: string;                        // AI-generated response
}
```

### Evaluation Report
```typescript
interface EvaluationReport {
  summary: {
    overallScore: number;                 // 0-100
    feedbackQuality: number;              // 0-100
    adherenceToContext: number;           // 0-100
  };
  feedbackItems: {
    assertion: string;                    // The evaluated assertion
    score: number;                        // 0-100
    feedback: string;                     // Specific feedback
  }[];
  recommendations: string[];              // Improvement suggestions
}
```

### Scenario Request
```typescript
interface ScenarioRequest {
  provider: 'Anthropic' | 'Gemini' | 'OpenAI';
  description: string;                    // User's scenario description
}
```

## State Management

### Client-Side State

**Location:** React component state (no external state management library)

**State Managed:**
- Current scenario selection
- Chat messages history
- Current provider
- UI loading states
- Evaluation report (display only)

**State NOT Managed Server-Side:**
- Message history (regenerated per request)
- User sessions
- Conversation persistence
- Preferences

### Server-Side State

**Location:** Environment variables (Vercel)

**Permanent State:**
- API Keys (encrypted in Vercel)
- Build configuration

**Temporary State:**
- Provider SDK client instances (recreated per request for isolation)
- Request processing state (discarded after response)

## API Contracts

### Request/Response Format

All endpoints follow JSON:API conventions:

**Success Response:**
```json
{
  "message": "..."
}
// or
{
  "feedbackItems": [...],
  // ...
}
```

**Error Response:**
```json
{
  "error": "Human-readable error message",
  "status": 400
}
```

### Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | Success | Request processed |
| 400 | Bad Request | Missing/invalid fields |
| 405 | Method Not Allowed | Wrong HTTP method |
| 500 | Internal Server Error | Provider error, parsing error |

## Security Architecture

### API Key Management

```
┌─────────────────────────────────────────┐
│        Vercel Environment Variables      │
│  (Encrypted at rest, never exposed)     │
│  - ANTHROPIC_API_KEY                    │
│  - GEMINI_API_KEY                       │
│  - OPENAI_API_KEY                       │
└──────────────┬──────────────────────────┘
               │
               ├─ Only accessible in /api functions
               ├─ Used to create SDK clients
               ├─ Never logged
               └─ Never returned to client
```

### Error Sanitization

```
Provider API Error (could contain API key info)
    ↓ Caught in try/catch
    ↓ Check if auth-related
    ↓ Map to generic error message
    ├─ Auth error → "Authentication failed"
    ├─ Parse error → "Failed to parse response"
    └─ Other → "Internal server error"
    ↓
Return safe error to client
    │ {error: "Authentication failed", status: 500}
```

### Input Validation

Each endpoint validates:
1. HTTP method (POST only)
2. Required fields present
3. Field types correct
4. Provider valid
5. Data within reasonable limits

## Performance Architecture

### Caching Strategy

**Edge Caching (Vercel):**
- Static assets (HTML, CSS, JS) cached in CDN
- Long cache expiration for versioned assets
- Short cache for index.html

**Provider Response Caching:**
- Not implemented (fresh responses always)
- Could be added for evaluation results

**Client-Side Caching:**
- Browser localStorage for scenarios (optional)
- Session storage for chat history

### Response Time Optimization

| Operation | Target | Approach |
|-----------|--------|----------|
| Chat | <5s | Use fast provider, optimize prompts |
| Evaluate | <8s | Structured evaluation prompt |
| Scenario | <4s | Efficient generation prompt |
| Cold start | <1s | Keep function small |
| Page load | <2s | Static asset optimization |

### Load Distribution

- **Vercel Edge Network:** Automatic geographic distribution
- **Serverless Scaling:** Automatic horizontal scaling
- **Provider Selection:** Distribute requests across providers
- **Connection Pooling:** Reuse SDK client instances (if stateless allows)

## Deployment Architecture

### Build Pipeline

```
GitHub Push (main branch)
    ↓ Webhook triggers Vercel
Vercel Build Process
    ├─ npm install (dependencies)
    ├─ npm run build (Vite builds React)
    │  └─ Output: dist/ (static assets)
    ├─ Detect /api (TypeScript functions)
    ├─ Compile TypeScript in /api
    └─ Generate optimized bundles
Vercel Deploy
    ├─ Upload dist/ to CDN
    ├─ Deploy functions globally
    ├─ Set environment variables
    └─ Configure routes
Live at {project}.vercel.app
```

### Environment Configuration

**Development (.env.local):**
```
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
```

**Production (Vercel):**
- Set in Dashboard → Settings → Environment Variables
- Available to all functions at runtime
- Encrypted in storage
- Not visible in logs

## Scalability Considerations

### Current Capacity

- **Concurrent users:** Elastic (scales automatically)
- **Monthly invocations:** Unlimited (within provider API quotas)
- **Cost model:** Pay-per-invocation + duration
- **Cold starts:** Expected and acceptable

### Scaling Points

1. **Frontend:** Served by Vercel CDN (infinite scalability)
2. **Serverless functions:** Auto-scale (infinite invocations)
3. **Provider APIs:** Limited by provider quotas (Gemini 15 RPM, others plan-dependent)

### Future Scaling Needs

**Phase 2 (1000+ daily users):**
- Add database for message persistence
- Implement user authentication
- Add caching layer (Redis)
- Monitor provider API usage

**Phase 3 (10000+ daily users):**
- Distribute across multiple AI providers
- Implement load balancing
- Add message queuing (Bull, RabbitMQ)
- Real-time analytics

## Monitoring & Observability

### Logging

**Client-side:**
- Console errors for development
- No sensitive data logged
- No user tracking

**Server-side:**
- Function execution logs (Vercel dashboard)
- Error logs with context
- No API key logging
- No request body logging

### Metrics

**Available in Vercel Dashboard:**
- Invocation count per function
- Response time percentiles
- Error rate
- Cold start frequency

### Alerts (Not Implemented)

**Future additions:**
- High error rate (>5%)
- Response time >10s
- Cold start increase
- Provider API failure

## Integration Points

### External Services

1. **Anthropic API**
   - Authentication: API key
   - Endpoint: `https://api.anthropic.com`
   - Rate limit: Plan dependent

2. **Google Gemini API**
   - Authentication: API key
   - Endpoint: `https://generativelanguage.googleapis.com`
   - Rate limit: 15 RPM free, 1000 RPM paid

3. **OpenAI API**
   - Authentication: API key
   - Endpoint: `https://api.openai.com`
   - Rate limit: Plan dependent

### Version Compatibility

| Component | Version | Status |
|-----------|---------|--------|
| React | 19.2.4 | Current |
| TypeScript | 5.8 | Current |
| Node.js | 18+ | Supported |
| Vite | 6.2.0 | Current |
| Vercel | Latest | Auto-updated |

## Testing Architecture

### Unit Testing (Not Implemented)

Future additions:
- API endpoint tests
- Provider abstraction tests
- Prompt builder tests
- Error sanitization tests

### Integration Testing (Not Implemented)

Future additions:
- End-to-end chat flow
- Evaluation workflow
- Scenario generation
- Provider switching

### Manual Testing

Current approach:
- Test locally with `npm run dev`
- Test endpoints with curl/Postman
- Verify in Vercel deployment

## Disaster Recovery

### Data Loss Prevention

- No persistent data at risk (stateless architecture)
- API keys in Vercel encrypted backups
- Source code in GitHub (version control)

### Service Continuity

- Multi-provider support (switch if one fails)
- Automatic failover (user can select different provider)
- CDN serving static assets (resilient to backend issues)

### Rollback Plan

- Revert GitHub commit
- Vercel automatically redeploys previous version
- Full rollback <5 minutes

## Compliance & Security

### Security Practices

- ✅ API keys in environment variables only
- ✅ No secrets in code or logs
- ✅ HTTPS enforcement (automatic)
- ✅ Input validation
- ✅ Error sanitization
- ✅ No CSRF protection needed (stateless)
- ✅ No CORS headers needed (same-origin)

### Data Protection

- ✅ No user data stored server-side
- ✅ No cookies or tracking
- ✅ GDPR compliant
- ✅ No third-party analytics

### Code Quality

- ✅ TypeScript for type safety
- ✅ Error handling throughout
- ✅ Code review standards
- ✅ No hardcoded secrets

