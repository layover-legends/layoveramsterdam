/**
 * Cookie consent helpers — read/write the cookie_consent cookie.
 *
 * Categories:
 *   essential  — always on; session, auth, locale, security
 *   analytics  — Vercel Speed Insights, future Plausible/PostHog
 *   marketing  — future Meta Pixel, Google Ads, retargeting
 *
 * Storage: "cookie_consent" cookie (JSON), 1-year max-age, SameSite=Lax
 * Policy version: bumped here when legal text changes; mismatch triggers re-consent
 */

export const CONSENT_COOKIE_NAME = "cookie_consent";
export const CONSENT_POLICY_VERSION = "1";
export const CONSENT_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

export type ConsentCategory = "essential" | "analytics" | "marketing";

export interface ConsentState {
  essential: true;          // always true — cannot be disabled
  analytics: boolean;
  marketing: boolean;
  version: string;          // policy version — triggers re-consent on mismatch
  timestamp: number;        // unix ms
}

export const DEFAULT_CONSENT: ConsentState = {
  essential: true,
  analytics: false,
  marketing: false,
  version: CONSENT_POLICY_VERSION,
  timestamp: 0,
};

export const FULL_CONSENT: ConsentState = {
  essential: true,
  analytics: true,
  marketing: true,
  version: CONSENT_POLICY_VERSION,
  timestamp: Date.now(),
};

/** Parse the cookie_consent cookie value. Returns null if absent/invalid/stale-version. */
export function parseConsentCookie(cookieValue: string | undefined): ConsentState | null {
  if (!cookieValue) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(cookieValue)) as Partial<ConsentState>;
    if (parsed.version !== CONSENT_POLICY_VERSION) return null;
    return {
      essential: true,
      analytics:  typeof parsed.analytics  === "boolean" ? parsed.analytics  : false,
      marketing:  typeof parsed.marketing  === "boolean" ? parsed.marketing  : false,
      version: CONSENT_POLICY_VERSION,
      timestamp: typeof parsed.timestamp === "number" ? parsed.timestamp : 0,
    };
  } catch {
    return null;
  }
}

/** Serialize consent state to a cookie value string. */
export function serializeConsentCookie(state: ConsentState): string {
  return encodeURIComponent(JSON.stringify({ ...state, timestamp: Date.now() }));
}

/** Build the Set-Cookie header string for the consent cookie. */
export function buildConsentSetCookie(state: ConsentState): string {
  const value = serializeConsentCookie(state);
  return `${CONSENT_COOKIE_NAME}=${value}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax; Secure`;
}

/**
 * Detect DNT (Do Not Track) from a request header value.
 * If DNT=1, we auto-reject optional categories.
 */
export function isDNT(dntHeader: string | null | undefined): boolean {
  return dntHeader === "1";
}

/**
 * Server-side helper: read consent from Next.js cookies().
 * Returns null when no consent has been given (banner should show).
 * Returns DEFAULT_CONSENT when DNT is active.
 */
export function readServerConsent(
  cookieValue: string | undefined,
  dntHeader?: string | null,
): ConsentState | null {
  if (isDNT(dntHeader)) {
    return { ...DEFAULT_CONSENT, timestamp: Date.now() };
  }
  return parseConsentCookie(cookieValue);
}
