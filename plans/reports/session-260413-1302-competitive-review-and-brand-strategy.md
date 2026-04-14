# Session Summary: Competitive Review + Brand Strategy
**Date:** 2026-04-13 | **Status:** Paused — pick up here

---

## What We Did

Ran a competitive review of TenorHQ (https://www.tenorhq.com/) and the broader AI feedback coaching market. Produced 3 reports:
- `researcher-260413-1302-tenorHQ-product-analysis.md`
- `researcher-260413-1302-competitive-landscape.md`
- `researcher-260413-1302-market-readiness-gap-analysis.md`

---

## Key Findings (compressed)

**TenorHQ:**
- Enterprise B2B, $5.4M seed (Dec 2024, out of stealth)
- Core: voice AI role-play for managers, 150+ scenarios, always-on AI coach via Slack/Teams
- No public pricing, no freemium, sales-led only
- Founded by ex-Workday Learning leaders (credibility, but slow sales cycles)
- One named customer: Guild. Early-stage.
- Their positioning: "Practice before the real conversation"

**Competitive landscape:**
- Simulation/roleplay is the current differentiating arms race (BetterUp added it Fall 2025; Yoodli raised $40M Series B 2025)
- Yoodli is the most direct pure-play competitor ($0→$8→$20→Enterprise, PLG-to-enterprise)
- Table stakes: AI feedback writing, goal tracking, Slack/Teams, SSO, manager effectiveness focus
- GTM pattern that works: freemium PLG for awareness → sales-led for team/enterprise conversion

**Accord's strengths vs. market:**
- GAIN framework with 100-point scoring = real differentiator (nobody else has a named, structured eval framework)
- Multi-provider AI already wired
- Scenario generation + evaluation pipeline exists
- Auth + DB already live
- Partial voice infrastructure (transcribe + voice-token endpoints)

---

## Prioritized Gap List

**P0 (before any revenue):**
1. Freemium → Pro ($15-20/mo) → Team ($12-15/seat/mo) → Enterprise pricing
2. Marketing landing page (explain GAIN/brand, pricing, "Start free" CTA)
3. Onboarding flow (role selection, guided first session, upgrade prompts)

**P1 (real product):**
4. Complete voice role-play loop (voice in → AI voice response → GAIN debrief)
5. Pre-built scenario library (25-50: perf reviews, conflict, 1:1s, change mgmt)
6. User progress dashboard (GAIN score trends, session history)
7. PDF report export (shareable artifact, closes B2B deals)

**P2 (team/B2B sales):**
8. Admin/team dashboard (org-level scores, CSV export, usage stats)
9. Custom scenario builder (Team tier+)
10. Shareable scenario links (HR emails link before review season)

**P3 (enterprise $10K+ deals):**
11. SSO / SAML (Okta, Azure AD)
12. SOC 2 Type II (start audit process — 6-12 months)
13. Slack integration (practice nudges in flow of work)
14. LMS / SCORM packaging

---

## Brand Strategy Discussion (where we ended)

**Problem:** Can't brand GAIN — it's someone else's framework.

**Decision:** Don't rebrand the rubric. Productize the system around it.

**The Accord Practice Method** — brand the *loop*, not the dimensions:
> Practice → Evaluate → Track change → Repeat

GAIN becomes a cited input ("evaluation draws on evidence-based feedback research including GAIN"); Accord's methodology is the compound system built around it.

**Key insight from user:** The Accord Practice Method's uniqueness is that it creates a **pressure test** for real conversations — not soft roleplay, but a rigorous simulation that exposes where you break before the conversation is real.

**What makes it a real pressure test (not just practice):**
- AI resists, gets defensive, deflects — not a neutral partner
- Pass/fail threshold — you don't move on until you pass
- Debrief pinpoints the exact moment you lost the thread
- Adaptive difficulty — harder as your baseline score improves

**Positioning unlocked:**
> "Know your conversation is ready before it's real."

Not coaching — **certification**. "Certified Conversation Ready" credential is a potential product category play that L&D buyers will pay premium for.

---

## Open Questions (not yet answered)

1. Do we want to build toward a "Certified Conversation Ready" credential?
2. Is the target buyer HR/L&D (Tenor's buyer) or individual managers (Yoodli's buyer)? This changes every GTM decision.
3. Does the brand name "Accord" work for B2B, or does it need a market-facing rebrand?
4. Are there IP/licensing considerations for GAIN framework before public marketing?
5. What is the team capacity — can we pursue PLG self-serve, or does this need a sales hire early?

---

## Next Actions (when resuming)

- [ ] Decide: individual manager (PLG) vs. HR/L&D (sales-led) as primary buyer → this unlocks everything else
- [ ] Define what "pressure test" means mechanically in the product (AI resistance levels, pass/fail threshold, adaptive difficulty)
- [ ] Sketch the Accord Practice Method as a visual framework (4-stage loop diagram)
- [ ] Write positioning copy for the landing page based on "pressure test" angle
- [ ] Prioritize P0 items: pricing model + onboarding flow as first implementation sprint
