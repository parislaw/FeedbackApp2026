# API Reference

## Overview

All API endpoints are serverless functions deployed to Vercel. They follow RESTful conventions with JSON request/response bodies.

**Base URL:** `https://{your-vercel-domain}/api/`

**Protocol:** HTTPS (required)

**Content-Type:** `application/json`

---

## Global Response Format

### Success Response

```json
{
  "message": "...",
  "data": {}
}
```

### Error Response

All errors follow consistent format:

```json
{
  "error": "User-friendly error message",
  "status": 400
}
```

### Error Codes

| Code | Meaning | Cause |
|------|---------|-------|
| 400 | Bad Request | Missing/invalid required fields |
| 405 | Method Not Allowed | Wrong HTTP method (all endpoints require POST) |
| 429 | Too Many Requests | Rate limit exceeded (60 requests per minute per IP) |
| 500 | Internal Server Error | Provider error, auth failure, or parsing error |

**Rate limiting:** All endpoints are limited to 60 requests per minute per client IP (in-memory per instance). On 429, retry after a short delay.

---

## POST /api/chat

Start or continue multi-turn conversation with an AI persona.

### Purpose
Route chat messages to configured AI provider with persona-based system prompting.

### Request

**Method:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "provider": "Anthropic|Gemini|OpenAI",
  "scenario": {
    "persona": {
      "name": "string",
      "roleDescription": "string",
      "difficulty": "easy|medium|hard",
      "characteristics": ["string"],
      "voiceExamples": ["string"]
    },
    "assertions": ["string"],
    "personaBackground": "string (optional)"
  },
  "messages": [
    {
      "role": "user|assistant",
      "text": "string"
    }
  ]
}
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| provider | string | Yes | AI provider: `Anthropic`, `Gemini`, or `OpenAI` |
| scenario | object | Yes | Scenario object containing persona and assertions |
| scenario.persona | object | Yes | Persona definition for system prompt |
| scenario.persona.name | string | Yes | Persona's name |
| scenario.persona.roleDescription | string | Yes | Role and responsibilities |
| scenario.persona.difficulty | string | Yes | Practice difficulty level |
| scenario.persona.characteristics | array | Yes | Personality traits array |
| scenario.persona.voiceExamples | array | No | Example phrases (optional) |
| scenario.assertions | array | Yes | Scenario assertions to evaluate against |
| scenario.personaBackground | string | No | Additional context about persona |
| messages | array | Yes | Message history, newest last |
| messages[].role | string | Yes | `user` or `assistant` |
| messages[].text | string | Yes | Message content |

### Response

```json
{
  "message": "AI-generated response text"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| message | string | The AI model's response |

### Examples

**Request:**
```bash
curl -X POST https://your-domain/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "Anthropic",
    "scenario": {
      "persona": {
        "name": "Sarah Chen",
        "roleDescription": "Senior manager with 10 years experience",
        "difficulty": "hard",
        "characteristics": ["direct", "analytical", "empathetic"],
        "voiceExamples": ["I appreciate your perspective"]
      },
      "assertions": ["Acknowledges employee concerns", "Offers concrete next steps"],
      "personaBackground": "Leading a high-performing team"
    },
    "messages": [
      {
        "role": "user",
        "text": "Hi Sarah, I wanted to discuss my career growth opportunities."
      }
    ]
  }'
```

**Response:**
```json
{
  "message": "That's great that you're thinking about your career development. I'd like to hear more about your aspirations and see how we can align them with our team's direction."
}
```

**Error Response (Missing Fields):**
```json
{
  "error": "Missing required fields: provider, scenario, messages",
  "status": 400
}
```

**Error Response (Auth Failure):**
```json
{
  "error": "Authentication failed",
  "status": 500
}
```

### Notes

- **Stateless:** Each request includes full conversation history
- **History format:** Client sends messages array with complete conversation
- **System prompt:** Built server-side from persona data
- **Response length:** Typically 1-3 sentences for natural conversation flow
- **Cold start:** First request may take 200-500ms

---

## POST /api/evaluate

Evaluate chat performance against scenario assertions.

### Purpose
Generate detailed evaluation report assessing how well the conversation met success criteria.

### Request

**Method:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "provider": "Anthropic|Gemini|OpenAI",
  "scenario": {
    "title": "string",
    "context": "string",
    "assertions": ["string"]
  },
  "transcript": [
    {
      "role": "user|assistant",
      "text": "string"
    }
  ]
}
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| provider | string | Yes | AI provider: `Anthropic`, `Gemini`, or `OpenAI` |
| scenario | object | Yes | Scenario metadata |
| scenario.title | string | Yes | Scenario title for context |
| scenario.context | string | Yes | Situational context |
| scenario.assertions | array | Yes | Success criteria to evaluate against |
| transcript | array | Yes | Complete conversation to evaluate |
| transcript[].role | string | Yes | `user` or `assistant` |
| transcript[].text | string | Yes | Message content |

### Response

```json
{
  "summary": {
    "overallScore": 0,
    "feedbackQuality": 0,
    "adherenceToContext": 0
  },
  "feedbackItems": [
    {
      "assertion": "string",
      "score": 0,
      "feedback": "string"
    }
  ],
  "recommendations": ["string"]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| summary | object | Overall evaluation metrics |
| summary.overallScore | number | 0-100 overall performance |
| summary.feedbackQuality | number | 0-100 quality of feedback given |
| summary.adherenceToContext | number | 0-100 adherence to scenario |
| feedbackItems | array | Evaluation of each assertion |
| feedbackItems[].assertion | string | The assertion being evaluated |
| feedbackItems[].score | number | 0-100 score for this assertion |
| feedbackItems[].feedback | string | Specific feedback on this assertion |
| recommendations | array | List of improvement recommendations |

### Examples

**Request:**
```bash
curl -X POST https://your-domain/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "Anthropic",
    "scenario": {
      "title": "Difficult Conversation Practice",
      "context": "Manager discussing performance issues with direct report",
      "assertions": [
        "Acknowledges the employee concern empathetically",
        "Provides specific examples of issues",
        "Offers clear path forward with next steps"
      ]
    },
    "transcript": [
      {
        "role": "user",
        "text": "Hi Sarah, I wanted to discuss my career growth opportunities."
      },
      {
        "role": "assistant",
        "text": "That'\''s great that you'\''re thinking about your career development. I'\''d like to hear more about your aspirations and see how we can align them with our team'\''s direction."
      },
      {
        "role": "user",
        "text": "I feel like I haven'\''t had enough opportunity to lead projects."
      },
      {
        "role": "assistant",
        "text": "I hear you. I've noticed the same thing, and I want to change that. I'd like to have you lead the Q2 dashboard redesign project. Let'\''s meet next week to discuss the scope and your vision for it."
      }
    ]
  }'
```

**Response:**
```json
{
  "summary": {
    "overallScore": 85,
    "feedbackQuality": 88,
    "adherenceToContext": 82
  },
  "feedbackItems": [
    {
      "assertion": "Acknowledges the employee concern empathetically",
      "score": 90,
      "feedback": "Good acknowledgment of career growth interest and invitation to discuss"
    },
    {
      "assertion": "Provides specific examples of issues",
      "score": 80,
      "feedback": "Mentioned 'haven't had enough opportunity to lead' - could have been more specific"
    },
    {
      "assertion": "Offers clear path forward with next steps",
      "score": 85,
      "feedback": "Excellent: offered specific project and meeting to discuss scope"
    }
  ],
  "recommendations": [
    "Consider earlier acknowledgment of the employee's past contributions",
    "Add more specificity when discussing observed gaps",
    "Strong job offering concrete project opportunity"
  ]
}
```

**Error Response:**
```json
{
  "error": "Missing required fields: provider, scenario, transcript",
  "status": 400
}
```

### Notes

- **Scoring:** 0-100 integer values (0 = not met, 100 = perfectly met)
- **Assertion count:** Usually 3-5 assertions per scenario
- **Response time:** 3-8 seconds depending on transcript length
- **Transcript size:** Recommended max 50 messages (~500KB)

---

## POST /api/scenario

Generate custom practice scenarios from user description.

### Purpose
Create new scenarios dynamically for practice scenarios not in the preset list.

### Request

**Method:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "provider": "Anthropic|Gemini|OpenAI",
  "description": "string"
}
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| provider | string | Yes | AI provider: `Anthropic`, `Gemini`, or `OpenAI` |
| description | string | Yes | Description of desired scenario (50-500 characters) |

### Response

```json
{
  "title": "string",
  "context": "string",
  "persona": {
    "name": "string",
    "roleDescription": "string",
    "difficulty": "easy|medium|hard",
    "characteristics": ["string"],
    "voiceExamples": ["string"]
  },
  "assertions": ["string"]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| title | string | Scenario title (max 100 chars) |
| context | string | Situational context |
| persona | object | Persona definition |
| persona.name | string | Persona's name |
| persona.roleDescription | string | Role and responsibilities |
| persona.difficulty | string | `easy`, `medium`, or `hard` |
| persona.characteristics | array | 3-5 personality traits |
| persona.voiceExamples | array | 2-3 example phrases |
| assertions | array | 3-5 success criteria |

### Examples

**Request:**
```bash
curl -X POST https://your-domain/api/scenario \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "Anthropic",
    "description": "I need to practice asking for a raise from my manager. The manager is open but cautious about budget constraints."
  }'
```

**Response:**
```json
{
  "title": "Negotiating a Salary Increase",
  "context": "One-on-one meeting with your direct manager. Company had a decent year, but budget is still tight. You've been with the company for 2 years and taken on additional responsibilities.",
  "persona": {
    "name": "Michael Torres",
    "roleDescription": "VP of Engineering with hiring authority. Focused on budget responsibility but recognizes good performers.",
    "difficulty": "medium",
    "characteristics": [
      "pragmatic",
      "budget-conscious",
      "appreciative of preparation"
    ],
    "voiceExamples": [
      "I appreciate you thinking this through",
      "Let me see what I can do"
    ]
  },
  "assertions": [
    "Presents clear case for raise based on contributions",
    "Addresses budget concerns realistically",
    "Proposes timeline for decision"
  ]
}
```

**Error Response (Empty Description):**
```json
{
  "error": "Missing required fields: provider, description",
  "status": 400
}
```

### Notes

- **Description quality:** Clear descriptions yield better scenarios
- **Generation time:** 2-4 seconds
- **Response structure:** Always matches Scenario type schema
- **Difficulty levels:** Affects persona behaviors and conversation complexity

---

## POST /api/transcribe

Transcribe audio to text (speech-to-text).

### Purpose
Convert an audio recording (e.g. feedback conversation) to plain text. Used with **Upload for feedback** when the user uploads audio; the result is then sent to `/api/feedback-on-transcript`.

### Request

**Method:** `POST`

**Headers:** `Content-Type: application/json`

**Body:**
```json
{
  "provider": "Gemini|Anthropic|OpenAI",
  "audio": "base64-encoded audio bytes",
  "audioMimeType": "audio/webm"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| provider | string | Yes | `Gemini`, `Anthropic`, or `OpenAI` (Anthropic uses Gemini for transcription) |
| audio | string | Yes | Base64-encoded audio data |
| audioMimeType | string | Yes | One of: `audio/mp3`, `audio/mpeg`, `audio/wav`, `audio/m4a`, `audio/aac`, `audio/webm` |

**Size limit:** Request body (audio) must not exceed 5MB decoded.

### Response

```json
{
  "transcript": "Transcribed text...",
  "status": 200
}
```

**Error (413):** `Audio file exceeds 5MB limit`

---

## POST /api/feedback-on-transcript

Get feedback and recommendations on a feedback conversation transcript (no scenario).

### Purpose
Evaluate quality of feedback and phrasing in an uploaded or pasted transcript. Returns the same `EvaluationReport` shape as `/api/evaluate` (scores, what worked, what broke down, recommendations).

### Request

**Method:** `POST`

**Headers:** `Content-Type: application/json`

**Body:**
```json
{
  "provider": "Gemini|Anthropic|OpenAI",
  "transcript": "plain text or array of turns"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| provider | string | Yes | AI provider |
| transcript | string \| array | Yes | Plain text (e.g. from `/api/transcribe`) or `[{ "role": "user" \| "model", "text": "..." }]` |

### Response

Same as **POST /api/evaluate**: `EvaluationReport` with `giverScores`, `summary` (whatWorked, whatBrokeDown, highestLeverageImprovement), and `recommendations`.

---

## Environment Variables

All endpoints require these environment variables configured in Vercel:

| Variable | Required | Source | Notes |
|----------|----------|--------|-------|
| `GEMINI_API_KEY` | If using Gemini | [Google AI Studio](https://aistudio.google.com) | 39-character alphanumeric string |
| `ANTHROPIC_API_KEY` | If using Anthropic | [Anthropic Console](https://console.anthropic.com) | Starts with `sk-ant-` |
| `OPENAI_API_KEY` | If using OpenAI | [OpenAI API Keys](https://platform.openai.com/api-keys) | Starts with `sk-` |

**Local Development (.env.local):**
```
GEMINI_API_KEY=your_gemini_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here
```

**Production (Vercel):**
- Set via Vercel Dashboard → Project Settings → Environment Variables
- Automatically available to all serverless functions
- Never committed to version control

---

## Rate Limiting & Quotas

No client-side rate limiting implemented (stateless architecture). Implement in production:

- **Recommendation:** 100 requests/minute per IP
- **Long-term:** Implement user authentication and per-user quotas
- **Provider limits:**
  - **Gemini:** 15 RPM free tier, 1000 RPM paid
  - **Anthropic:** Varies by plan
  - **OpenAI:** Varies by plan

---

## Data Types

### Scenario

```typescript
{
  title: string;
  context: string;
  persona: {
    name: string;
    roleDescription: string;
    difficulty: "easy" | "medium" | "hard";
    characteristics: string[];
    voiceExamples?: string[];
  };
  assertions: string[];
  personaBackground?: string;
}
```

### Message

```typescript
{
  role: "user" | "assistant";
  text: string;
}
```

### EvaluationReport

```typescript
{
  summary: {
    overallScore: number;        // 0-100
    feedbackQuality: number;     // 0-100
    adherenceToContext: number;  // 0-100
  };
  feedbackItems: {
    assertion: string;
    score: number;               // 0-100
    feedback: string;
  }[];
  recommendations: string[];
}
```

---

## Testing

### cURL Examples

**Chat:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"provider":"Anthropic","scenario":{"persona":{"name":"Test","roleDescription":"Test","difficulty":"easy","characteristics":["test"]},"assertions":["test"]},"messages":[{"role":"user","text":"Hello"}]}'
```

**Evaluate:**
```bash
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"provider":"Anthropic","scenario":{"title":"Test","context":"Test","assertions":["test"]},"transcript":[{"role":"user","text":"Hello"},{"role":"assistant","text":"Hi"}]}'
```

**Scenario:**
```bash
curl -X POST http://localhost:3000/api/scenario \
  -H "Content-Type: application/json" \
  -d '{"provider":"Anthropic","description":"Test scenario"}'
```

### Local Testing Setup

1. Create `.env.local` with API keys
2. Run `npm run dev`
3. Functions available at `http://localhost:3000/api/*`
4. Test with curl or Postman

---

## Error Handling

### Common Errors

| Error | Status | Cause | Solution |
|-------|--------|-------|----------|
| Method not allowed | 405 | Wrong HTTP method | Use POST |
| Missing required fields | 400 | Incomplete request | Check field names and types |
| Authentication failed | 500 | Invalid API key | Verify env variables in Vercel |
| Failed to parse response | 500 | Invalid JSON from provider | Check request format |
| Unknown provider | 400 | Invalid provider name | Use Anthropic, Gemini, or OpenAI |

### Error Messages

All error messages are sanitized:
- API key errors → "Authentication failed"
- Parsing errors → Provider-specific message
- Generic server errors → "Internal server error"

---

## Best Practices

1. **Always send full history:** Each request needs complete message history
2. **Validate locally:** Validate request format before sending
3. **Handle cold starts:** Expect 200-500ms first invocation
4. **Implement retry logic:** Handle transient failures
5. **Monitor quota usage:** Track API usage per provider
6. **Use stable provider:** Pick one provider per session to reduce latency

