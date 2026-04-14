# Phase 3: Usage Gate

## Context
- Parent: [plan.md](./plan.md)
- Dependencies: Phase 2 (credits table + credit-service.ts must exist)

## Overview
- **Priority:** P0
- **Status:** pending
- **Effort:** ~3h
- **Description:** API-level credit check on `/api/chat`, frontend paywall modal when 0 credits, credit deduction on successful evaluation, double-deduction guard.

## Key Insights
- Credit should be deducted on `POST /api/reports` (save), not on `/api/evaluate` — because evaluate can fail/retry and user shouldn't lose credit for a failed evaluation
- Actually, deduct on successful `/api/evaluate` response is better UX: user "used" the session even if they don't save. But must guard double-deduction if they re-evaluate same transcript.
- Best approach: deduct on `/api/evaluate` success, use a `sessionId` (UUID generated client-side per conversation) to prevent double-deduction for same session
- Gate `/api/chat` at first message only (not every message) — check balance > 0 but don't deduct yet

## Requirements
### Functional
- `/api/chat`: return 402 if user has 0 credits (check on every request for safety)
- `/api/evaluate`: deduct 1 credit on successful evaluation; include `sessionId` for idempotency
- Frontend: intercept scenario selection, show paywall modal if 0 credits
- Frontend: show inline "0 credits" warning in chat if balance hits 0 mid-flow (edge case)
- No credit deduction for admin users (unlimited usage)

### Non-functional
- Double-deduction prevented via `sessionId` tracking
- Atomic deduction: `UPDATE credits SET balance = balance - 1 WHERE userId = $1 AND balance > 0`

## Architecture

### API Gate on `/api/chat`
```typescript
// Add to top of chat.ts handler, after auth check
import { getBalance } from './_lib/credit-service.js';
import { getSessionFromHeaders } from './_lib/auth.js';

// After existing validation:
const session = await getSessionFromHeaders(req.headers);
if (!session) return sendError(res, 401, 'Unauthorized');

// Admin bypass
if (session.user.role !== 'admin') {
  const balance = await getBalance(session.user.id);
  if (balance <= 0) {
    return sendError(res, 402, 'No credits remaining. Purchase credits to continue.');
  }
}
```

### Deduction on `/api/evaluate`
```typescript
// After successful evaluation JSON parse, before returning:
const sessionId = req.body.sessionId as string | undefined;
if (session.user.role !== 'admin' && sessionId) {
  await deductCreditForSession(session.user.id, sessionId);
}
```

### Session Deduction Tracking
Add to `credit-service.ts`:
```typescript
export const creditDeductions = pgTable('credit_deductions', {
  sessionId: text('session_id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  deductedAt: timestamp('deducted_at').defaultNow().notNull(),
});

export async function deductCreditForSession(userId: string, sessionId: string): Promise<boolean> {
  // Check if already deducted for this session
  const existing = await db.select()
    .from(creditDeductions)
    .where(eq(creditDeductions.sessionId, sessionId));
  if (existing.length > 0) return false; // Already deducted

  // Atomic deduct
  const result = await db.update(credits)
    .set({ balance: sql`balance - 1`, updatedAt: new Date() })
    .where(and(eq(credits.userId, userId), gt(credits.balance, 0)))
    .returning({ balance: credits.balance });

  if (result.length === 0) return false; // No credits to deduct

  // Record deduction
  await db.insert(creditDeductions).values({ sessionId, userId });
  return true;
}
```

### Frontend Paywall
```typescript
// components/PaywallModal.tsx
// Shown when user tries to start a scenario with 0 credits
// Contains: "You're out of credits" message + 3 pack cards + buy button
// Reuses BuyCreditsModal logic from Phase 2
```

## Related Code Files

### Modify
- `api/chat.ts` — add credit balance check (auth + 402 gate)
- `api/evaluate.ts` — add credit deduction on success
- `api/_lib/db.ts` — add `creditDeductions` table
- `api/_lib/credit-service.ts` — add `deductCreditForSession()`
- `components/MainApp.tsx` — intercept scenario select when balance = 0, show paywall

### Create
- `components/PaywallModal.tsx` — "no credits" modal with buy options

## Implementation Steps

1. **Add `creditDeductions` table to `api/_lib/db.ts`**
   ```typescript
   export const creditDeductions = pgTable('credit_deductions', {
     sessionId: text('session_id').primaryKey(),
     userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
     deductedAt: timestamp('deducted_at').defaultNow().notNull(),
   });
   ```

2. **Run migration**
   ```bash
   npx drizzle-kit push
   ```

3. **Add `deductCreditForSession` to `api/_lib/credit-service.ts`**
   - Check `creditDeductions` for existing sessionId
   - Atomic `UPDATE credits SET balance = balance - 1 WHERE balance > 0`
   - Insert into `creditDeductions`

4. **Gate `/api/chat`**
   - Import `getSessionFromHeaders` and `getBalance`
   - After method validation, get session
   - If not admin and balance <= 0, return 402
   - Note: chat currently has no auth check — must add one

5. **Deduct on `/api/evaluate`**
   - Add `sessionId` to request body type
   - After successful evaluation parse, call `deductCreditForSession`
   - Return credit info in response: `{ ...report, creditsRemaining: balance }`

6. **Generate `sessionId` on client**
   - In `MainApp.tsx`, when user selects a scenario, generate `crypto.randomUUID()`
   - Pass it through to `ChatInterface` → evaluation call
   - Same sessionId for entire conversation lifecycle

7. **Create `components/PaywallModal.tsx`**
   - Props: `isOpen`, `onClose`, `onBuyCredits`
   - Shows pack options, redirects to Stripe checkout

8. **Update `MainApp.tsx`**
   - On scenario select: check credit balance from `CreditBalance` state
   - If 0, show `PaywallModal` instead of starting chat
   - After successful purchase (redirect back with `?payment=success`), refresh balance

9. **Update `types.ts`**
   - Add `sessionId` to evaluate request type if needed
   - Add `creditsRemaining` to evaluate response type

## Todo List
- [ ] Add `creditDeductions` table to db.ts
- [ ] Run drizzle-kit push
- [ ] Add `deductCreditForSession` to credit-service.ts
- [ ] Add auth + credit gate to chat.ts
- [ ] Add deduction logic to evaluate.ts
- [ ] Generate sessionId in MainApp.tsx on scenario select
- [ ] Pass sessionId through ChatInterface to evaluate call
- [ ] Create PaywallModal.tsx
- [ ] Show paywall when balance = 0 on scenario select
- [ ] Handle `?payment=success` redirect to refresh balance
- [ ] Test: admin user bypasses gate
- [ ] Test: 0-credit user gets 402 on chat
- [ ] Test: same sessionId doesn't double-deduct
- [ ] Test: evaluate deducts exactly 1 credit

## Success Criteria
- User with 0 credits cannot start new chat (402 from API)
- User with 0 credits sees paywall modal on scenario select
- Successful evaluation deducts exactly 1 credit
- Re-evaluating same session does not deduct again
- Admin users have unlimited access
- Credit balance updates in real-time in header after deduction

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Race condition: two evaluate calls same sessionId | Double deduct | `creditDeductions` PK prevents duplicate insert |
| Chat has no auth currently | Can't check credits | Add auth check to chat.ts (needed anyway for security) |
| User refreshes mid-chat, gets new sessionId | Free re-evaluation | sessionId generated once per scenario select, stored in state |
| Balance check on chat but deduct on evaluate | User gets 1 "free" chat if balance hits 0 between | Acceptable for MVP; worst case is 1 extra chat |

## Security Considerations
- Credit check is server-side (API level), not just frontend
- Frontend paywall is UX convenience; API is the real gate
- Admin bypass uses server-side role check, not client claim
- sessionId is client-generated UUID — server validates format but doesn't need to trust it for security (it's for idempotency, not authorization)

## Next Steps
- After gate is working, Phase 4 (Scenario Library) can proceed independently
