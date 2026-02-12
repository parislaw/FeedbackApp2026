# Vercel Serverless Functions Best Practices Research (2026)

**Date:** 2026-02-11 | **Researcher:** Claude Code | **Focus:** Vercel API layer architecture

---

## 1. Serverless Function Structure & Routing

**File Organization:** Functions placed in `/api` directory; Vercel auto-detects at deployment.
- URL matches file path structure (e.g., `/api/chat.ts` → `https://domain/api/chat`)
- Supports Web Handler (Request/Response API) — recommended pattern
- Express-like helpers: `req.body` auto-parses JSON without third-party libraries

**Key Insight:** Stateless design required; avoid relying on local filesystem or in-memory persistence.

---

## 2. Environment Variables & Security

**Configuration:**
- All variables encrypted; sensitive variables decryptable only during builds
- Max size: 64KB per variable (upgraded from 5KB)
- System variables auto-populated: `VERCEL_URL`, `VERCEL_ENV`, git branch info
- OIDC token available via `x-vercel-oidc-token` header at runtime (when enabled)

**Best Practice:** Use sensitive env vars for API keys; access in function code directly via `process.env.API_KEY`.

**TypeScript Support:** Define config in `vercel.ts` with `@vercel/config` for type-safe settings.

---

## 3. Request/Response Handling for AI SDK

**Streaming Support:**
- Vercel first provider offering stable HTTP streaming in both Node.js and Edge runtimes
- Use `StreamingTextResponse` for text streams; provider-specific adapters (e.g., `AnthropicStream`)
- Reduces perceived latency; users interact before full response completes

**Fluid Compute (New):**
- Optimized concurrency: multiple requests share single function instance
- `waitUntil()` enables background tasks after responding
- Longer function durations for extended AI agent operations
- Built-in concurrent request handling

**Request Parsing:** `req.body` helper handles JSON automatically in Node.js runtime.

---

## 4. TypeScript in Serverless Functions

**Setup:**
- Native TypeScript support via Next.js API routes
- Auto-compilation at deployment
- `vercel.ts` configuration file for type-safe routing & build settings
- Works seamlessly with Web Handler pattern

**Advantage:** Full type safety for request/response contracts, AI SDK types, and environment validation.

---

## 5. Common API Proxy Patterns

**CORS Proxy:**
- Intercept requests/responses within function code
- Use `http-proxy-middleware` for forwarding to external endpoints
- Enables client-side calls that would normally be blocked by CORS

**Pattern Flow:**
1. Client → Vercel Function (trusted)
2. Vercel Function → External API (server-side request)
3. Response → Client (CORS-safe)

**Implementation:** Request body auto-parsed; forward with custom headers/auth tokens; return modified response.

---

## Performance Optimizations

- **Keep functions lean:** Smaller code → faster startup, lower resource consumption
- **Cold start mitigation:** Regular invocations keep functions warm; use Edge Functions for ultra-low latency
- **Caching:** CDN caches public API responses; use HTTP cache headers
- **Error handling:** Comprehensive error catching prevents silent failures

---

## Security Best Practices

1. Never expose API keys in frontend code
2. Store secrets in Vercel sensitive env vars
3. Validate all incoming request data
4. Use OIDC tokens for backend-to-backend auth (when enabled)
5. Implement rate limiting at API gateway or function level
6. Set appropriate CORS headers on proxy functions

---

## Unresolved Questions

- Recommended file size limit for individual functions (implicit ~50MB cold start threshold?)
- Optimal batching strategy for concurrent AI requests with Fluid compute
- Cost comparison: Edge vs Serverless for AI proxy operations
- Custom middleware support in current Vercel Functions architecture

---

## Sources

- [Vercel Functions](https://vercel.com/docs/functions)
- [Environment Variables Documentation](https://vercel.com/docs/environment-variables)
- [Sensitive Environment Variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables)
- [AI SDK by Vercel](https://ai-sdk.dev/docs/introduction)
- [Streaming in Web Applications](https://vercel.com/docs/functions/streaming)
- [Fluid Compute: Serverless Servers](https://vercel.com/blog/fluid-how-we-built-serverless-servers)
- [Vercel AI SDK Introduction](https://vercel.com/blog/introducing-the-vercel-ai-sdk)
- [Handling Request Bodies](https://vercel.com/kb/guide/handling-node-request-body)
- [Building AI Agents with Vercel](https://vercel.com/kb/guide/how-to-build-ai-agents-with-vercel-and-the-ai-sdk)
