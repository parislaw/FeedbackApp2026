# API Key Security & Proxy Patterns Research

**Report Date:** 2026-02-11 | **Focus:** Serverless API Layer Security

---

## 1. Security Risks of Client-Side API Keys

**CRITICAL:** Never expose API keys in client bundles. Risks include:
- Source code exposure via browser DevTools or bundle inspection
- Keys committed to git repositories and public CVE databases
- Third-party access through decompiled code or network sniffing
- Unlimited API usage without per-user rate limiting

**Mitigation:** Implement Backend-for-Frontend (BFF) proxy pattern where clients never directly call AI APIs.

---

## 2. Server-Side API Proxy Architecture

**Standard Pattern:** Client → Backend Proxy → AI Provider APIs

**Key Implementation Details:**
- Store API keys exclusively in server environment variables or secrets manager (never in code)
- Proxy validates & sanitizes all client inputs before forwarding (prevents injection attacks)
- Blind proxying of arbitrary parameters creates security vulnerabilities
- Use Node.js middleware frameworks (Express, Hono, Next.js API routes)
- Encrypt data in transit with TLS 1.3+

**Encryption Standards:** AES-256 for stored secrets, TLS 1.3 minimum for transport.

---

## 3. Multi-Provider Request Routing

**Available Solutions:**
- **Claude Code Router (CCR):** Open-source middleware supporting Ollama, OpenAI, Gemini, Anthropic
- **CCProxy:** High-performance multi-provider LLM gateway with API translation
- **Claude Max API Proxy:** OpenAI-compatible wrapper around Anthropic API
- **Proxy middleware:** Transform request/response formats between provider APIs

**Implementation Strategy:**
- Route requests by provider parameter in proxy
- Handle format differences (message structure, streaming, error codes)
- Maintain unified client interface across multiple backends

---

## 4. Error Handling & Rate Limiting

**Rate Limiting Strategy:**
- Implement per-user limits (tracked via session/auth tokens)
- Track usage server-side: prevents key exposure, enables fine-grained control
- Monitor for unusual patterns (spikes, suspicious access)
- Real-time alerts for anomalous activity

**Error Handling:**
- Proxy catches provider errors, transforms to consistent format
- Never leak provider error messages to client (information disclosure risk)
- Implement retry logic with exponential backoff
- Set reasonable timeouts (prevent hanging connections)

---

## 5. Session Management for Stateful Chat

**Hybrid Approach Recommended:**
- Use token-based auth (JWT) for API authentication (stateless scaling)
- Maintain stateful session tracking server-side for chat context
- Session tokens stored in HttpOnly, Secure cookies
- Refresh tokens rotate on use, invalidate stale tokens immediately

**Chat-Specific Patterns:**
- Associate conversation threads with user sessions
- Store conversation history server-side (prevents client manipulation)
- Implement session revocation (immediate logout, access revocation)
- Use refresh token rotation: old tokens expire, new ones issued automatically

**Key Insight:** Hybrid stateful/stateless approach provides both scalability (JWT) and immediate revocation (session tracking).

---

## Security Best Practices Summary

| Aspect | Practice |
|--------|----------|
| **Key Storage** | Environment variables + secrets manager (90-day rotation) |
| **Transport** | TLS 1.3, HTTPS only |
| **Proxy Auth** | Require authentication for all proxy endpoints |
| **Input Validation** | Sanitize all client inputs; never blind-proxy |
| **Monitoring** | Real-time alerts for usage spikes, unusual patterns |
| **Session** | HttpOnly cookies + refresh token rotation |

---

## Unresolved Questions

1. How should rate limits be configured per user/plan tier in Vercel serverless?
2. Should conversation history be persisted to database or kept in-memory per session?
3. What error budget/retry strategy balances UX vs. provider reliability?

---

## Sources

- [Google Maps Platform Security Best Practices](https://developers.google.com/maps/api-security-best-practices)
- [OpenAI API Key Security Guide 2026](https://trendminds.in/how-to-secure-openai-api-key-best-practices-step-by-step-for-beginners-master-guide-2026/)
- [Backend for Frontend BFF Pattern](https://blog.gitguardian.com/stop-leaking-api-keys-the-backend-for-frontend-bff-pattern-explained/)
- [API Proxy Design Best Practices (Apigee)](https://docs.apigee.com/api-platform/fundamentals/best-practices-api-proxy-design-and-development)
- [Google Cloud API Key Management](https://docs.cloud.google.com/docs/authentication/api-keys-best-practices)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Token vs Session Authentication](https://supertokens.com/blog/token-based-authentication-vs-session-based-authentication)
- [Claude Code Router - GitHub](https://github.com/atalovesyou/claude-max-api-proxy)
- [CCProxy AI Request Proxy](https://ccproxy.orchestre.dev/api/)
