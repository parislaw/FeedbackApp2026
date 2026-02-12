# Project Overview & Product Development Requirements

## Project Summary

**Lumenalta** is a professional feedback practice simulator designed to help users develop and refine their feedback delivery skills through multi-turn conversations with AI personas.

**Status:** ✅ MVP Complete - Vercel serverless architecture deployed

**Repository:** FeedbackApp2026

**Tech Stack:** React 19 + TypeScript + Vite (frontend) | Vercel Serverless (backend)

## Vision & Mission

### Vision
Enable professionals to practice critical feedback conversations safely in a judgment-free environment with immediate, structured evaluation.

### Mission
Provide an accessible, AI-powered platform where users can:
1. Practice feedback delivery across diverse scenarios
2. Receive constructive evaluation of their performance
3. Generate custom scenarios for personalized practice
4. Improve communication and leadership skills

## Core Features

### 1. Practice Scenarios
- **Preset scenarios** for common workplace situations
- **Custom scenario generation** via user description
- **Difficulty levels:** Easy, Medium, Hard
- **Diverse personas** with distinct voice characteristics

### 2. Multi-Turn Chat Interface
- Real-time conversation with AI personas
- Stateless architecture (no server-side session storage)
- Support for 3 AI providers (Anthropic, Gemini, OpenAI)
- Natural conversation flow

### 3. Performance Evaluation
- Automated evaluation against scenario assertions
- Scoring metrics (0-100 scale)
- Specific feedback per assertion
- Improvement recommendations

### 4. Multi-Provider Support
- **Anthropic:** Claude Sonnet 4.5 (default)
- **Google Gemini:** Gemini 2.0 Flash
- **OpenAI:** GPT-4o
- No vendor lock-in; switch providers per request

## Architecture Overview

### Backend-for-Frontend (BFF) Pattern

```
Client (React)
    ↓ POST /api/chat, /api/evaluate, /api/scenario
Vercel Serverless Functions (Node.js)
    ↓ Uses server-side API keys
AI Providers (Anthropic, Gemini, OpenAI)
    ↓ Returns responses
Serverless → Sanitized JSON Response → Client
```

### Key Design Decisions

1. **Stateless Serverless:** Each request contains full context; no server-side sessions
2. **API Keys Server-Side:** Never exposed to client; eliminated client SDK bloat
3. **Multi-Provider Abstraction:** Single API routes to any provider
4. **Error Sanitization:** All API errors masked to prevent credential exposure

### Security Architecture

- **API Keys:** Stored in Vercel environment variables (encrypted at rest)
- **Error Handling:** All sensitive errors (auth, parsing) masked as generic messages
- **Request Validation:** All endpoints validate input before processing
- **No Client Secrets:** Frontend never receives API credentials

## Product Development Requirements (PDRs)

### PDR-001: Serverless API Layer

**Status:** ✅ COMPLETE

**Objective:** Implement secure, scalable API layer using Vercel serverless functions.

**Requirements:**

#### Functional Requirements
1. **Chat Endpoint** (`/api/chat`)
   - Accept provider, scenario, messages
   - Route to correct AI provider
   - Build system prompt from persona
   - Return response text
   - Support multi-turn conversation

2. **Evaluation Endpoint** (`/api/evaluate`)
   - Accept provider, scenario, transcript
   - Generate structured evaluation
   - Return JSON with scores and feedback
   - Evaluate against assertions

3. **Scenario Endpoint** (`/api/scenario`)
   - Accept provider, description
   - Generate custom scenario
   - Return Scenario object
   - Support any description length

#### Non-Functional Requirements
- **Security:** API keys never exposed client-side
- **Scalability:** Automatic horizontal scaling via Vercel
- **Performance:** Chat <5s, Evaluation <8s, Scenario <4s
- **Reliability:** 99.9% uptime (Vercel SLA)
- **Cost:** <$50/month for typical usage (free tier + serverless)

#### Constraints
- **Cold starts:** 200-500ms acceptable
- **Payload size:** <6MB (Vercel limit)
- **Function timeout:** 60 seconds (Vercel limit)
- **Provider quotas:** Respect API rate limits

#### Implementation Details
- TypeScript with Vercel types
- Error sanitization for all endpoints
- Provider factory pattern for abstraction
- Shared utilities in `_lib/` directory

#### Success Criteria
- ✅ All three endpoints functional
- ✅ Error messages don't expose credentials
- ✅ Works with all three providers
- ✅ Response times meet targets
- ✅ Deployed to Vercel successfully

### PDR-002: Frontend Integration

**Status:** ✅ COMPLETE

**Objective:** Build React UI for scenario practice and evaluation.

**Requirements:**

#### Functional Requirements
1. **Scenario Selection**
   - Display preset scenarios
   - Support custom scenario generation
   - Show difficulty and persona info
   - Select scenario to practice

2. **Chat Interface**
   - Display conversation history
   - Input field for user messages
   - Send messages to /api/chat
   - Display AI responses
   - Show loading states

3. **Evaluation Display**
   - Show evaluation report after chat
   - Display overall scores
   - List feedback for each assertion
   - Show recommendations
   - Option to generate new custom scenario

4. **Provider Selection**
   - Select AI provider for current session
   - Switch providers mid-session
   - Show provider status

#### Non-Functional Requirements
- **UX:** Intuitive interface for feedback practice
- **Accessibility:** WCAG 2.1 AA compliance
- **Performance:** <2s page load, <100ms interaction response
- **Responsiveness:** Works on desktop, tablet, mobile

#### Success Criteria
- ✅ All UI components functional
- ✅ Smooth chat experience
- ✅ Evaluation reports display correctly
- ✅ No API keys in frontend bundle

### PDR-003: Multi-Provider Abstraction

**Status:** ✅ COMPLETE

**Objective:** Support multiple AI providers with single API interface.

**Requirements:**

#### Functional Requirements
1. **Provider Factory**
   - Single interface to all providers
   - Client-side provider selection
   - Server-side routing

2. **Unified Request Format**
   - Single JSON structure for all providers
   - Provider parameter in request

3. **Unified Response Format**
   - Consistent JSON responses
   - Same field names across providers

4. **Fallback Handling**
   - Clear error on provider unavailable
   - Ability to switch providers

#### Implementation Details
- Factory pattern in `provider-factory.ts`
- Provider-specific message formatting
- Consistent system prompt application
- Error mapping per provider

#### Success Criteria
- ✅ All providers work identically
- ✅ Easy to add new provider
- ✅ No provider lock-in

### PDR-004: Scenario System

**Status:** ✅ COMPLETE

**Objective:** Provide both preset and dynamically generated practice scenarios.

**Requirements:**

#### Functional Requirements
1. **Preset Scenarios**
   - Curated scenarios for common situations
   - Clear context and difficulty
   - Defined personas with characteristics

2. **Custom Scenario Generation**
   - User describes scenario they want
   - AI generates matching scenario
   - Persona with voice examples
   - Assertions for evaluation

3. **Scenario Structure**
   - Title and context
   - Persona with name, role, difficulty
   - Assertions (3-5 per scenario)
   - Voice examples for realism

#### Success Criteria
- ✅ Preset scenarios curated
- ✅ Custom generation works
- ✅ Generated scenarios high quality
- ✅ Difficulty levels appropriate

### PDR-005: Evaluation Engine

**Status:** ✅ COMPLETE

**Objective:** Automatically evaluate user performance against scenario assertions.

**Requirements:**

#### Functional Requirements
1. **Assertion Scoring**
   - Score each assertion 0-100
   - Provide specific feedback
   - Explain reasoning

2. **Metrics**
   - Overall score
   - Feedback quality score
   - Context adherence score

3. **Recommendations**
   - List improvement opportunities
   - Based on conversation analysis
   - Actionable and specific

#### Success Criteria
- ✅ Scores are consistent
- ✅ Feedback is constructive
- ✅ Recommendations are actionable
- ✅ Report structure clear

## Non-Functional Requirements

### Performance

| Operation | Target | Acceptable |
|-----------|--------|-----------|
| Chat response | <5s | <10s |
| Evaluation | <8s | <15s |
| Scenario generation | <4s | <8s |
| Cold start | <1s | <2s |
| Page load | <2s | <5s |
| Interaction response | <100ms | <500ms |

### Security

- ✅ API keys never in client bundle
- ✅ Errors sanitized (no credential exposure)
- ✅ HTTPS enforced (automatic on Vercel)
- ✅ Input validation on all endpoints
- ✅ No sensitive data in logs

### Scalability

- ✅ Horizontal scaling (serverless)
- ✅ Automatic load distribution
- ✅ Sub-second cold starts acceptable
- ✅ Pay-as-you-go pricing
- ✅ Cost-effective for MVP

### Reliability

- ✅ Graceful error handling
- ✅ Provider independence (multi-provider)
- ✅ Automatic retry on transient failures
- ✅ Clear error messages

### Accessibility

- ✅ Semantic HTML
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Color contrast compliance
- ✅ Clear focus indicators

## Deployment Architecture

### Development Environment

```bash
npm install
npm run dev
```

- Local React development server (Vite)
- Vercel functions mocked locally
- Environment variables from `.env.local`
- Hot reload on file changes

### Production Environment

```
GitHub Repo
    ↓ git push to main
Vercel
    ↓ npm run build
Vite builds React to dist/
TypeScript compiles /api functions
    ↓ Deploy globally
CDN serves static assets
Serverless functions at /api/*
```

### Deployment Requirements

1. **GitHub:** Repository connected to Vercel
2. **Vercel:** Project created and configured
3. **Environment Variables:** Set in Vercel project settings
   - `GEMINI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY`

### Deployment Process

1. Push code to GitHub
2. Vercel automatically deploys
3. Build step: `npm run build`
4. Output directory: `dist/`
5. Functions auto-detected in `/api/`

## Development Roadmap

### Phase 1: MVP (✅ COMPLETE)
- Serverless API layer
- React chat interface
- Basic evaluation
- Multi-provider support
- Preset scenarios
- Deployment to Vercel

### Phase 2: Enhanced Scenarios (Future)
- More preset scenarios
- Better custom generation prompts
- Scenario templates
- Difficulty balancing

### Phase 3: Persistence (Future)
- User authentication
- Save conversation history
- Track progress over time
- Analytics dashboard

### Phase 4: Advanced Features (Future)
- Real-time streaming responses
- Video practice feedback
- Peer comparison analytics
- Export reports

## Technology Stack

### Frontend
- **React 19:** UI framework
- **TypeScript:** Type safety
- **Vite:** Build tool & dev server
- **CSS:** Component styling

### Backend
- **Node.js:** Runtime
- **Vercel Serverless:** Hosting platform
- **TypeScript:** Type safety

### AI Providers
- **Anthropic SDK:** Claude API integration
- **Google GenAI SDK:** Gemini API integration
- **OpenAI SDK:** GPT-4 API integration

### Deployment
- **Vercel:** Serverless functions & static hosting
- **GitHub:** Source control & CI/CD

## Team & Responsibilities

| Role | Responsibility |
|------|-----------------|
| Developer | Implement features, write tests, maintain code |
| Product Manager | Define requirements, prioritize features |
| Documentation | Keep docs up-to-date with changes |

## Success Metrics

### User Engagement
- [ ] Users completing scenarios
- [ ] Multiple practice sessions per user
- [ ] Provider switching patterns

### Performance
- [ ] API response times <5s (chat), <8s (evaluate)
- [ ] <2s page load time
- [ ] 99.9% uptime

### Quality
- [ ] Evaluation scores accurate (manual verification)
- [ ] User feedback positive
- [ ] No critical bugs in production

### Business
- [ ] Cost <$50/month (MVP stage)
- [ ] Scalable to 1000+ concurrent users
- [ ] Zero security incidents

## Known Limitations

### Current Architecture
- **No user persistence:** Conversations cleared on refresh
- **No authentication:** Anyone can access
- **No rate limiting:** No quota management
- **No message history:** Can't retrieve past conversations

### Provider Limitations
- **Gemini:** 15 RPM free tier limit
- **Anthropic:** Depends on account plan
- **OpenAI:** Depends on account plan
- **Cold starts:** 200-500ms first invocation

### UX Limitations
- **No real-time streaming:** Full response before display
- **No voice:** Text-based only
- **No video:** No visual feedback

## Future Enhancements

### Priority 1: Core Features
1. Message persistence (database)
2. User authentication
3. Saved scenarios & transcripts
4. Performance analytics

### Priority 2: Advanced Features
1. Real-time streaming responses
2. Multi-language support
3. Export reports (PDF)
4. Team collaboration mode

### Priority 3: Monetization
1. Premium tier with more scenarios
2. Team licenses
3. Usage analytics dashboard

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Provider API downtime | Medium | High | Multiple providers, fallback logic |
| High cloud costs | Low | Medium | Monitor usage, set budget alerts |
| Cold start latency | Medium | Low | Document, set expectations |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Low user adoption | Medium | High | Focus on UX, marketing |
| AI quality variance | Medium | Medium | Multiple providers, continuous eval |
| Data privacy concerns | Low | High | No user data stored, transparent policies |

## Compliance & Security

### Data Privacy
- ✅ No user data stored server-side
- ✅ GDPR compliant (no tracking)
- ✅ No third-party analytics
- ✅ No cookies (except session if added)

### Security Practices
- ✅ API keys in environment variables
- ✅ HTTPS enforced
- ✅ Input validation
- ✅ Error sanitization
- ✅ No secrets in version control

### Compliance Standards
- ✅ WCAG 2.1 AA (accessibility)
- ✅ GDPR (data protection)
- ✅ Standard web security practices

## Documentation

### Available Docs
1. **`serverless-architecture.md`** - Architecture & design patterns
2. **`api-reference.md`** - API endpoint documentation
3. **`deployment-guide.md`** - Deployment to Vercel
4. **`code-standards.md`** - Development standards & patterns
5. **`system-architecture.md`** - System design details (if available)

### Quick Links
- API Endpoints: See `api-reference.md`
- Deployment: See `deployment-guide.md`
- Development: See `code-standards.md`
- Architecture: See `serverless-architecture.md`

## Glossary

| Term | Definition |
|------|-----------|
| **BFF** | Backend-for-Frontend pattern - API layer between client and services |
| **Serverless** | Event-driven functions without server management (Vercel) |
| **Persona** | AI character with defined role, difficulty, and voice |
| **Assertion** | Success criteria for evaluating feedback quality |
| **Scenario** | Practice situation with context, persona, and assertions |
| **Transcript** | Complete conversation history for evaluation |
| **Cold start** | Delay on first function invocation (200-500ms) |
| **Stateless** | No server-side session storage; context in requests |

## Contacts & Resources

- **Repository:** [GitHub link will be in actual deployment]
- **Deployed App:** [Vercel deployment URL]
- **API Docs:** See `docs/api-reference.md`
- **Issues/Feedback:** GitHub issues

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-11 | Initial MVP with serverless architecture |

## Appendix

### A. API Request/Response Examples

See `api-reference.md` for comprehensive examples of:
- `/api/chat` requests and responses
- `/api/evaluate` requests and responses
- `/api/scenario` requests and responses
- Error handling examples

### B. Environment Variables Reference

See `deployment-guide.md` for:
- Required environment variables
- How to obtain API keys
- Vercel configuration steps

### C. Code Architecture

See `code-standards.md` for:
- File organization
- TypeScript standards
- Function patterns
- Error handling practices

