# Plan: Credit System

**Status:** Pending
**Goal:** Gate practice sessions behind a credit balance so the app can charge for more credits later.

---

## Context

Users need a limited resource (credits) to practice. Each session consumes credits. Admins can grant credits. Later, a payment integration (Stripe) will let users purchase more.

---

## Database

**File:** `api/_lib/db.ts`
Add `credits` column to `user` table (integer, default 10 — enough for a free trial).

```sql
ALTER TABLE "user" ADD COLUMN credits INTEGER NOT NULL DEFAULT 10;
```

Use Drizzle migration or direct SQL via `scripts/`.

---

## API Changes

### `api/admin/users.ts`
- GET response: include `credits` field
- POST `action: 'set-credits'`: `{ userId, credits: number }` — admin sets balance directly

### `api/credits.ts` (new — counts as 1 function)
- GET `/api/credits` — returns `{ credits }` for current user
- POST `/api/credits/consume` — deducts 1 credit; returns `{ credits }` or 403 if balance = 0

> **Note:** Must stay within 12-function Hobby plan limit. Combine both GET + POST in one file, or fold into existing `api/reports.ts`. Check function count before adding.

---

## Frontend Changes

### `components/MainApp.tsx`
- Fetch credit balance on load, store in state
- Show credit badge in header (e.g. `⚡ 8 credits`)
- Before starting a session (text or voice), call `/api/credits/consume`
- If 403 → show "Out of credits" modal with CTA: "Get more credits" (placeholder for future payment)

### `components/AdminUsersTab.tsx`
- Add `credits` column to users table
- Add inline edit or "Set Credits" button per user row

### `components/LoginPage.tsx`
- No changes (credits loaded post-auth)

---

## Credit Consumption Rules

| Action | Cost |
|--------|------|
| Start text practice session | 1 credit |
| Start voice practice session | 1 credit |
| Upload feedback for analysis | 1 credit |
| View report history | 0 credits |
| Admin actions | 0 credits |

---

## Types

Update `types.ts` — add `credits` to `AuthUser`:
```typescript
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  credits?: number;
}
```

---

## Future: Stripe Integration

When ready, add `/api/payments/checkout` (Stripe Checkout session) that grants credits on `checkout.session.completed` webhook. Plan separately.

---

## Files to Modify
- `api/_lib/db.ts` — add credits column to schema
- `api/admin/users.ts` — expose + set credits
- `api/credits.ts` — new: get balance + consume
- `components/MainApp.tsx` — credit badge + gate
- `components/AdminUsersTab.tsx` — show + edit credits
- `types.ts` — AuthUser.credits

## Verification
1. Admin sets credits for user → appears in user table
2. User starts session → credit deducted
3. User reaches 0 → blocked with modal
4. Admin grants credits → user can practice again
5. `npx tsc --noEmit` clean
6. `npm test` passes
7. `vercel --prod` within 12-function limit
