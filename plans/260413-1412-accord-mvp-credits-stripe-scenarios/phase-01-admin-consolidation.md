# Phase 1: Admin API Consolidation

## Context
- Parent: [plan.md](./plan.md)
- Dependencies: None (prerequisite for all other phases)
- Constraint: Vercel Hobby Plan = 12 functions max, currently at 12

## Overview
- **Priority:** P0 (blocker for everything else)
- **Status:** pending
- **Effort:** ~2h
- **Description:** Merge 4 separate admin endpoints (`users.ts`, `invite.ts`, `invite-accept.ts`, `reports.ts`) into a single catch-all `api/admin/[...all].ts` using URL path-based routing. Frees 3 function slots.

## Key Insights
- All 4 admin files follow the same pattern: auth check + method dispatch
- `invite-accept` is the only publicly accessible admin endpoint (no auth required)
- Existing tests in `api/admin/reports.test.ts` and `api/admin/create-user.test.ts` must be updated

## Requirements
### Functional
- `GET /api/admin/users` — list users (admin only)
- `POST /api/admin/users` — create/ban/unban user (admin only)
- `POST /api/admin/invite` — create invitation (admin only)
- `GET /api/admin/invite?token=xxx` — validate token (public)
- `POST /api/admin/invite-accept` — accept invitation (public)
- `GET /api/admin/reports` — list reports (admin only)

### Non-functional
- Zero behavior change for existing frontend calls
- All existing tests pass after migration

## Architecture

### URL Routing Inside Catch-All
```typescript
// api/admin/[...all].ts
export default async function handler(req, res) {
  const segments = (req.query.all as string[]) || [];
  const path = segments.join('/');

  switch (path) {
    case 'users':       return handleUsers(req, res);
    case 'invite':      return handleInvite(req, res);
    case 'invite-accept': return handleInviteAccept(req, res);
    case 'reports':     return handleReports(req, res);
    default:            return sendError(res, 404, 'Not found');
  }
}
```

### Vercel Rewrite
Add to `vercel.json`:
```json
{ "source": "/api/admin/:path*", "destination": "/api/admin/[...all]" }
```

## Related Code Files

### Modify
- `vercel.json` — add admin catch-all rewrite

### Create
- `api/admin/[...all].ts` — consolidated catch-all handler

### Delete
- `api/admin/users.ts`
- `api/admin/invite.ts`
- `api/admin/invite-accept.ts`
- `api/admin/reports.ts`

### Update Tests
- `api/admin/reports.test.ts`
- `api/admin/create-user.test.ts`

## Implementation Steps

1. **Create `api/admin/[...all].ts`**
   - Import all handler logic from the 4 existing files
   - Extract each file's handler body into named functions: `handleUsers`, `handleInvite`, `handleInviteAccept`, `handleReports`
   - Add path-based routing via `req.query.all` segments
   - Keep all imports (drizzle, auth, resend, etc.)

2. **Update `vercel.json`**
   - Add rewrite rule: `{ "source": "/api/admin/:path*", "destination": "/api/admin/[...all]" }`
   - Place it before the SPA catch-all rewrite

3. **Delete old files**
   - Remove `api/admin/users.ts`, `api/admin/invite.ts`, `api/admin/invite-accept.ts`, `api/admin/reports.ts`

4. **Update test imports**
   - Tests should still call the same HTTP paths; only import paths change if they import handlers directly

5. **Verify function count**
   - Run `ls api/**/*.ts | grep -v _lib | grep -v test | wc -l` to confirm <= 12

6. **Local test**
   - `npm run dev` and verify all admin endpoints respond correctly
   - `npm test` to verify existing tests pass

## File Size Management
The consolidated file will be ~200 lines. If it exceeds 200 lines:
- Extract handler functions into `api/_lib/admin-handlers.ts`
- Keep `api/admin/[...all].ts` as a thin router (~30 lines)

## Todo List
- [ ] Create `api/admin/[...all].ts` with path routing
- [ ] Move handler logic from 4 files into consolidated file
- [ ] Update `vercel.json` with admin rewrite
- [ ] Delete old admin endpoint files
- [ ] Update test imports if needed
- [ ] Verify function count <= 12
- [ ] Run `npm test` — all tests pass
- [ ] Manual smoke test all 6 admin routes

## Success Criteria
- All admin routes respond identically to before
- Vercel function count drops from 12 to 9
- All existing tests pass
- No frontend changes needed

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Routing mismatch | API 404s | Test each route individually before deleting old files |
| Query param parsing | Broken invite validation | Verify `req.query` still contains `token` in catch-all |
| File too large | Violates 200-line rule | Extract handlers to `_lib/admin-handlers.ts` |

## Security Considerations
- Auth checks remain identical per route
- `invite-accept` stays publicly accessible (no auth required)
- No new attack surface introduced

## Next Steps
- After completion, proceed to Phase 2 (Credit System) which needs the freed function slots
