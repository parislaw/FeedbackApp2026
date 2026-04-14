# Phase 2: Credit System (Stripe)

## Context
- Parent: [plan.md](./plan.md)
- Dependencies: Phase 1 (need free function slots)
- Research: [Stripe Credits Research](./research/researcher-01-stripe-credits.md)

## Overview
- **Priority:** P0
- **Status:** pending
- **Effort:** ~8h
- **Description:** DB schema for credits + webhook idempotency, Stripe Checkout for one-time credit pack purchases, webhook fulfillment, credit balance UI, free credits on signup.

## Key Insights
- Stripe Checkout `mode: 'payment'` for one-time purchases (not subscription)
- Webhook signature verification requires raw body — Vercel auto-parses JSON by default
- For Vercel serverless (non-Next.js), use `request.text()` Web API to get raw body
- Idempotency via `webhook_events` table prevents double-credit on webhook retry
- Metadata on checkout session carries `userId` + `creditAmount` through to webhook

## Requirements
### Functional
- 3 credit packs: Starter (10/$9), Pro (30/$19), Power (75/$39)
- Stripe Checkout redirect flow (no embedded form)
- Webhook processes `checkout.session.completed` event
- Credits stored in `credits` table, incremented atomically
- New users get 3 free credits on signup (no card required)
- Credit balance visible in app header
- Purchase history not needed for MVP

### Non-functional
- Webhook must be idempotent (at-least-once delivery)
- Stripe secret key never exposed to client
- All Stripe operations server-side only

## Architecture

### New DB Tables

```typescript
// In api/_lib/db.ts
import { integer } from 'drizzle-orm/pg-core';

export const credits = pgTable('credits', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const webhookEvents = pgTable('webhook_events', {
  stripeEventId: text('stripe_event_id').primaryKey(),
  processedAt: timestamp('processed_at').defaultNow().notNull(),
});
```

### Extend User Table
```typescript
// Add to user table definition
corporateTier: boolean('corporate_tier').default(false),
```

### API: `api/billing/[...all].ts`
Routes:
- `POST /api/billing/checkout` — create Stripe Checkout session
- `POST /api/billing/webhook` — Stripe webhook handler (raw body)
- `GET /api/billing/credits` — get current user's credit balance

### Credit Pack Config
```typescript
// api/_lib/credit-packs.ts
export const CREDIT_PACKS = [
  { id: 'starter', name: 'Starter', credits: 10, priceInCents: 900, stripePriceId: process.env.STRIPE_PRICE_STARTER! },
  { id: 'pro', name: 'Pro', credits: 30, priceInCents: 1900, stripePriceId: process.env.STRIPE_PRICE_PRO! },
  { id: 'power', name: 'Power', credits: 75, priceInCents: 3900, stripePriceId: process.env.STRIPE_PRICE_POWER! },
] as const;
```

### Checkout Flow
```
User clicks "Buy Credits" → POST /api/billing/checkout { packId, userId }
  → Server creates Stripe Checkout Session with metadata
  → Returns { url: session.url }
  → Client redirects to Stripe
  → User pays → Stripe redirects to /app?payment=success
  → Stripe fires webhook → POST /api/billing/webhook
  → Server verifies signature, checks idempotency, adds credits
```

### Free Credits on Signup
In `api/admin/[...all].ts` → `handleInviteAccept`:
After `auth.api.signUpEmail()` succeeds, insert row into `credits` table with `balance: 3`.

Also add to the direct signup flow if users can self-register. Check `api/auth/[...all].ts` — better-auth handles signup. Use a **Drizzle `afterCreate` hook** or a post-signup trigger:
```typescript
// In api/_lib/auth.ts — add user creation hook
user: {
  hooks: {
    after: {
      createUser: async ({ user: newUser }) => {
        await db.insert(credits).values({ userId: newUser.id, balance: 3 });
      }
    }
  }
}
```

## Related Code Files

### Create
- `api/billing/[...all].ts` — checkout, webhook, balance endpoints
- `api/_lib/credit-packs.ts` — pack definitions
- `api/_lib/credit-service.ts` — addCredits, deductCredit, getBalance helpers

### Modify
- `api/_lib/db.ts` — add `credits`, `webhookEvents` tables, add `corporateTier` to `user`
- `api/_lib/auth.ts` — add post-signup hook to grant 3 free credits
- `vercel.json` — add billing catch-all rewrite
- `package.json` — add `stripe` dependency
- `components/MainApp.tsx` — show credit balance in header

### Frontend (new component)
- `components/CreditBalance.tsx` — displays balance, links to buy page
- `components/BuyCreditsModal.tsx` — shows 3 pack cards, redirects to Stripe

## Implementation Steps

1. **Install Stripe SDK**
   ```bash
   npm install stripe
   ```

2. **Create Stripe products and prices in Stripe Dashboard**
   - Product: "Accord Credits"
   - 3 prices: $9 (10 credits), $19 (30 credits), $39 (75 credits)
   - Note price IDs for env vars

3. **Add env vars** (`.env.local` + Vercel dashboard)
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_STARTER=price_...
   STRIPE_PRICE_PRO=price_...
   STRIPE_PRICE_POWER=price_...
   ```

4. **Update DB schema** (`api/_lib/db.ts`)
   - Add `credits` table
   - Add `webhookEvents` table
   - Add `corporateTier` column to `user`

5. **Run migration**
   ```bash
   npx drizzle-kit push
   ```

6. **Create `api/_lib/credit-packs.ts`**
   - Export `CREDIT_PACKS` array
   - Export `findPack(packId)` helper

7. **Create `api/_lib/credit-service.ts`**
   - `getBalance(userId): Promise<number>`
   - `addCredits(userId, amount): Promise<number>` — atomic `balance + amount`
   - `deductCredit(userId): Promise<boolean>` — atomic `balance - 1` with `balance > 0` guard
   - `initializeCredits(userId, amount = 3): Promise<void>` — insert initial row

8. **Create `api/billing/[...all].ts`**
   - Route: `checkout` → authenticate user, validate packId, create Stripe session with metadata `{ userId, creditAmount, packId }`, return `{ url }`
   - Route: `webhook` → read raw body via `request.text()`, verify Stripe signature, check `webhookEvents` for duplicate, process `checkout.session.completed`, insert event record, add credits
   - Route: `credits` → authenticate user, return `{ balance }`

9. **Update `vercel.json`**
   ```json
   { "source": "/api/billing/:path*", "destination": "/api/billing/[...all]" }
   ```

10. **Add post-signup hook** (`api/_lib/auth.ts`)
    - Grant 3 free credits when a new user is created via better-auth

11. **Create `components/CreditBalance.tsx`**
    - Fetch `GET /api/billing/credits` on mount
    - Show balance as badge in header
    - Click opens `BuyCreditsModal`

12. **Create `components/BuyCreditsModal.tsx`**
    - 3 pack cards with price/credits
    - Click → `POST /api/billing/checkout` → redirect to `session.url`

13. **Update `components/MainApp.tsx`**
    - Add `CreditBalance` component to header

14. **Test with Stripe CLI**
    ```bash
    stripe listen --forward-to localhost:3000/api/billing/webhook
    stripe trigger checkout.session.completed
    ```

## Todo List
- [ ] Install `stripe` package
- [ ] Add `credits` + `webhookEvents` tables to `db.ts`
- [ ] Add `corporateTier` to user table
- [ ] Run `drizzle-kit push`
- [ ] Create `credit-packs.ts`
- [ ] Create `credit-service.ts` with get/add/deduct
- [ ] Create `api/billing/[...all].ts` with 3 routes
- [ ] Add billing rewrite to `vercel.json`
- [ ] Add post-signup credit hook in `auth.ts`
- [ ] Create `CreditBalance.tsx`
- [ ] Create `BuyCreditsModal.tsx`
- [ ] Add balance to MainApp header
- [ ] Set env vars locally and in Vercel
- [ ] Test webhook locally with Stripe CLI
- [ ] Test idempotency (send same event twice)
- [ ] Verify free credits granted on new signup

## Success Criteria
- User can purchase credits via Stripe Checkout
- Credits correctly added to DB after payment
- Duplicate webhooks do not double-credit
- New users receive 3 free credits
- Balance visible in app header
- Function count stays <= 12

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Raw body parsing on Vercel | Webhook signature fails | Use Web API `request.text()`, not Node.js body parser |
| Double credit on retry | Financial loss | `webhook_events` idempotency table |
| Stripe price ID mismatch | Checkout fails | Validate packId against known IDs server-side |
| Race condition on balance update | Incorrect balance | Use atomic SQL: `SET balance = balance + $amount` |

## Security Considerations
- Stripe secret key only on server, never in client bundle
- Webhook signature verified before processing
- User ID from authenticated session, not from client body (checkout endpoint)
- Credit balance only accessible by authenticated user for their own account
- No PII stored in Stripe metadata beyond userId

## Next Steps
- Phase 3: Usage Gate (uses credit-service.ts to gate chat access)
