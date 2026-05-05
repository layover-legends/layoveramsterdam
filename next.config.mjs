/** @type {import('next').NextConfig} */

// Content-Security-Policy notes:
//   - 'unsafe-inline' on script-src is required for Next.js App Router inline
//     hydration scripts and JSON-LD <script> tags. A nonce-based strict CSP
//     is the correct long-term fix (Phase 9e); this is the pragmatic baseline.
//   - Stripe Checkout is a server-side redirect — no frame or script embed needed.
//   - Google OAuth is a top-level navigation redirect — no CSP entry needed.
//   - connect-src wss: covers Supabase Realtime if ever enabled.
//   - worker-src 'self' allows /sw.js service worker registration (Phase 9c PWA).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' js.stripe.com",
  "worker-src 'self'",
  "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
  "font-src 'self' fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mapbox.com https://events.mapbox.com https://api.deepl.com https://api-free.deepl.com https://api.stripe.com https://api.exchangerate.host https://challenges.cloudflare.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com",
  "script-src-elem 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options",              value: "nosniff" },
  { key: "X-Frame-Options",                     value: "DENY" },
  { key: "X-XSS-Protection",                    value: "1; mode=block" },
  { key: "Strict-Transport-Security",           value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Referrer-Policy",                     value: "strict-origin-when-cross-origin" },
  // Geolocation blocked site-wide; /driver/* overrides to geolocation=(self) below
  { key: "Permissions-Policy",                  value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy",             value: CSP },
  { key: "Cross-Origin-Opener-Policy",          value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy",        value: "cross-origin" },
  { key: "X-Permitted-Cross-Domain-Policies",   value: "none" },
  { key: "X-DNS-Prefetch-Control",              value: "on" },
];

// Driver PWA routes need geolocation for the SOS button
const DRIVER_HEADERS = SECURITY_HEADERS.map((h) =>
  h.key === "Permissions-Policy"
    ? { key: h.key, value: "camera=(), microphone=(), geolocation=(self), payment=()" }
    : h
);

const nextConfig = {
  poweredByHeader: false,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "idgobxvhbhdymfsfmhae.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/driver/(.*)",
        headers: DRIVER_HEADERS,
      },
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
