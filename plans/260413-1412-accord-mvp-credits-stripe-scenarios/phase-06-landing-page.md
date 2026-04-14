# Phase 6: Public Landing Page

## Context
- Parent: [plan.md](./plan.md)
- Dependencies: Phase 2 (pricing data), Phase 4 (scenario previews)

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** ~6h
- **Description:** Public `/` route for logged-out users with hero, how-it-works, scenario previews, pricing cards, CTA. Authenticated app moves to `/app` for logged-in users.

## Key Insights
- Current `App.tsx` routes `/` to `MainApp` (auth required) — must change to landing page for logged-out users
- React Router already handles auth redirects
- Simplest approach: keep `/` as landing page (public), add `/app` route for authenticated users
- Landing page is pure static React — no API calls needed
- Credit pack pricing comes from shared config (`credit-packs.ts` from Phase 2)

## Requirements
### Functional
- **Hero section**: Headline "Know your conversation is ready before it's real", subhead, CTA button
- **How it works**: 3-step visual (Choose scenario → Practice conversation → Get GAIN evaluation)
- **Scenario previews**: 3 featured scenario cards (one per category, hardcoded selection)
- **Pricing**: 3 credit pack cards matching Stripe config + "3 free credits" callout
- **CTA**: "Get 3 free credits — no card required" → links to signup
- **Navigation**: Logo, "Sign In" link, "Get Started" CTA button
- Authenticated users visiting `/` get redirected to `/app`

### Non-functional
- No JavaScript interactivity beyond routing (pure presentational)
- Mobile responsive
- Fast load — no API calls, no heavy assets
- Tailwind CSS only (already in project)

## Architecture

### Route Changes
```typescript
// App.tsx — updated routes
<Routes>
  {/* Public landing */}
  <Route path="/" element={isAuth ? <Navigate to="/app" replace /> : <LandingPage />} />

  {/* Auth */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/invite/:token" element={<InviteAcceptPage />} />

  {/* Authenticated app */}
  <Route path="/app" element={isAuth ? <MainApp /> : <Navigate to="/login" replace />} />
  <Route path="/reports" element={isAuth ? <ReportHistoryPage /> : <Navigate to="/login" replace />} />
  <Route path="/admin" element={isAdmin ? <AdminPanel /> : <Navigate to="/" replace />} />

  {/* Fallback */}
  <Route path="*" element={<Navigate to={isAuth ? '/app' : '/'} replace />} />
</Routes>
```

### Landing Page Component Structure
```
components/landing/
  LandingPage.tsx         — page shell with nav + footer (~60 lines)
  HeroSection.tsx         — headline, subhead, CTA (~40 lines)
  HowItWorksSection.tsx   — 3-step visual (~50 lines)
  ScenarioPreviewSection.tsx — 3 featured cards (~50 lines)
  PricingSection.tsx      — 3 pack cards + free credits callout (~60 lines)
  CtaSection.tsx          — bottom CTA band (~25 lines)
```

### Pricing Data
Import from shared config:
```typescript
import { CREDIT_PACKS } from '../../api/_lib/credit-packs';
// Note: This is a static import of the config, not an API call
// If credit-packs.ts uses process.env for Stripe price IDs,
// create a shared client-safe version without env vars:
// constants/pricing.ts — { id, name, credits, priceInCents }
```

Better approach: create `constants/pricing.ts` with display-only data (no Stripe IDs):
```typescript
export const PRICING_DISPLAY = [
  { id: 'starter', name: 'Starter', credits: 10, price: '$9', perCredit: '$0.90' },
  { id: 'pro', name: 'Pro', credits: 30, price: '$19', perCredit: '$0.63', popular: true },
  { id: 'power', name: 'Power', credits: 75, price: '$39', perCredit: '$0.52' },
];
```

## Related Code Files

### Create
- `components/landing/LandingPage.tsx`
- `components/landing/HeroSection.tsx`
- `components/landing/HowItWorksSection.tsx`
- `components/landing/ScenarioPreviewSection.tsx`
- `components/landing/PricingSection.tsx`
- `components/landing/CtaSection.tsx`
- `constants/pricing.ts` — client-safe pricing display data

### Modify
- `App.tsx` — add `/` → LandingPage route, move MainApp to `/app`
- `components/MainApp.tsx` — update internal links (Dashboard → `/app`, etc.)
- `components/ReportHistoryPage.tsx` — update "Dashboard" link to `/app`

## Implementation Steps

1. **Create `constants/pricing.ts`**
   - Display-only pricing data (no Stripe secrets)
   - Export `PRICING_DISPLAY` array

2. **Create `components/landing/` directory**

3. **Create `HeroSection.tsx`**
   - Headline: "Know your conversation is ready before it's real"
   - Subhead: "Practice difficult workplace conversations with AI role-play. Get evaluated on the GAIN framework. Build confidence before the real thing."
   - CTA button: "Get 3 Free Credits" → links to `/login?signup=true`
   - Secondary link: "Sign In" → `/login`

4. **Create `HowItWorksSection.tsx`**
   - Step 1: "Choose a scenario" — icon + description
   - Step 2: "Practice the conversation" — icon + description
   - Step 3: "Get your GAIN evaluation" — icon + description
   - Use numbered circles or simple SVG icons

5. **Create `ScenarioPreviewSection.tsx`**
   - Import 3 featured scenarios from constants (one easy, one medium, one hard)
   - Render simplified ScenarioCard previews (title, description, difficulty badge)
   - "See all 18 scenarios →" link to `/login`

6. **Create `PricingSection.tsx`**
   - Import `PRICING_DISPLAY` from constants
   - 3 cards in a row: name, price, credits, per-credit cost
   - Highlight "Pro" as "Most Popular"
   - "3 free credits on signup" callout above cards
   - Each card CTA: "Get Started" → `/login?signup=true`

7. **Create `CtaSection.tsx`**
   - Full-width band with CTA
   - "Ready to practice?" + button "Start Free — No Card Required"

8. **Create `LandingPage.tsx`**
   - Nav bar: Logo + "Sign In" + "Get Started" buttons
   - Compose: Hero → HowItWorks → ScenarioPreview → Pricing → CTA
   - Footer: same as MainApp footer (extract to shared component if needed)

9. **Update `App.tsx` routes**
   - `/` → LandingPage (public, redirect to `/app` if authenticated)
   - `/app` → MainApp (auth required)
   - Update all fallback redirects

10. **Update internal navigation links**
    - `MainApp.tsx`: Dashboard button → `/app`, header logo → `/app`
    - `ReportHistoryPage.tsx`: "Dashboard" link → `/app`
    - `AdminPanel.tsx`: back link → `/app`
    - `LoginPage.tsx`: success redirect → `/app` instead of `/`

11. **Handle signup query param**
    - `LoginPage.tsx`: if `?signup=true`, default to signup tab/mode

## Todo List
- [ ] Create constants/pricing.ts
- [ ] Create components/landing/ directory
- [ ] Create HeroSection.tsx
- [ ] Create HowItWorksSection.tsx
- [ ] Create ScenarioPreviewSection.tsx
- [ ] Create PricingSection.tsx
- [ ] Create CtaSection.tsx
- [ ] Create LandingPage.tsx (compose all sections)
- [ ] Update App.tsx routes (/ = landing, /app = authenticated)
- [ ] Update MainApp.tsx internal links to /app
- [ ] Update ReportHistoryPage links to /app
- [ ] Update LoginPage redirect to /app
- [ ] Mobile responsive check
- [ ] Verify auth redirect: logged-in user on / → /app
- [ ] Verify logged-out user on /app → /login

## Success Criteria
- Logged-out users see landing page at `/`
- Logged-in users get redirected from `/` to `/app`
- All 5 sections render correctly
- Pricing matches credit pack config
- CTA buttons link to login/signup
- Mobile responsive
- No API calls on landing page load
- All existing authenticated routes still work

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing bookmarks to / | Users land on wrong page | Auth redirect handles this automatically |
| Internal links still point to / | Redirect loops | Search-and-replace all `to="/"` and `href="/"` |
| Pricing data drift | Mismatch with Stripe | Single source of truth in constants/pricing.ts |

## Security Considerations
- Landing page is fully public — no sensitive data
- No Stripe price IDs or API keys exposed in client code
- Pricing display data is non-sensitive (publicly visible pricing)
- CTA links to /login, not directly to Stripe checkout

## Next Steps
- After landing page ships, measure conversion: landing → signup → first session
