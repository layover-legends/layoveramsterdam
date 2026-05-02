# Design notes — improvements to apply per phase

This document captures observations on the brand identity and wireframes
that would lift the product from "premium look" to "premium experience."
None of these block execution of any current phase — they're refinements
to apply at the right moment.

Each item is tagged with the phase that owns it. When that phase starts,
read this file alongside the relevant prompt.

---

## 🎨 Brand identity — refinements

### B1. Mobile typography test before locking Cormorant Garamond
**Phase**: 7a (brand retrofit) · **Priority**: HIGH
Cormorant Garamond at small sizes on cheap Android screens renders fuzzy.
Spec says display only (24px+) — verify on a real $200 Android device
before any production build. If anti-aliasing fails, restrict Cormorant
to 32px+ and use Outfit for everything below.
**Status**: Font shipped in `fee3024` — restricted to `font-display` only (headings, h1/h2). Body defaults to Outfit (`font-sans`). Manual device test still needed to validate antialiasing. ⏳ Pending user test.

### B2. WCAG AA contrast audit on Gold-on-Cream combinations
**Phase**: 7a · **Priority**: HIGH
`#C9963A` on `#F7F3EC` is borderline for body text under WCAG AA
(4.5:1 ratio). Buttons might need to use Gold Dark `#A07828` for
text/pressed states. Failing AA blocks public-sector tourism partnerships
and creates EU legal exposure. Run https://webaim.org/resources/contrastchecker/
on every text/bg pair from the brand PDF.
**Status**: Palette shipped (`0ff94e4`) but contrast audit not yet run. Gold (`#C9963A`) is used for accents/CTAs, not body text — `warm-cream` on `ink-black` (white-on-black, 19.6:1) is the primary text combination. Audit needed before public launch. ⏳ Pending audit.

### B3. Define motion language
**Phase**: 7a or 7c · **Priority**: MEDIUM
Premium tourism brands use subtle motion (parallax on tour cards, fade-in
on scroll, shimmer on price). The brand PDF doesn't address this — without
spec, motion ends up inconsistent across pages. Define 4 motion tokens in
`tailwind.config.ts`: `fade-in-up`, `tour-card-hover`, `price-shimmer`,
`cta-pulse`.

### B4. Spec empty / error / loading states
**Phase**: 7c onwards · **Priority**: MEDIUM
Brand PDF shows happy-path components only. Skeleton loaders, "no internet"
screens, "booking failed" toasts, "FlightAware verifying…" spinners are
30% of what users actually see. Wireframe v2 — one screen per state class.

---

## 📐 Wireframe — conversion improvements

### W1. Hero is dense; flight form must dominate the fold
**Phase**: 7c (new landing) · **Priority**: HIGH
Wireframe 01 has 8 sections above the CTA. Mobile users mid-flight have
~3 seconds before they bounce. Above-the-fold should be: logo + flight
form + 1 trust signal ("Insured · 4.9★ · 100% on-time"). Push social proof,
how-it-works, tours, map, reviews, CTA all below.

### W2. Add scarcity / urgency to tour cards
**Phase**: 7c or 8 · **Priority**: HIGH
Tourism converts on FOMO. GetYourGuide, Tiqets, Viator all show "3 spots
left for tomorrow's 9am" or "Booked 12 times this week." Wireframe 01
doesn't. Add `availability_today`, `bookings_this_week` columns to tours
table; show as badges.

### W3. Demote "Save for later" in Tour Builder
**Phase**: 8 · **Priority**: MEDIUM
A "Save for later" button sized like CONTINUE is a conversion killer —
gives anxious users an exit ramp. Remove for guests; show only as a
small text link to logged-in users.

### W4. Trust signals per booking step
**Phase**: 8 · **Priority**: MEDIUM
Right rail of wireframe 03 shows price summary only. Competitors put
"12,432 booked this tour" or rotating review snippets there. Each step
without trust = drop-off.

### W5. "Not included" pricing transparency
**Phase**: 8 · **Priority**: MEDIUM
Wireframe 03 shows "INCLUDED" but no "NOT INCLUDED" list (museum fees,
drinks, tips). Surprise costs on tour day destroy reviews and trigger
chargebacks. Add `not_included` JSONB array to tours.

### W6. FlightAware loading state
**Phase**: 8 · **Priority**: MEDIUM
Wireframes show verified badge already present — but the API call takes
200-500ms. Without a spinner, users assume it's broken. Three states for
the badge: `verifying…` (gray spinner) → `verified ✓` (green) |
`unverified ⚠️` (amber, with retry).

---

## 🚀 Wireframe — features missing entirely

### W7. Post-tour growth loop (wireframe 06)
**Phase**: New phase 11 · **Priority**: HIGH for unit economics
One-time tourists become evangelists only with a closing loop. Review
request, referral incentive ("Refer a friend, get €20"), Instagram share
with auto-generated map trace — all absent. Three screens: review email,
review form with photo upload, referral / share screen.

### W8. 18+ confirmation gate for adult-only stops in mobile app
**Phase**: 10 · **Priority**: HIGH for compliance
Adult-only stops need explicit per-session acknowledgment. Compliance risk
on shared/family devices. Legal exposure for EU launch. Modal on first
navigation to After Dark category. Stores in `users.adult_consent_at`.

### W9. Partner dashboard wireframe is missing
**Phase**: 9 (Admin redesign) · **Priority**: LOW
Master plan calls for partner interface (Phase 5), wireframes only cover 5
(no partner view). Decide before phase 9: full separate interface vs.
admin sub-route. If full, commission wireframe 07.

### W10. Cross-step state persistence in Tour Builder → Booking
**Phase**: 8 · **Priority**: MEDIUM
User selects 3 stops in Tour Builder, hits Continue, lands in Booking flow
step 1. What if they change their tour during booking? Wireframe doesn't
spec the back-edit flow. Pick: editable back-link on every booking step,
spec which fields are mutable vs. locked once payment intent created.

---

## 📊 Tracking + ops gaps

### O1. No analytics events specified per page
**Phase**: 7c onwards · **Priority**: MEDIUM
Master plan mentions 13 event types but wireframes don't say where each
fires. Without consistent event names, the analytics service can't compute
funnels. Build a `track(event, props)` helper, send to Plausible /
PostHog / Mixpanel.

### O2. Admin dispatcher needs multi-select / bulk reassign
**Phase**: 9 · **Priority**: MEDIUM
Wireframe 05 dispatcher is drag-and-drop guide → tour. Good for normal
day. Lacks ops-stress affordances: weather alert (reassign 8 tours at
once), guide calls in sick (replace one guide across all their day's
tours). Add right-click context menu on tour rows.

---

## How to use this file

When starting a phase:
1. Read this file's items tagged with that phase number
2. Decide which to bake into the prompt vs. defer
3. After the phase ships, mark addressed items with ✅ + commit hash
4. New observations from each phase: append at the bottom of the relevant section

This file is committed. Future Claude Code sessions should read it
alongside `CLAUDE.md` and `BLUEPRINT_PLUS.md` when starting any phase.
