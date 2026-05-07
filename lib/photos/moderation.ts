import "server-only";

/**
 * Image moderation via Sightengine.
 *
 * Detects nudity, weapons, drugs, gore, offensive content. Designed to be
 * called once per upload before the variant pipeline starts — failures abort
 * the upload (and refund the sharp work that would otherwise be wasted).
 *
 * Activation:
 *   Set SIGHTENGINE_API_USER + SIGHTENGINE_API_SECRET in Vercel env.
 *   When unset (current default), moderation is skipped — uploads proceed
 *   unmoderated. Suitable for admin-only uploads. Required when opening
 *   user-generated content (review photos, customer uploads).
 *
 * Pricing: $0.001/image at the relevant tier; free tier 500/month.
 *   https://sightengine.com/pricing
 *
 * Models used:
 *   - nudity-2.1 (modern detection covering raw + suggestive)
 *   - wad         (weapons + alcohol + drugs)
 *   - offensive   (offensive symbols, gestures)
 *   - gore        (graphic violence)
 *
 * Threshold rationale: 0.7 raw nudity / 0.7 weapon = high-confidence rejects.
 * Suggestive content (0.4–0.7) → flag for manual review, don't reject.
 */

export type ModerationVerdict = {
  verdict:    "approved" | "manual_review" | "rejected";
  confidence: number;
  reasons:    string[];
  raw?:       unknown;
};

const MODERATION_TIMEOUT_MS = 8_000;
const REJECT_THRESHOLD     = 0.70;
const REVIEW_THRESHOLD     = 0.40;

export async function moderateImage(buffer: Buffer): Promise<ModerationVerdict> {
  const apiUser   = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;
  if (!apiUser || !apiSecret) {
    // Moderation not configured — auto-approve (current behavior)
    return { verdict: "approved", confidence: 0, reasons: ["moderation_disabled"] };
  }

  try {
    const fd = new FormData();
    fd.append("media", new Blob([new Uint8Array(buffer)]));
    fd.append("models", "nudity-2.1,wad,offensive,gore");
    fd.append("api_user",   apiUser);
    fd.append("api_secret", apiSecret);

    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), MODERATION_TIMEOUT_MS);
    const res = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST",
      body:   fd,
      signal: ctrl.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error("[moderation] HTTP", res.status, await res.text().catch(() => ""));
      // Fail-open on API errors — admins can still upload, content gets
      // moderation_status=auto_approved. Better than blocking legitimate work.
      return { verdict: "approved", confidence: 0, reasons: ["moderation_api_error"] };
    }

    const data = await res.json() as Record<string, unknown> & {
      nudity?:    { sexual_activity?: number; sexual_display?: number; erotica?: number; suggestive?: number; mildly_suggestive?: number };
      weapon?:    number;
      alcohol?:   number;
      drugs?:     number;
      offensive?: { prob: number };
      gore?:      { prob: number };
      status?:    string;
    };

    if (data.status !== "success") {
      return { verdict: "approved", confidence: 0, reasons: ["moderation_unparseable"] };
    }

    // Roll up worst score per category
    const nudityScore = Math.max(
      data.nudity?.sexual_activity ?? 0,
      data.nudity?.sexual_display ?? 0,
      data.nudity?.erotica ?? 0,
      data.nudity?.suggestive ?? 0,
    );
    const weaponScore    = data.weapon ?? 0;
    const drugsScore     = data.drugs ?? 0;
    const offensiveScore = data.offensive?.prob ?? 0;
    const goreScore      = data.gore?.prob ?? 0;

    const reasons: string[] = [];
    let max = 0;
    if (nudityScore    >= REJECT_THRESHOLD) reasons.push(`nudity:${nudityScore.toFixed(2)}`);
    if (weaponScore    >= REJECT_THRESHOLD) reasons.push(`weapon:${weaponScore.toFixed(2)}`);
    if (drugsScore     >= REJECT_THRESHOLD) reasons.push(`drugs:${drugsScore.toFixed(2)}`);
    if (offensiveScore >= REJECT_THRESHOLD) reasons.push(`offensive:${offensiveScore.toFixed(2)}`);
    if (goreScore      >= REJECT_THRESHOLD) reasons.push(`gore:${goreScore.toFixed(2)}`);
    max = Math.max(nudityScore, weaponScore, drugsScore, offensiveScore, goreScore);

    if (reasons.length > 0) {
      return { verdict: "rejected", confidence: max, reasons, raw: data };
    }

    if (max >= REVIEW_THRESHOLD) {
      const flags: string[] = [];
      if (nudityScore    >= REVIEW_THRESHOLD) flags.push(`nudity:${nudityScore.toFixed(2)}`);
      if (weaponScore    >= REVIEW_THRESHOLD) flags.push(`weapon:${weaponScore.toFixed(2)}`);
      if (drugsScore     >= REVIEW_THRESHOLD) flags.push(`drugs:${drugsScore.toFixed(2)}`);
      if (offensiveScore >= REVIEW_THRESHOLD) flags.push(`offensive:${offensiveScore.toFixed(2)}`);
      if (goreScore      >= REVIEW_THRESHOLD) flags.push(`gore:${goreScore.toFixed(2)}`);
      return { verdict: "manual_review", confidence: max, reasons: flags, raw: data };
    }

    return { verdict: "approved", confidence: max, reasons: [] };
  } catch (err) {
    console.error("[moderation] error:", err);
    // Fail-open on network errors — same rationale as API errors above.
    return { verdict: "approved", confidence: 0, reasons: ["moderation_exception"] };
  }
}
