# Debugger Report: Chat API ESM Import Fix

**Date:** 2026-02-12
**Status:** RESOLVED

---

## Executive Summary

Chat was broken on https://feedback-app2026.vercel.app due to `FUNCTION_INVOCATION_FAILED` (HTTP 500) on all `/api/chat`, `/api/evaluate`, `/api/scenario` endpoints. Root cause: missing `.js` file extensions on relative ESM imports in the serverless functions. Fix deployed in commit `80feeac`.

---

## Findings

### 1. Env Vars - OK
All 3 API keys present in Vercel (Production, Preview, Development):
- `GEMINI_API_KEY` - set
- `ANTHROPIC_API_KEY` - set
- `OPENAI_API_KEY` - set

### 2. Build Status - OK
Latest deployment `dpl_GRCDvYvvMouPKaBjghucadMTXo5V` was `● Ready`. Functions bundled at ~807KB each.

### 3. Root Cause: ESM Module Resolution Failure

**Error from Vercel logs:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/api/_lib/response-helpers'
imported from /var/task/api/chat.js
```

Vercel compiles TypeScript API functions to ESM (`.js`). Node.js ESM resolver requires **explicit `.js` extensions** on local relative imports — unlike CommonJS which resolves bare paths.

The three API files imported local modules without extensions:
```ts
// BEFORE (broken in ESM):
import { validateMethod, sendError } from './_lib/response-helpers';
import { ... } from './_lib/provider-factory';
import { ... } from './_lib/prompt-builder';
import type { Scenario } from '../types';
```

### 4. Fix Applied

Added `.js` extensions to all relative imports in:
- `/api/chat.ts`
- `/api/evaluate.ts`
- `/api/scenario.ts`

```ts
// AFTER (fixed):
import { validateMethod, sendError } from './_lib/response-helpers.js';
import { ... } from './_lib/provider-factory.js';
import { ... } from './_lib/prompt-builder.js';
import type { Scenario } from '../types.js';
```

### 5. Verification

Post-fix test call returned HTTP 200 with a valid AI response:
```json
{"message":"Yeah, I figured. What's up? I've been putting in the hours, so I'm not really sure what the issue is.\n"}
```

---

## Timeline

- `~09:21` - First 500 error captured in Vercel logs
- `~09:25` - Second 500 error confirms pattern
- `~09:45` - Root cause identified via `vercel logs --expand`
- `~09:48` - Fix applied + committed (`80feeac`)
- `~09:49` - Pushed to main, Vercel auto-deployed
- `~09:50` - New deployment `Ready` (24s build)
- `~09:51` - Verified HTTP 200 response from production

---

## Why It Worked Before

This likely broke when the Vercel project was initially set up as ESM (due to `@google/genai` being `"type": "module"`). Earlier deployments may not have existed for this codebase, or were never tested end-to-end.

---

## Unresolved Questions

None — issue fully resolved and verified in production.
