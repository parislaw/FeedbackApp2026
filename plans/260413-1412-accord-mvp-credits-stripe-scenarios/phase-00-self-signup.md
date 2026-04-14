---
title: "Phase 0: Self-Signup"
status: completed
priority: P0
effort: ~2.5h
---

# Phase 0: Self-Signup

**Context:** Prerequisite to the full MVP. Without self-signup, the landing page "Get 3 free credits" CTA has nowhere to go. better-auth already supports `signUp.email()` server-side — work is purely UI + credits DB hook.

**Parent plan:** `plans/260413-1412-accord-mvp-credits-stripe-scenarios/plan.md`

---

## Parallel Execution Plan

```
Task A (scout, 5 min):
  Verify Tailwind setup (LoginPage uses Tailwind classes but not in package.json)
  Verify authClient exposes signUp.email() — read lib/auth-client.ts

Task B (backend, ~1h) — runs AFTER scout:
  - Add `credits` table to api/_lib/db.ts
  - Run: npx drizzle-kit push
  - Create api/_lib/credit-service.ts (getBalance, addCredits, initializeCredits)
  - Add better-auth afterCreate hook in api/_lib/auth.ts to grant 3 free credits on signup

Task C (frontend, ~1h) — runs AFTER scout, PARALLEL with B:
  - Extend components/LoginPage.tsx
  - Add sign-up mode: name + email + password fields
  - Toggle between "Sign In" / "Sign Up" views (state: mode)
  - Call authClient.signUp.email({ name, email, password }) on submit
  - On success: window.location.href = '/' (matches existing sign-in redirect)
  - Handle errors: email already taken, validation failures

Task D (tests, ~30min) — runs AFTER B + C:
  - Test: new user signup creates credits row with balance=3
  - Test: getBalance returns correct balance
  - Test: duplicate email returns error
  - Run: npm run test — no regressions

Task E (code review, ~15min) — runs AFTER D:
  - Delegate to code-reviewer agent
  - Check: input validation, no secrets exposed, SQL injection prevention
```

---

## Key Files

| File | Action | Notes |
|------|--------|-------|
| `api/_lib/db.ts` | Modify | Add `credits` table |
| `api/_lib/auth.ts` | Modify | Add `afterCreate` user hook |
| `api/_lib/credit-service.ts` | Create | getBalance, addCredits, initializeCredits |
| `components/LoginPage.tsx` | Modify | Add signup form toggle |
| `lib/auth-client.ts` | Read only | Verify signUp.email exists |

---

## Credits Table Schema

```typescript
export const credits = pgTable('credits', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

## better-auth afterCreate Hook (in api/_lib/auth.ts)

```typescript
// Inside betterAuth({ ... }) config:
user: {
  hooks: {
    after: {
      createUser: async ({ user: newUser }) => {
        await db.insert(credits).values({ userId: newUser.id, balance: 3 })
          .onConflictDoNothing(); // safety: don't error if row exists
      },
    },
  },
},
```

## LoginPage Signup Extension Pattern

```typescript
// Add to top of LoginPage.tsx:
const [mode, setMode] = useState<'signin' | 'signup'>('signin');
const [name, setName] = useState('');

// Signup handler:
const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  setError('');
  const { error: authError } = await authClient.signUp.email({ name, email, password });
  if (authError) {
    setError(authError.message || 'Could not create account.');
    setIsSubmitting(false);
  } else {
    window.location.href = '/';
  }
};
```

---

## Success Criteria

- [x] New user can register via the sign-up form (no invite required)
- [x] `credits` row created with `balance = 3` immediately after signup
- [x] Duplicate email shows friendly error
- [x] Existing sign-in flow unchanged
- [x] `npm run test` passes with no regressions

---

## Security Considerations

- Password validation handled by better-auth (min length, etc.) — don't re-implement
- `name` field: trim, max 100 chars before passing to authClient
- No signup-specific rate limiting needed for MVP (better-auth handles brute force)
- Credit grant uses `onConflictDoNothing()` to be idempotent

---

## Next Steps After This Phase

With self-signup working, continue with:
1. **Phase 1** — Admin API consolidation (free Vercel function slots)
2. **Phase 2** — Full credit system (Stripe checkout, webhook, balance UI)
3. **Phase 6** — Landing page (now the CTA actually works)

---

## How to Execute (fresh session)

```
/cook /Users/paris/Documents/ParisCodes/FeedbackApp2026/FeedbackApp2026/plans/260413-1412-accord-mvp-credits-stripe-scenarios/phase-00-self-signup.md
```

Agents to dispatch in parallel after scout:
- `fullstack-developer` for Task B (backend)
- `fullstack-developer` for Task C (frontend)
- `tester` for Task D
- `code-reviewer` for Task E
