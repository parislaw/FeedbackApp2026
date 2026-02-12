# Code Standards

## Overview

This document defines coding standards and best practices for the Lumenalta feedback app, covering both frontend (React/TypeScript) and backend (Vercel serverless functions).

## File Organization

### Directory Structure

```
lumenalta-feedback-app/
├── src/                          # Frontend source
│   ├── App.tsx                   # Main app component
│   ├── main.tsx                  # Entry point
│   ├── components/               # Reusable components
│   │   ├── chat-interface.tsx
│   │   ├── scenario-selector.tsx
│   │   └── evaluation-report.tsx
│   ├── services/                 # API client services
│   │   ├── api-client.ts
│   │   └── scenario-service.ts
│   └── types.ts                  # Shared type definitions
├── api/                          # Serverless functions
│   ├── chat.ts                   # POST /api/chat
│   ├── evaluate.ts               # POST /api/evaluate
│   ├── scenario.ts               # POST /api/scenario
│   └── _lib/                     # Shared utilities
│       ├── response-helpers.ts
│       ├── provider-factory.ts
│       └── prompt-builder.ts
├── public/                       # Static assets
├── docs/                         # Documentation
└── vercel.json                   # Vercel config
```

### File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| React components | PascalCase.tsx | `ChatInterface.tsx` |
| Services | kebab-case.ts | `api-client.ts` |
| Utilities | kebab-case.ts | `response-helpers.ts` |
| Types | kebab-case.ts | `types.ts` |
| Tests | kebab-case.test.ts | `api-client.test.ts` |

## TypeScript Standards

### Type Definitions

**Always define types for function parameters and returns:**

```typescript
// ✅ Good
interface Scenario {
  title: string;
  context: string;
  persona: Persona;
  assertions: string[];
}

export async function chat(
  scenario: Scenario,
  messages: Message[]
): Promise<ChatResponse> {
  // implementation
}

// ❌ Bad
export async function chat(scenario: any, messages: any): any {
  // implementation
}
```

### Union Types for Providers

```typescript
// ✅ Good - Explicit provider type
export type Provider = 'Gemini' | 'Anthropic' | 'OpenAI';

interface ChatRequest {
  provider: Provider;
  // ...
}

// ❌ Bad - Too permissive
interface ChatRequest {
  provider: string;
  // ...
}
```

### Const Assertions

```typescript
// ✅ Good - Type-safe provider list
const PROVIDERS = ['Gemini', 'Anthropic', 'OpenAI'] as const;
type Provider = (typeof PROVIDERS)[number];

// ❌ Bad - Easy to introduce typos
const providers = ['Gemini', 'Anthropic', 'OpenAi']; // Oops!
```

## Serverless Function Standards

### Structure

Every serverless function follows this pattern:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateMethod, sendError } from './_lib/response-helpers';
import { getAnthropicClient } from './_lib/provider-factory';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // 1. Validate HTTP method
  if (!validateMethod(req, res, 'POST')) return;

  try {
    // 2. Validate and extract request data
    const { provider, scenario } = req.body;
    if (!provider || !scenario) {
      return sendError(res, 400, 'Missing required fields');
    }

    // 3. Process request
    const result = await processRequest(provider, scenario);

    // 4. Return response
    return res.status(200).json(result);
  } catch (error) {
    // 5. Handle errors gracefully
    console.error('Function error:', error);
    const message = sanitizeError(error);
    return sendError(res, 500, message);
  }
}

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown error';
  // Hide API key errors
  if (message.includes('API key') || message.includes('authentication')) {
    return 'Authentication failed';
  }
  return 'Internal server error';
}
```

### Error Handling

**Always sanitize errors before returning to client:**

```typescript
// ✅ Good - Sanitized error
try {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // ...
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const isAuthError = message.includes('API key');
  const safeMessage = isAuthError ? 'Authentication failed' : 'Internal error';
  return sendError(res, 500, safeMessage);
}

// ❌ Bad - Exposes internal details
} catch (error) {
  return sendError(res, 500, String(error)); // Could expose API keys!
}
```

### Provider Integration Pattern

```typescript
// ✅ Good - Consistent provider handling
switch (provider) {
  case 'Anthropic': {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: systemPrompt,
      messages: anthropicMessages,
    });
    return extractText(response);
  }
  case 'Gemini': {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: geminiContents,
      config: { systemInstruction: systemPrompt },
    });
    return response.text ?? '';
  }
  default:
    return sendError(res, 400, `Unknown provider: ${provider}`);
}
```

### JSON Response Handling

```typescript
// ✅ Good - Handle JSON parsing gracefully
try {
  evaluationJson = JSON.parse(response.text ?? '{}');
} catch {
  return sendError(res, 500, 'Failed to parse AI response as JSON');
}

// ✅ Good - Strip markdown code fences
export function parseJsonBody(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\n?/i, '')  // Remove opening fence
    .replace(/\n?```$/i, '')           // Remove closing fence
    .trim();
  return JSON.parse(cleaned);
}
```

## Frontend Component Standards

### React Component Structure

```typescript
// ✅ Good - Clear structure with types
import type { ReactNode } from 'react';
import type { Scenario } from '../types';

interface ChatInterfaceProps {
  scenario: Scenario;
  onEvaluate: (transcript: Message[]) => void;
}

export function ChatInterface({
  scenario,
  onEvaluate,
}: ChatInterfaceProps): ReactNode {
  // Hooks at top
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Event handlers
  const handleSendMessage = (text: string): void => {
    // implementation
  };

  // Render
  return (
    <div className="chat-interface">
      {/* JSX */}
    </div>
  );
}
```

### Props Pattern

```typescript
// ✅ Good - Named interface for clarity
interface ScenarioCardProps {
  scenario: Scenario;
  selected: boolean;
  onSelect: (scenario: Scenario) => void;
}

export function ScenarioCard({
  scenario,
  selected,
  onSelect,
}: ScenarioCardProps) {
  return (
    <button
      onClick={() => onSelect(scenario)}
      className={selected ? 'selected' : ''}
    >
      {scenario.title}
    </button>
  );
}

// ❌ Bad - Prop drilling without interface
export function ScenarioCard(props: any) {
  return <button onClick={props.onSelect}>{props.scenario.title}</button>;
}
```

### State Management

```typescript
// ✅ Good - Clear state with proper typing
const [chatState, setChatState] = useState<ChatState>({
  messages: [],
  loading: false,
  error: null,
});

// ❌ Bad - Too many individual states
const [messages, setMessages] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [provider, setProvider] = useState('');
```

## API Client Standards

### Service Pattern

```typescript
// ✅ Good - Encapsulated API client
export class ChatService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  async chat(
    provider: Provider,
    scenario: Scenario,
    messages: Message[]
  ): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, scenario, messages }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Unknown error');
    }

    return response.json();
  }
}

// Usage
const chatService = new ChatService();
const response = await chatService.chat('Anthropic', scenario, messages);
```

### Error Handling in Services

```typescript
// ✅ Good - Proper error handling
async function chat(request: ChatRequest): Promise<ChatResponse> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new APIError(error.error || 'API request failed', response.status);
    }

    return response.json();
  } catch (error) {
    if (error instanceof APIError) throw error;
    throw new APIError('Network error', 0);
  }
}

// ❌ Bad - Silent failures
async function chat(request: ChatRequest) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return response.json(); // Throws if network error, unclear status
}
```

## Environment Variables

### Server-Side Only

**Backend `.env.local` (development):**
```bash
# ✅ Correct - Backend can access these
GEMINI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
```

**Frontend cannot access:**
```typescript
// ❌ Wrong - Would be exposed in bundle
const apiKey = process.env.VITE_ANTHROPIC_API_KEY;

// ✅ Correct - Only serverless functions access
// In /api/chat.ts:
const apiKey = process.env.ANTHROPIC_API_KEY;
```

### Accessing in Vercel Functions

```typescript
// ✅ Good - Access with type safety
function getApiKey(provider: Provider): string {
  const envKey: Record<Provider, string> = {
    Gemini: 'GEMINI_API_KEY',
    Anthropic: 'ANTHROPIC_API_KEY',
    OpenAI: 'OPENAI_API_KEY',
  };

  const key = process.env[envKey[provider]];
  if (!key) {
    throw new Error(`${envKey[provider]} not configured`);
  }
  return key;
}

// ❌ Bad - No validation
const apiKey = process.env.ANTHROPIC_API_KEY; // Could be undefined!
```

## Logging Standards

### Development Logging

```typescript
// ✅ Good - Contextual logging
console.error('Chat API error:', {
  provider,
  messageCount: messages.length,
  error: error instanceof Error ? error.message : 'Unknown',
});

// ❌ Bad - Too much noise
console.log('Starting chat handler');
console.log('Received:', req.body);
console.log('Processing...');
```

### Sensitive Data Protection

```typescript
// ✅ Good - Never log credentials
console.log('Chat request:', { provider, messageCount: messages.length });
// NOT: console.log(req.body) - Could contain user data

// ✅ Good - Sanitize error messages
const message = error instanceof Error ? error.message : 'Unknown error';
const safeMessage = message.includes('API') ? 'Authentication error' : message;
console.error('Evaluation failed:', safeMessage);

// ❌ Bad - Exposes everything
console.error('Full error:', error);
console.log('Request body:', JSON.stringify(req.body));
```

## Error Messages

### User-Facing Messages

```typescript
// ✅ Good - Clear, helpful messages
{
  error: 'Failed to generate response. Please try again.',
  status: 500
}

// ❌ Bad - Technical jargon
{
  error: 'TypeError: Cannot read property "text" of undefined',
  status: 500
}
```

### API Error Standardization

```typescript
// ✅ Good - Consistent structure
interface APIError {
  error: string;
  status: number;
}

const errors = {
  INVALID_PROVIDER: { error: 'Unknown provider', status: 400 },
  MISSING_FIELDS: { error: 'Missing required fields', status: 400 },
  AUTH_FAILED: { error: 'Authentication failed', status: 500 },
  PARSE_ERROR: { error: 'Failed to parse response', status: 500 },
};
```

## Testing Standards

### Unit Test Pattern

```typescript
// ✅ Good - Clear test structure
import { describe, it, expect } from 'vitest';
import { ChatService } from './chat-service';

describe('ChatService', () => {
  it('should send chat request with correct format', async () => {
    const service = new ChatService();
    const request = {
      provider: 'Anthropic',
      scenario: { /* ... */ },
      messages: [{ role: 'user', text: 'Hello' }],
    };

    const response = await service.chat(request);

    expect(response).toHaveProperty('message');
    expect(typeof response.message).toBe('string');
  });

  it('should handle API errors gracefully', async () => {
    const service = new ChatService();
    const invalidRequest = {
      provider: 'Invalid',
      scenario: null,
      messages: [],
    };

    await expect(() => service.chat(invalidRequest)).rejects.toThrow();
  });
});
```

## Code Quality Guidelines

### Complexity Management

**Keep functions focused:**
```typescript
// ✅ Good - Single responsibility
export async function chat(
  provider: Provider,
  scenario: Scenario,
  messages: Message[]
): Promise<string> {
  const client = createClient(provider);
  const formattedMessages = formatMessages(messages);
  return requestChat(client, scenario, formattedMessages);
}

// ❌ Bad - Too much responsibility
export async function chat(provider, scenario, messages, evaluate, save) {
  // 50+ lines doing multiple things
}
```

### Function Length

- **Target:** Under 50 lines
- **Maximum:** 100 lines before extracting
- **Serverless functions:** Under 200 lines (includes comments)

### Naming Conventions

```typescript
// ✅ Good - Clear, descriptive names
function buildPersonaSystemPrompt(scenario: Scenario): string
function sanitizeErrorMessage(error: Error): string
function parseJsonResponse(text: string): object

// ❌ Bad - Ambiguous or too short
function build(s): string
function clean(e): string
function parse(t): object
```

## Security Best Practices

### Never Expose Secrets

```typescript
// ✅ Good - Secure secret handling
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY not configured');
}

// ❌ Bad - Exposes secret
console.log('Using key:', process.env.ANTHROPIC_API_KEY);
```

### Input Validation

```typescript
// ✅ Good - Validate all inputs
function validateRequest(body: unknown): ChatRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const { provider, scenario, messages } = body as Record<string, unknown>;

  if (!provider || !scenario || !Array.isArray(messages)) {
    throw new Error('Missing required fields');
  }

  if (!['Anthropic', 'Gemini', 'OpenAI'].includes(String(provider))) {
    throw new Error('Invalid provider');
  }

  return { provider, scenario, messages };
}

// ❌ Bad - No validation
function handleRequest(body: ChatRequest) {
  // Trust body is valid
}
```

### CORS & Headers

```typescript
// ✅ Good - Secure headers
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // Handle CORS if needed
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }
}
```

## Performance Standards

### Response Times

| Operation | Target | Max |
|-----------|--------|-----|
| Chat response | <5s | 30s |
| Evaluation | <8s | 30s |
| Scenario gen | <4s | 30s |
| Cold start | <1s | 2s |

### Optimization Practices

```typescript
// ✅ Good - Efficient message history
const MAX_HISTORY = 20;
if (messages.length > MAX_HISTORY) {
  messages = messages.slice(-MAX_HISTORY);
}

// ✅ Good - Cache clients
let cachedClient: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  return (cachedClient ??= new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  }));
}
```

## Documentation Standards

### JSDoc Comments

```typescript
// ✅ Good - Comprehensive documentation
/**
 * Builds a system prompt for the given scenario persona.
 *
 * @param scenario - The scenario containing persona definition
 * @returns System prompt string for AI model
 * @throws Error if persona data is invalid
 *
 * @example
 * const prompt = buildPersonaSystemPrompt(scenario);
 * const response = await client.messages.create({
 *   system: prompt,
 *   messages: messages,
 * });
 */
export function buildPersonaSystemPrompt(scenario: Scenario): string {
  // implementation
}

// ❌ Bad - No documentation
export function buildPersonaSystemPrompt(scenario) {
  // implementation
}
```

### README Examples

Every feature should have:
1. Purpose statement
2. Usage example
3. Error handling shown
4. Links to related docs

## Commit Message Standards

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Test addition/modification

### Examples

```
feat(api/chat): add streaming support for chat responses

- Implement Server-Sent Events for real-time responses
- Add progress indicators in UI
- Tests for streaming timeout handling

Closes #123
```

```
fix(serverless): sanitize API key errors in responses

Prevent API key exposure in error messages to users.
All auth errors now return generic "Authentication failed" message.

Fixes #456
```

## Linting & Formatting

### TypeScript Compilation

```bash
# Check for compilation errors
npx tsc --noEmit

# Fix common issues
npx tsc --noEmit --pretty
```

### Pre-commit Hooks

```bash
# Run before commit
npm run build  # Verify builds
npm run test   # Verify tests pass
```

## Review Checklist

Before submitting code for review:

- [ ] TypeScript compiles without errors
- [ ] All functions have proper type annotations
- [ ] No API keys or secrets in code
- [ ] Error messages are sanitized
- [ ] Tests pass locally
- [ ] Functions under 100 lines
- [ ] Comments explain "why", not "what"
- [ ] Commit messages follow standards
- [ ] No console.log statements left in production code

