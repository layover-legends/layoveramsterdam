/**
 * Canonical catalog of every user-facing UI string in the app.
 *
 * Each entry becomes one translations row:
 *   entity_type = 'ui'
 *   entity_id   = '00000000-0000-0000-0000-000000000001'
 *   field       = <key>
 *   language    = <locale>
 *
 * Keys use dot.case: <area>.<element>[.<variant>]
 * Values are the canonical English text.
 * {tokens} are interpolated at render time by tpl() from lib/i18n/ui.ts.
 *
 * After adding a key, run:
 *   npx tsx scripts/seed-ui-strings.ts
 * to push EN source + DeepL translations into the database.
 */
export const UI_STRINGS = {
  // ── Auth ───────────────────────────────────────────────────────────────────
  "auth.signin_google":             "Sign in with Google for early access",
  "auth.redirecting":               "Redirecting…",
  "auth.signin_error_generic":      "Something went wrong",
  "auth.signout":                   "Sign out",
  "auth.select_language":           "Select language",

  // ── Navigation ────────────────────────────────────────────────────────────
  "nav.home":                       "Home",
  "nav.blog":                       "Blog",
  "nav.tours":                      "Tours",
  "nav.stops":                      "Stops",

  // ── Homepage ──────────────────────────────────────────────────────────────
  "homepage.coming_soon":           "Coming Soon",
  "homepage.tagline":               "Turn your Schiphol layover into a legend. Premium city tours between flights — launching soon.",
  "homepage.go_to_account":         "Go to your account",
  "homepage.signed_in_as":          "Signed in as {email}.",
  "homepage.early_access":          "Join the early-access list. We'll only email you once — when tours open.",
  "homepage.auth_error":            "Sign-in didn't complete. Please try again.",
  "homepage.auth_required":         "Please sign in to view your account.",
  "homepage.admin_only":            "That area is for admins only.",

  // ── Stops teaser ──────────────────────────────────────────────────────────
  "stops_teaser.discover":          "What you'll discover",
  "stops_teaser.free_count":        "{count} free stops, hand-picked.",
  "stops_teaser.description":       "Every layover, packed with the things Amsterdam does best — and every one of them is free. No tickets, no queues. Just the city.",
  "stops_teaser.categories":        "Across {count} categories",
  "stops_teaser.signup_cta":        "Sign up above to be the first to plan your tour when bookings open.",

  // ── Blog ──────────────────────────────────────────────────────────────────
  "blog.index.title":               "Layover Guides",
  "blog.index.description":         "Amsterdam layover tips, canal walk guides, and everything you need to turn a Schiphol stopover into an unforgettable experience.",
  "blog.index.header_description":  "Everything you need to make the most of your Amsterdam stopover.",
  "blog.empty":                     "No articles published yet.",
  "blog.back":                      "← Back to all articles",

  // ── Account ───────────────────────────────────────────────────────────────
  "account.welcome":                "Welcome, {name}",
  "account.subtitle":               "Your Layover Amsterdam account",
  "account.details_title":          "Your details",
  "account.details_hint":           "We'll use these for your bookings, your launch invite, and to show prices in your currency. Nothing is shared.",
  "account.field.full_name":        "Full name",
  "account.field.full_name_hint":   "As you'd like it on your booking",
  "account.field.email":            "Email",
  "account.field.email_hint":       "Managed by your Google account.",
  "account.field.phone":            "Phone",
  "account.field.nationality":      "Nationality",
  "account.field.language":         "Preferred language",
  "account.field.newsletter_label": "Email me at launch",
  "account.field.newsletter_hint":  "One email when tours go live, plus occasional travel-tip emails. You can turn this off any time.",
  "account.field.select":           "Select…",

  // ── Common actions ────────────────────────────────────────────────────────
  "common.save_changes":            "Save changes",
  "common.saving":                  "Saving…",
  "common.saved":                   "Saved.",
  "common.back_to_home":            "Back to home",

  // ── Footer / site ─────────────────────────────────────────────────────────
  "site.tagline":                   "Curated Amsterdam layovers",
  "footer.copyright":               "© {year} Layover Amsterdam. All rights reserved.",
  "footer.back_to_site":            "← Back to site",
} as const;

export type UIStringKey = keyof typeof UI_STRINGS;
