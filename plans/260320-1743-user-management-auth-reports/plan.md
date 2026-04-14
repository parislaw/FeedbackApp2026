# User Management & Report History Feature

## Context
The app currently uses a hardcoded password gate ("Assessment") with no real user accounts and no persistent storage. The goal is to replace this with a proper auth system: admin creates users via email invitation, users log in with email/password, reports are saved per-user, and admins can view all report history.

## Tech Stack Additions
- **Database:** Neon Postgres (via Vercel Marketplace)
- **Auth:** Better Auth — TypeScript-native, email/password, admin plugin, works with Vercel serverless
- **Email:** Resend (via Vercel Marketplace) — invitation & password-reset emails
- **ORM:** Drizzle ORM + `@neondatabase/serverless`
- **Router:** `react-router-dom` v7 — login, invite-accept, dashboard, reports, admin pages
- **Auth client:** `@better-auth/client` — React hooks for session/auth state

## Database Schema

```sql
-- Better Auth auto-generates: user, session, account, verification tables
-- App tables:
reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL REFERENCES user(id),
  scenario_id TEXT,
  scenario_title TEXT,
  provider    TEXT,  -- Gemini/Anthropic/OpenAI
  transcript  JSONB,
  evaluation  JSONB, -- EvaluationReport
  created_at  TIMESTAMPTZ DEFAULT now()
)
invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  token       TEXT NOT NULL UNIQUE,
  invited_by  TEXT REFERENCES user(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
)
```

## Routes (react-router-dom)

| Path | Component | Access |
|------|-----------|--------|
| `/login` | `LoginPage` | Public |
| `/invite/:token` | `InviteAcceptPage` | Public (token-gated) |
| `/` | `Dashboard` (existing) | Auth required |
| `/reports` | `ReportHistoryPage` | Auth required |
| `/admin` | `AdminPanel` | Admin role required |

## File Changes

### New files
- `api/_lib/auth.ts` — Better Auth server config (db, email, admin plugin)
- `api/_lib/db.ts` — Drizzle client + schema
- `api/auth/[...all].ts` — Better Auth catch-all handler
- `api/reports/save.ts` — POST: save evaluation report (auth required)
- `api/reports/list.ts` — GET: list user's own reports (auth required)
- `api/admin/users.ts` — GET/POST: list users, deactivate (admin only)
- `api/admin/invite.ts` — POST: create invitation + send email via Resend
- `api/admin/reports.ts` — GET: all users' reports with filters (admin only)
- `components/LoginPage.tsx` — Email/password login form
- `components/InviteAcceptPage.tsx` — Set password from invite token
- `components/ReportHistoryPage.tsx` — User's saved reports list + detail view
- `components/AdminPanel.tsx` — User management + report analytics tabs
- `lib/auth-client.ts` — Better Auth client instance (used in React components)

### Modified files
- `App.tsx` — Add router, replace PasswordOverlay with auth check, add "Save Report" button after evaluation
- `types.ts` — Add `User`, `SavedReport` types
- `vercel.json` — No route changes needed (Vercel auto-routes `api/auth/[...all].ts`)
- `package.json` — Add dependencies
- `index.tsx` — Wrap app in `<BrowserRouter>`

### Deleted files
- `components/PasswordOverlay.tsx` — Replaced by proper login

## Implementation Phases

### Phase 1 — Infrastructure
1. Add Neon via `vercel integration add neon` (user must approve in browser)
2. Add Resend via `vercel integration add resend` (user must approve)
3. `vercel env pull` to get `DATABASE_URL`, `RESEND_API_KEY` locally
4. Install: `better-auth drizzle-orm @neondatabase/serverless drizzle-kit resend react-router-dom @better-auth/client`
5. Create `api/_lib/db.ts` with Drizzle schema
6. Run `drizzle-kit push` to create tables in Neon

### Phase 2 — Auth Backend
1. Create `api/_lib/auth.ts` — configure Better Auth:
   - emailAndPassword plugin (enabled)
   - admin plugin (for role management)
   - Drizzle adapter pointing to Neon
   - Resend for sending invite/reset emails
2. Create `api/auth/[...all].ts` — export Better Auth handler for all `/api/auth/*` requests

### Phase 3 — Reports & Admin APIs
1. `api/reports/save.ts` — validate session cookie → insert into `reports`
2. `api/reports/list.ts` — validate session → return user's reports
3. `api/admin/invite.ts` — admin-only: generate token, insert invitation, send email via Resend
4. `api/admin/users.ts` — admin-only: list users, deactivate accounts
5. `api/admin/reports.ts` — admin-only: paginated list of all reports with user info

### Phase 4 — Frontend
1. `lib/auth-client.ts` — create Better Auth client with `baseURL: /api/auth`
2. `LoginPage.tsx` — form: email + password, calls `authClient.signIn.email()`
3. `InviteAcceptPage.tsx` — reads `:token` param, validates, calls set-password endpoint
4. Update `App.tsx`:
   - Remove PasswordOverlay import/usage
   - Add auth session check via `authClient.useSession()`
   - Redirect to `/login` if unauthenticated
   - Add "Save Report" button in evaluation view → POST to `/api/reports/save`
5. `ReportHistoryPage.tsx` — fetch from `/api/reports/list`, display cards with date/scenario/score
6. `AdminPanel.tsx` — two tabs: Users (list + invite form) and Reports (all users' reports table)
7. Update navigation header — add "My Reports" link, "Admin" link (if admin role), logout button

## Auth Flow

```
Admin invites user:
  AdminPanel → POST /api/admin/invite { email }
    → insert invitations row (token, 7-day expiry)
    → Resend sends email: "You've been invited — click to set password"
    → link: https://feedback-app2026.vercel.app/invite/{token}

User accepts invite:
  /invite/:token → validate token not expired/used
  → set password form → POST /api/auth/set-password (Better Auth)
  → mark invitation used_at, redirect to /login

User login:
  /login → authClient.signIn.email() → Better Auth sets session cookie
  → redirect to /

Save report:
  After evaluation → "Save Report" button → POST /api/reports/save
  → session cookie validated server-side → stored in Neon
```

## Security
- Better Auth session cookies (httpOnly, secure)
- Admin role enforced server-side on all `/api/admin/*` endpoints
- Invitation tokens: 7-day expiry, single-use, stored hashed
- No user can read another user's reports (server-side user_id check)

## First Admin Bootstrap
Since no UI exists initially, seed the first admin via a one-time script or direct Neon DB insert after tables are created.

## Verification
1. Run `npm run dev` — login page should appear (no password gate)
2. First admin: seed via script or direct DB insert
3. Admin panel: invite a test user → check email arrives via Resend dashboard
4. Accept invite link → set password → login → confirm session persists
5. Complete a scenario → evaluate → save report → view in Report History
6. Login as admin → verify test user's report appears in admin view
7. Run `npm test` — existing tests should still pass
