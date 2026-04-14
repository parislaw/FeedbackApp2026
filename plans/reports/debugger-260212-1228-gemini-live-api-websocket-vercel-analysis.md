# Gemini Live API WebSocket & Vercel Serverless — Technical Analysis

**Date:** 2026-02-12
**ID:** debugger-260212-1228-gemini-live-api-websocket-vercel-analysis

---

## Executive Summary

**Current implementation is broken for production:** `VoiceInterface.tsx` connects directly to Gemini Live API from the browser using a hardcoded `process.env.API_KEY`. This exposes the Google API key client-side, which Google explicitly prohibits. The Vercel deployment cannot host a WebSocket proxy due to serverless architecture constraints. The recommended fix is to add a Vercel serverless endpoint that issues **ephemeral tokens** (short-lived, 1-min window to open session, 30-min session lifetime), allowing the browser to connect directly and securely to Gemini Live API without a persistent server-side WebSocket proxy.

---

## 1. Current Implementation Analysis (`VoiceInterface.tsx`)

### Connection Mechanism
- Uses `@google/genai` SDK (`ai.live.connect()`), which internally opens a WebSocket to:
  `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent`
- Connection is **browser-to-Google-directly** (client-to-server pattern)
- Session is stateful, bidirectional, persistent for session duration

### Protocol / Message Format
- **Transport:** WebSocket (WSS)
- **Audio input:** PCM 16-bit, 16kHz, base64-encoded, `audio/pcm;rate=16000`
- **Audio output:** PCM 16-bit, 24kHz, base64-encoded (decoded with `Int16Array`)
- **Turn management:** Server sends `serverContent.turnComplete` to signal end of AI turn
- **Interruption:** Server sends `serverContent.interrupted` — client stops queued audio

### Critical Security Flaw
```ts
// Line 80 — VoiceInterface.tsx
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
```
- `process.env.API_KEY` in a Vite browser build resolves at **build time** and is embedded in the JS bundle
- The API key is **publicly visible** in production
- Google's documentation explicitly warns: **"Do not use API keys in client-side (browser-based) applications"**

---

## 2. Vercel Serverless WebSocket Constraints

### Verdict: Native WebSocket NOT supported on Vercel serverless functions

| Feature | Vercel Serverless | Vercel Edge Functions | Vercel Fluid Compute |
|---|---|---|---|
| HTTP Request/Response | Yes | Yes | Yes |
| Server-Sent Events (SSE) | Yes | Yes | Yes (longer timeout) |
| Long-running connections | No | No | No |
| Native WebSocket upgrade | No | No | No |
| Max execution time | 60s (Hobby), 300s (Pro) | 25s | Extended (Pro) |

### Why WebSocket Proxy Won't Work
A WebSocket proxy for Gemini Live API requires:
1. Upgrading the HTTP connection to WebSocket (possible in some environments)
2. Maintaining the connection for the **full session duration** (30+ minutes possible)
3. Bidirectional streaming between client ↔ proxy ↔ Gemini

Vercel functions terminate after max execution time. Even with Fluid Compute, there is no persistent connection model. Third-party services (Ably, Pusher, Partykit) provide WebSocket infrastructure but add latency and cost for real-time audio — unsuitable for sub-100ms audio streaming.

---

## 3. Alternative Approaches

### Option A: Ephemeral Tokens (RECOMMENDED)

**Architecture:**
```
Browser → POST /api/voice-token → Vercel Serverless → Google Provisioning API
                                        ↓
                              Returns short-lived token
                                        ↓
Browser → WSS (Gemini Live API directly) using ephemeral token
```

**How it works:**
- Vercel function calls Google's auth token provisioning API server-side (API key stays server-side)
- Returns a token with:
  - `newSessionExpireTime`: 1 minute to open a Live API session
  - `expireTime`: up to 30 minutes for message transmission
- Browser uses the token as the `apiKey` value in `GoogleGenAI({ apiKey: ephemeralToken })`
- Direct browser-to-Google WebSocket — no persistent proxy needed

**Implementation sketch (Vercel endpoint):**
```ts
// api/voice-token.ts
import { GoogleGenAI } from '@google/genai';
export default async function handler(req, res) {
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  const token = await ai.authTokens.create({
    config: {
      uses: 1,
      expireTime: /* 30 min from now */,
      newSessionExpireTime: /* 1 min from now */,
    }
  });
  res.json({ token: token.name });
}
```

**Pros:** Minimal architecture change, no latency added, API key protected, Google-recommended pattern
**Cons:** One extra HTTP round-trip before session starts (~50–200ms, acceptable)

---

### Option B: Server-Sent Events (SSE) — NOT suitable for voice

SSE is unidirectional (server → client only). For audio input, the browser would still need to POST audio chunks. This creates:
- High latency from HTTP overhead per audio chunk
- No real-time interruption handling
- **Verdict: Unsuitable for live voice interaction**

---

### Option C: Polling — NOT suitable for voice

Polling introduces 100–500ms minimum latency per exchange. Real-time audio requires < 50ms round-trip for a natural conversation feel.
**Verdict: Not viable for voice.**

---

### Option D: Third-party WebSocket Proxy (Partykit, Rivet)

Rivet (Oct 2025) added WebSocket server support for Vercel Functions. Partykit provides persistent WebSocket rooms. Both could proxy Gemini Live API connections.

**Cons for this use case:**
- Adds 3rd-party dependency and cost
- Audio data routed through additional hop (latency + bandwidth cost)
- Partykit/Rivet servers add ~20–80ms latency
- Unnecessary given ephemeral tokens solve the security problem directly
- **Verdict: Overkill. Viable only if multi-user session sharing is needed.**

---

## 4. Feasibility Assessment

| Approach | Security | Latency | Complexity | Vercel-compatible | Recommended |
|---|---|---|---|---|---|
| Current (API key in browser) | FAIL | Best | Low | Yes | NO — key exposed |
| Ephemeral tokens | Pass | +50-200ms init | Low | Yes | YES |
| SSE | Pass | High | Medium | Yes | No — unidirectional |
| Polling | Pass | Very High | Low | Yes | No — too slow |
| Rivet/Partykit proxy | Pass | +20-80ms | High | Yes | No — unnecessary complexity |

---

## 5. Recommended Approach: Ephemeral Token Flow

1. Add `api/voice-token.ts` — serverless endpoint that generates ephemeral token using server-side API key
2. Update `VoiceInterface.tsx` to:
   a. Fetch ephemeral token from `/api/voice-token` before connecting
   b. Pass token to `GoogleGenAI({ apiKey: token })`
   c. Handle token-fetch failure gracefully (show error, no connection attempt)
3. Remove `API_KEY` from client-side env vars; rename to `GOOGLE_API_KEY` (server-only)
4. Verify Vite config: client bundle must NOT include any `VITE_` prefixed API key

**Security improvement:** Even if token is intercepted, it expires in 1 minute for session creation and 30 minutes max for the session itself.

**No changes required to:** WebSocket protocol, audio processing pipeline, session management, Gemini model config.

---

## Sources

- [Vercel: Do Serverless Functions support WebSocket?](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections)
- [Gemini Live API Overview](https://ai.google.dev/gemini-api/docs/live)
- [Gemini Live API: WebSockets Reference](https://ai.google.dev/api/live)
- [Gemini Ephemeral Tokens](https://ai.google.dev/gemini-api/docs/ephemeral-tokens)
- [Rivet WebSocket Servers for Vercel](https://www.rivet.dev/blog/2025-10-20-how-we-built-websocket-servers-for-vercel-functions/)

---

## Unresolved Questions

1. Does `@google/genai` v1.40.0 expose `ai.authTokens.create()`? Need to verify SDK method name — may be `ai.live.createEphemeralToken()` or similar. Check SDK changelog.
2. Should the token endpoint be authenticated (require user session) to prevent token farming? Depends on whether the app has auth.
3. Vercel function timeout for token generation: provisioning API call should be fast (<2s), well within limits.
