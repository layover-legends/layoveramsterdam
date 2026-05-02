import "server-only";
import type { HealthCheck } from "../types";

// Long-lived test token for health checking Google OAuth.
// If not set, we fall back to checking the Google OAuth discovery endpoint.
const TEST_TOKEN = process.env.GOOGLE_OAUTH_TEST_TOKEN ?? "";
const CLIENT_ID = process.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "";

export async function check(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    if (TEST_TOKEN) {
      // Validate the stored test token
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${TEST_TOKEN}`,
        { signal: AbortSignal.timeout(8000) },
      );
      const latency_ms = Date.now() - start;
      const data = (await res.json()) as {
        aud?: string;
        exp?: string;
        error?: string;
        error_description?: string;
      };

      if (!res.ok || data.error) {
        return {
          service: "google",
          status: "degraded",
          latency_ms,
          quota_used: null,
          quota_limit: null,
          quota_unit: null,
          metadata: { method: "token_validation" },
          error_message: data.error_description ?? "Token invalid or expired",
        };
      }

      const expiresAt = data.exp ? new Date(parseInt(data.exp) * 1000).toISOString() : null;
      return {
        service: "google",
        status: "healthy",
        latency_ms,
        quota_used: null,
        quota_limit: null,
        quota_unit: null,
        metadata: {
          method: "token_validation",
          token_expires_at: expiresAt,
        },
        error_message: null,
      };
    }

    // Fallback: check Google's OAuth discovery endpoint is reachable
    const res = await fetch(
      "https://accounts.google.com/.well-known/openid-configuration",
      { signal: AbortSignal.timeout(8000) },
    );
    const latency_ms = Date.now() - start;

    return {
      service: "google",
      status: res.ok ? "healthy" : "degraded",
      latency_ms,
      quota_used: null,
      quota_limit: null,
      quota_unit: null,
      metadata: {
        method: "discovery_endpoint",
        note: "Set GOOGLE_OAUTH_TEST_TOKEN for full validation",
      },
      error_message: res.ok ? null : `Discovery endpoint returned ${res.status}`,
    };
  } catch (e) {
    return {
      service: "google",
      status: "down",
      latency_ms: Date.now() - start,
      quota_used: null,
      quota_limit: null,
      quota_unit: null,
      metadata: {},
      error_message: e instanceof Error ? e.message.slice(0, 200) : "Request failed",
    };
  }
}
