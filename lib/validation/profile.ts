import { LANGUAGE_CODES } from "@/lib/constants/locales";
import { COUNTRY_CODES } from "@/lib/constants/countries";
import type { ProfileUpdate } from "@/lib/types/profile";

export type ValidationResult =
  | { ok: true; data: ProfileUpdate }
  | { ok: false; error: string };

/**
 * Validates a profile-update FormData payload server-side.
 * Returns either the cleaned data or a single user-facing error message.
 *
 * Server-side validation is the source of truth. Even if the client sends
 * crafted requests, this is the gate. Pair with RLS for defense-in-depth.
 */
export function validateProfileUpdate(input: FormData): ValidationResult {
  const fullNameRaw = (input.get("full_name") || "").toString().trim();
  const phoneRaw = (input.get("phone") || "").toString().trim();
  const nationalityRaw = (input.get("nationality") || "").toString().trim();
  const langRaw = (input.get("preferred_language") || "").toString().trim();
  const marketingOptIn = input.get("marketing_opt_in") === "on";

  const fullName = fullNameRaw || null;
  const phone = phoneRaw || null;
  const nationality = nationalityRaw ? nationalityRaw.toUpperCase() : null;
  const preferred_language = langRaw || null;

  if (fullName !== null && (fullName.length < 1 || fullName.length > 100)) {
    return { ok: false, error: "Name must be between 1 and 100 characters." };
  }

  if (phone !== null) {
    // Allow international format with + prefix; strip common formatting chars.
    const cleaned = phone.replace(/[\s\-().]/g, "");
    if (!/^\+?[0-9]{6,15}$/.test(cleaned)) {
      return {
        ok: false,
        error:
          "Phone must be 6–15 digits, optionally starting with +.",
      };
    }
  }

  if (nationality !== null && !COUNTRY_CODES.has(nationality)) {
    return { ok: false, error: "Please pick a country from the list." };
  }

  if (preferred_language !== null && !LANGUAGE_CODES.has(preferred_language)) {
    return { ok: false, error: "Please pick a supported language." };
  }

  return {
    ok: true,
    data: {
      full_name: fullName,
      phone,
      nationality,
      preferred_language,
      marketing_opt_in: marketingOptIn,
    },
  };
}
