# Project Changelog

All notable changes to the Accord feedback app are documented here. Format follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- **Phase 0: Self-Signup** (2026-04-13)
  - User registration via signup form without invite requirement
  - Credits table (`api/_lib/db.ts`): userId FK, balance, updatedAt
  - Credit service module (`api/_lib/credit-service.ts`): getBalance, addCredits, initializeCredits functions
  - better-auth hook: auto-grant 3 free credits on user signup
  - LoginPage extension: signup mode toggle with name, email, password fields
  - Duplicate email validation with friendly error messages
  - Database migration: credits table deployed to Neon
  - Test coverage: 22 new tests for credit service (all passing)

### Security
- Credit grant operation uses `onConflictDoNothing()` for idempotence
- Password validation delegated to better-auth (no custom implementation)
- Name field validation: trim, max 100 chars before signup

---

## Integration Notes

**Files Modified:**
- `api/_lib/db.ts` — Added credits table schema
- `api/_lib/auth.ts` — Added afterCreate user hook for credit initialization
- `components/LoginPage.tsx` — Extended with signup mode and form toggle
- Database: credits table migrated via `npx drizzle-kit push`

**New Files:**
- `api/_lib/credit-service.ts` — Credit balance and initialization logic
- `api/_lib/credit-service.test.ts` — Service unit tests

**Backward Compatibility:**
- Existing sign-in flow unchanged
- No breaking changes to existing endpoints

---

## Next Phases

- **Phase 1**: Admin API Consolidation (free Vercel function slots)
- **Phase 2**: Full Credit System (Stripe checkout, webhooks, balance UI)
- **Phase 6**: Public Landing Page (CTA now functional)
