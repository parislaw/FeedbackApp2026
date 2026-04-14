# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Accord** (formerly Lumenalta) is a professional feedback practice simulator with multi-provider AI support. Users practice giving feedback on simulated scenarios, receive AI-powered evaluation, and get improvement recommendations. The app supports Gemini, Anthropic (Claude), and OpenAI as AI providers.

## Role & Responsibilities

Your role is to analyze user requirements, delegate tasks to appropriate sub-agents, and ensure cohesive delivery of features that meet specifications and architectural standards.

## Workflows

- Primary workflow: `./.claude/rules/primary-workflow.md`
- Development rules: `./.claude/rules/development-rules.md`
- Orchestration protocols: `./.claude/rules/orchestration-protocol.md`
- Documentation management: `./.claude/rules/documentation-management.md`
- And other workflows: `./.claude/rules/*`

**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.
**IMPORTANT:** You must follow strictly the development rules in `./.claude/rules/development-rules.md` file.
**IMPORTANT:** Before you plan or proceed any implementation, always read the `./README.md` file first to get context.
**IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
**IMPORTANT:** In reports, list any unresolved questions at the end, if any.

## Quick Start Commands

```bash
npm install                 # Install dependencies
npm run dev                 # Start dev server (http://localhost:3000) + local serverless functions
npm run build              # Build for production
npm run test               # Run all tests
npm run test:watch        # Run tests in watch mode
npm run ck:init           # Initialize ClaudeKit environment
npm run ck:doctor         # Check ClaudeKit health
npm run preview           # Preview production build locally
```

## Architecture Quick Reference

**Client-Server Model:**
```
Browser (React 19 + Vite) → Fetch API → Vercel Functions (Node.js) → AI APIs
```

**Key Layers:**
- **Frontend**: React TypeScript SPA in root (`App.tsx`, `components/`, `services/`)
- **API**: Serverless functions in `/api` (auto-routed by Vercel)
- **Database**: Drizzle ORM + PostgreSQL (Neon)
- **Auth**: better-auth with Drizzle adapter
- **Build**: Vite (dev server + prod builder)

**API Endpoints** (POST with JSON):
- `/api/chat` — Multi-turn conversation with selected AI provider
- `/api/evaluate` — Evaluate feedback transcript against scenario assertions
- `/api/scenario` — Generate custom feedback scenarios
- `/api/feedback-on-transcript` — Get feedback on user's practice transcript
- `/api/reports` — Fetch evaluation reports
- `/api/voice-token` — Get Gemini voice token
- `/api/transcribe` — Transcribe audio (Gemini Live API)
- `/api/auth/*` — better-auth routes (login, register, session)

## Tech Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Runtime | Node.js 24 LTS | Vercel Functions default |
| Frontend | React 19 + Vite 6 + TypeScript 5.8 | ESM, fast HMR |
| Styling | CSS (component-scoped) | No bundled CSS framework |
| Testing | Vitest 3 | Node + component tests in `api/`, `tests/`, `components/` |
| Database | PostgreSQL (Neon) + Drizzle ORM 0.45 | Schema in `api/_lib/db.ts` |
| Auth | better-auth 1.5.5 | Drizzle adapter, JWT + sessions |
| AI Providers | Gemini, Anthropic (Claude), OpenAI | API keys in Vercel env vars only |
| Email | Resend 6.9 | For transactional emails (if enabled) |
| Deployment | Vercel Serverless | Auto-deploy on main push |

## Key File Locations

- **Frontend Root**: `App.tsx`, `components/`, `services/`, `types.ts`, `constants.ts`
- **API Functions**: `api/*.ts` (all become endpoints)
- **API Utilities**: `api/_lib/` (db.ts, providers, helper functions)
- **Drizzle Schema**: `api/_lib/db.ts`
- **Drizzle Migrations**: `drizzle/` (auto-generated)
- **Tests**: `api/**/*.test.ts`, `tests/**/*.test.ts`, `components/**/*.test.ts`
- **Config**: `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `drizzle.config.ts`
- **Documentation**: `docs/` (PDR, architecture, API reference, standards)
- **Vercel Config**: `vercel.json` (build & output dirs)
- **Environment**: `.env.local` (local dev), Vercel dashboard (production)

## Common Development Workflows

**Adding a New API Endpoint:**
1. Create `api/new-endpoint.ts` as a default export function with handler signature
2. Vercel auto-routes `/api/new-endpoint` to your function
3. Use `api/_lib/` utilities for DB queries, AI provider calls, auth checks
4. Test with `npm run test` (vitest runs `api/**/*.test.ts`)

**Working with Database:**
1. Modify schema in `api/_lib/db.ts` (Drizzle schema)
2. Run `npx drizzle-kit generate` to create migration in `drizzle/`
3. Apply migration with Drizzle introspection (Neon dashboard or Drizzle Studio)
4. Import tables in endpoints via `api/_lib/db.ts`

**Frontend Development:**
1. Vite dev server auto-reloads at http://localhost:3000
2. API calls use `/api/endpoint` (proxied by Vite during dev)
3. React Router v7 handles SPA routing
4. State management is component-local or context (no Redux/Zustand)

**Vercel Deployment:**
1. Merge to `main` branch
2. Vercel automatically detects `package.json` + `vite.config.ts`
3. Runs `npm run build` → outputs to `dist/`
4. Functions in `/api` become serverless endpoints
5. Environment variables from Vercel dashboard injected at build/runtime

## Hook Response Protocol

### Privacy Block Hook (`@@PRIVACY_PROMPT@@`)

When a tool call is blocked by the privacy-block hook, the output contains a JSON marker between `@@PRIVACY_PROMPT_START@@` and `@@PRIVACY_PROMPT_END@@`. **You MUST use the `AskUserQuestion` tool** to get proper user approval.

**Required Flow:**

1. Parse the JSON from the hook output
2. Use `AskUserQuestion` with the question data from the JSON
3. Based on user's selection:
   - **"Yes, approve access"** → Use `bash cat "filepath"` to read the file (bash is auto-approved)
   - **"No, skip this file"** → Continue without accessing the file

**Example AskUserQuestion call:**
```json
{
  "questions": [{
    "question": "I need to read \".env\" which may contain sensitive data. Do you approve?",
    "header": "File Access",
    "options": [
      { "label": "Yes, approve access", "description": "Allow reading .env this time" },
      { "label": "No, skip this file", "description": "Continue without accessing this file" }
    ],
    "multiSelect": false
  }]
}
```

**IMPORTANT:** Always ask the user via `AskUserQuestion` first. Never try to work around the privacy block without explicit user approval.

## Environment Variables

**Local Development (`.env.local`):**
```
GEMINI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
DATABASE_URL=postgresql://...
DATABASE_URL_UNPOOLED=postgresql://...
```

**Vercel Production:**
- Set all secrets in Vercel dashboard → Settings → Environment Variables
- API keys **never exposed to client** (serverless functions access them server-side only)
- Client receives only scenario data and chat responses, never raw API keys

## Python Scripts (Skills)

When running Python scripts from `.claude/skills/`, use the venv Python interpreter:
- **Linux/macOS:** `.claude/skills/.venv/bin/python3 scripts/xxx.py`
- **Windows:** `.claude\skills\.venv\Scripts\python.exe scripts\xxx.py`

This ensures packages installed by `install.sh` (google-genai, pypdf, etc.) are available.

**IMPORTANT:** When scripts of skills failed, don't stop, try to fix them directly.

## [IMPORTANT] Consider Modularization
- If a code file exceeds 200 lines of code, consider modularizing it
- Check existing modules before creating new
- Analyze logical separation boundaries (functions, classes, concerns)
- Use kebab-case naming with long descriptive names, it's fine if the file name is long because this ensures file names are self-documenting for LLM tools (Grep, Glob, Search)
- Write descriptive code comments
- After modularization, continue with main task
- When not to modularize: Markdown files, plain text files, bash scripts, configuration files, environment variables files, etc.

## Documentation Management

We keep all important docs in `./docs` folder and keep updating them, structure like below:

```
./docs
├── project-overview-pdr.md
├── code-standards.md
├── codebase-summary.md
├── design-guidelines.md
├── deployment-guide.md
├── system-architecture.md
└── project-roadmap.md
```

**IMPORTANT:** *MUST READ* and *MUST COMPLY* all *INSTRUCTIONS* in project `./CLAUDE.md`, especially *WORKFLOWS* section is *CRITICALLY IMPORTANT*, this rule is *MANDATORY. NON-NEGOTIABLE. NO EXCEPTIONS. MUST REMEMBER AT ALL TIMES!!!*