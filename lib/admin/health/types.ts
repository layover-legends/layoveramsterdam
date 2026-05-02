// Client-safe types. No server-only imports.

export type ServiceName =
  | "supabase"
  | "vercel"
  | "mapbox"
  | "deepl"
  | "resend"
  | "stripe"
  | "cloudflare"
  | "google"
  | "flightaware";

export type HealthStatus = "healthy" | "degraded" | "down" | "unknown";

export type HealthCheck = {
  service: ServiceName;
  status: HealthStatus;
  latency_ms: number | null;
  quota_used: number | null;
  quota_limit: number | null;
  quota_unit: string | null;
  metadata: Record<string, unknown>;
  error_message: string | null;
};

export type HealthSnapshot = HealthCheck & {
  id: string;
  checked_at: string;
};

export type AlertThreshold = {
  service: string;
  metric: string;
  warn_at: number;
  crit_at: number;
  is_active: boolean;
};

export type ServiceHistoryPoint = {
  checked_at: string;
  status: HealthStatus;
  latency_ms: number | null;
  quota_used: number | null;
  quota_limit: number | null;
};

export const SERVICE_LABELS: Record<ServiceName, { label: string; icon: string }> = {
  supabase:    { label: "Supabase",    icon: "🗄️" },
  vercel:      { label: "Vercel",      icon: "▲" },
  mapbox:      { label: "Mapbox",      icon: "🗺️" },
  deepl:       { label: "DeepL",       icon: "🌐" },
  resend:      { label: "Resend",      icon: "📧" },
  stripe:      { label: "Stripe",      icon: "💳" },
  cloudflare:  { label: "Cloudflare",  icon: "☁️" },
  google:      { label: "Google",      icon: "🔐" },
  flightaware: { label: "FlightAware", icon: "✈️" },
};

export const ALL_SERVICES: ServiceName[] = [
  "supabase", "vercel", "mapbox", "deepl", "resend",
  "stripe", "cloudflare", "google", "flightaware",
];
