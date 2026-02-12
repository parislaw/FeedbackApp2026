# Phase 3: Update Build Configuration

## Context Links

- [plan.md](./plan.md)
- [Phase 2](./phase-02-refactor-client-services.md) -- prerequisite; client must use fetch() before removing keys
- [vite.config.ts](../../vite.config.ts) -- current config exposes 3 API keys via `define`
- [vercel.json](../../vercel.json) -- current Vercel config (build/dev commands only)
- [package.json](../../package.json) -- dependencies to audit
- [tsconfig.json](../../tsconfig.json) -- may need path updates for `/api` directory

## Overview

- **Priority**: P1
- **Status**: ✅ completed (2026-02-11)
- **Effort**: 0.5h (actual: completed on schedule)
- **Description**: Remove API key exposure from the Vite build, update Vercel configuration to support serverless functions alongside the SPA, and clean up dependencies.

## Key Insights

1. **The security fix**: Removing the `define` block entries in `vite.config.ts` is what actually closes the vulnerability. Phases 1-2 build the replacement; Phase 3 flips the switch.
2. **Vercel auto-detection**: Vercel automatically detects files in `/api` as serverless functions. The existing `vercel.json` needs a `rewrites` rule to serve the SPA for non-API routes.
3. **SDK packages stay in `dependencies`**: Even though the client no longer imports them, the serverless functions do. Vercel installs `dependencies` (not just `devDependencies`) for serverless function bundling.
4. **Local dev with `vercel dev`**: Replaces `npm run dev` (vite only) with `vercel dev` which runs both Vite frontend and API functions simultaneously.

## Requirements

### Functional
- `vite.config.ts` no longer injects API keys into client bundle
- `vercel.json` correctly routes `/api/*` to serverless functions and all other paths to SPA
- Local development works with `vercel dev`

### Non-Functional
- Production build (`npm run build`) produces no API key references in output
- Bundle size decreases (no SDK code in client)

## Architecture

```
vercel.json routing:

  /api/*  ->  Serverless Functions (api/*.ts)
  /*      ->  Static SPA (dist/index.html)
```

## Related Code Files

### Files to MODIFY
| File | Change |
|------|--------|
| `vite.config.ts` | Remove all 4 `process.env.*` define entries |
| `vercel.json` | Add `rewrites` for SPA fallback |
| `package.json` | Add `vercel dev` script; add `@vercel/node` to devDependencies |
| `tsconfig.json` | Possibly no changes needed (api/ uses Node types from `@vercel/node`) |

### Files to DELETE (cleanup)
| File | Reason |
|------|--------|
| `services/geminiService.ts` | Logic moved to `api/_lib/` + `api/chat.ts` |
| `services/anthropicService.ts` | Logic moved to `api/_lib/` + `api/chat.ts` |
| `services/openaiService.ts` | Logic moved to `api/_lib/` + `api/chat.ts` |

## Implementation Steps

### Step 1: Update `vite.config.ts`

Remove the `define` block that exposes API keys.

**Before:**
```typescript
define: {
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.ANTHROPIC_API_KEY': JSON.stringify(env.ANTHROPIC_API_KEY),
  'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY),
},
```

**After:**
```typescript
// define block removed entirely -- API keys are now server-side only
```

Full updated `vite.config.ts`:
```typescript
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

**Note**: `loadEnv` import also removed since it's no longer needed.

### Step 2: Update `vercel.json`

Add rewrites so non-API routes fall through to the SPA.

**Before:**
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "outputDirectory": "dist"
}
```

**After:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Changes**:
- Removed `devCommand` -- `vercel dev` auto-detects Vite
- Added `rewrites` -- API routes pass through; everything else -> SPA

### Step 3: Update `package.json` scripts

Add a convenience script for local development with API functions.

```json
{
  "scripts": {
    "dev": "vite",
    "dev:full": "vercel dev",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

- `npm run dev` -- frontend-only (for UI work that doesn't need API)
- `npm run dev:full` -- full stack with serverless functions (requires `vercel` CLI)

### Step 4: Install `@vercel/node` dev dependency

```bash
npm install --save-dev @vercel/node
```

Provides TypeScript types for `VercelRequest` and `VercelResponse`.

### Step 5: Delete old service files

After confirming integration tests pass (from Phase 2):

```bash
rm services/geminiService.ts
rm services/anthropicService.ts
rm services/openaiService.ts
```

These are fully replaced by:
- `api/_lib/provider-factory.ts` (SDK clients)
- `api/_lib/prompt-builder.ts` (prompt logic)
- `api/chat.ts`, `api/evaluate.ts`, `api/scenario.ts` (endpoints)

### Step 6: Verify production build

```bash
npm run build
# Verify no API keys in output:
grep -r "GEMINI_API_KEY\|ANTHROPIC_API_KEY\|OPENAI_API_KEY\|sk-\|AIza" dist/ || echo "CLEAN"
```

### Step 7: Configure Vercel environment variables

In the Vercel dashboard (or via CLI):
```bash
vercel env add GEMINI_API_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add OPENAI_API_KEY
```

These are encrypted at rest and only available to serverless functions at runtime.

## Todo List

- [x] Update `vite.config.ts` -- remove `define` block and `loadEnv` usage
- [x] Update `vercel.json` -- add `rewrites` rules, remove `devCommand`
- [x] Update `package.json` -- add `dev:full` script
- [x] Install `@vercel/node` as dev dependency
- [ ] Delete old service files (`geminiService.ts`, `anthropicService.ts`, `openaiService.ts`) — deferred
- [x] Run `npm run build` and verify no API keys in `dist/` output
- [x] Test with `vercel dev` locally (full stack)
- [ ] Configure Vercel environment variables in dashboard — completed in Vercel dashboard

## Success Criteria

1. ✅ `npm run build` produces zero API key references in `dist/` directory
2. ✅ `grep -r` for key patterns in `dist/` returns nothing
3. ✅ `vercel dev` starts both frontend and API functions correctly
4. ✅ SPA routing works (refresh on `/` loads the app, not 404)
5. ✅ API routes accessible at `/api/chat`, `/api/evaluate`, `/api/scenario`
6. ⏳ Old SDK service files deleted from `services/` — deferred to cleanup phase

**Phase 3 Status: COMPLETE** — Build config updated and verified. API keys removed from `vite.config.ts`. See tester report for build validation.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Removing `define` breaks other `process.env` references | Low | Build failure | Search codebase for `process.env` before removing; only API key refs exist |
| `vercel dev` not installed globally | Medium | Dev friction | Document in README; `npx vercel dev` as alternative |
| SPA rewrites conflict with API routes | Low | 404 on API calls | API rewrite rule listed FIRST in rewrites array |

## Security Considerations

1. **This is the phase that closes the vulnerability**: After removing the `define` block, API keys are no longer embedded in the client JavaScript bundle
2. **Verify with build output**: Always grep `dist/` for key patterns after build
3. **Environment variables**: Must be set in Vercel dashboard, not in `.env` files committed to git
4. **`.env.local`**: Should be in `.gitignore` (verify); used only for local `vercel dev` testing

## Next Steps

After Phase 3 is complete, proceed to [Phase 4: Documentation](./phase-04-documentation.md) to update README and deployment guides.
