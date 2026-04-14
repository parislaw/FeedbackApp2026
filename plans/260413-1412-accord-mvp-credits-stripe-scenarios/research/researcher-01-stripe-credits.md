# Stripe One-Time Credit Purchases Research Report

**Date:** 2026-04-13  
**Scope:** Stripe Checkout Sessions + Webhooks for credit pack purchases in Vercel serverless environment

## 1. Stripe Checkout Sessions (One-Time Payments)

### Creating a Checkout Session
- **Mode:** Set `mode: 'payment'` for one-time purchases (vs `'subscription'`)
- **Line Items:** Pass array of `line_items` with `price` ID and `quantity`
- **Redirect URLs:** `success_url` and `cancel_url` for post-payment flow
- **Metadata:** Pass custom key-value pairs (max 50 keys, 40-char keys, 500-char values)

**Basic Pattern:**
```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [
    { price: 'price_10credits', quantity: 1 }
  ],
  success_url: 'https://yoursite.com/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://yoursite.com/cancel',
  metadata: {
    userId: 'user_123',
    creditAmount: '10'
  }
});
// Redirect client to session.url
```

## 2. Vercel Raw Body Parsing (CRITICAL FIX)

Vercel's default middleware auto-parses JSON body, breaking Stripe signature verification. Solution:

**Next.js API Route with Raw Body:**
```typescript
// pages/api/webhooks/stripe.ts
import { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false, // CRITICAL: Disable default body parser
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const buf = await new Promise<Buffer>((resolve, reject) => {
    let data = Buffer.alloc(0);
    req.on('data', chunk => {
      data = Buffer.concat([data, chunk]);
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return res.status(400).json({ error: 'Webhook signature failed' });
  }

  // Process event...
  res.status(200).json({ received: true });
}
```

## 3. Handling `checkout.session.completed` Event

Webhook payload structure:
```typescript
event.type === 'checkout.session.completed'

// Access session data:
const session = event.data.object; // Stripe.Checkout.Session
session.id            // Session ID
session.customer      // Customer ID
session.metadata      // Your custom metadata (userId, creditAmount)
session.payment_status // "paid"
```

**Fulfillment Pattern:**
```typescript
if (event.type === 'checkout.session.completed') {
  const { metadata, payment_status } = event.data.object;
  
  if (payment_status !== 'paid') return;
  
  const { userId, creditAmount } = metadata;
  
  // Add credits to PostgreSQL (Neon + Drizzle)
  await db.update(users)
    .set({ credits: sql`credits + ${parseInt(creditAmount)}` })
    .where(eq(users.id, userId));
}
```

## 4. Stripe Metadata Passing

- Set metadata during `checkout.sessions.create()` call
- Metadata is **automatically included** in webhook events
- Key constraint: No square brackets in keys
- Example: `metadata: { userId: user.id, creditAmount: packAmount }`

## 5. Idempotency (Critical for Preventing Double Credit)

**Problem:** Stripe retries webhooks with at-least-once delivery; duplicates expected.

**Solution:** Event-level idempotency
```typescript
// 1. Check if event already processed
const existingEvent = await db.query.webhookEvents.findFirst({
  where: eq(webhookEvents.stripeEventId, event.id)
});

if (existingEvent) {
  return res.status(200).json({ received: true });
}

// 2. Process event
const { userId, creditAmount } = event.data.object.metadata;
await db.update(users)
  .set({ credits: sql`credits + ${parseInt(creditAmount)}` })
  .where(eq(users.id, userId));

// 3. Record event as processed (atomic transaction)
await db.insert(webhookEvents).values({
  stripeEventId: event.id,
  type: event.type,
  processedAt: new Date()
});

res.status(200).json({ received: true });
```

**Database Schema:**
```typescript
webhookEvents: {
  stripeEventId: string (PRIMARY KEY, UNIQUE),
  type: string,
  processedAt: timestamp
}
```

## 6. Stripe NPM Package

- **Current version:** 2026-03-25.dahlia (latest)
- **TypeScript:** Full first-class support; types inline with implementation
- **Installation:** `npm install stripe`
- **Min TypeScript:** 3.1+
- **Node.js Support:** 18+ recommended

## 7. Integration Checklist

- [ ] Create Stripe product (e.g., "10 Credits") with prices
- [ ] Implement checkout endpoint: `POST /api/checkout/create-session`
- [ ] Implement webhook endpoint: `POST /api/webhooks/stripe` with raw body config
- [ ] Store webhook events in `webhookEvents` table for idempotency
- [ ] Test locally with Stripe CLI: `stripe trigger checkout.session.completed`
- [ ] Set webhook signing secret in env: `STRIPE_WEBHOOK_SECRET`
- [ ] Verify in Stripe Dashboard → Webhooks → Endpoint details

## 8. Key Constraints & Gotchas

1. **Vercel Body Parser:** Must disable with `bodyParser: false` in Next.js config
2. **Raw Body Access:** Use `request.text()` in Web API or Buffer concatenation in Node.js
3. **Metadata Size:** Max 500 chars per value; store large data in database, not metadata
4. **Webhook Retries:** Stripe retries for 3 days; idempotency table is mandatory
5. **Signature Verification:** Always check `Stripe-Signature` header before processing

## Unresolved Questions

1. Should credit fulfillment be async (job queue) vs sync in webhook? (Sync safer for MVP)
2. Should we track failed/pending credit grants, or rely on Stripe retries? (Retries sufficient)
3. Need to define credit pack pricing tiers—confirm with PM before implementation
4. Should we implement Stripe Customer creation, or keep stateless? (Stateless for MVP)
5. Do we need webhooks for `payment_intent.failed` to log failed purchases?

## Sources

- [Stripe Checkout Sessions API](https://docs.stripe.com/api/checkout/sessions/create?lang=node)
- [Vercel Raw Body Access](https://vercel.com/kb/guide/how-do-i-get-the-raw-body-of-a-serverless-function)
- [Stripe Webhooks Documentation](https://docs.stripe.com/webhooks)
- [Stripe Metadata Guide](https://docs.stripe.com/metadata)
- [Webhook Idempotency Pattern](https://hookdeck.com/webhooks/guides/implement-webhook-idempotency)
- [Stripe Node.js Releases](https://github.com/stripe/stripe-node/releases)
