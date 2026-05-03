/** @type {import('next').NextConfig} */

// Content-Security-Policy notes:
//   - 'unsafe-inline' on script-src is required for Next.js App Router inline
//     hydration scripts and JSON-LD <script> tags. A nonce-based strict CSP
//     is the correct long-term fix (Phase 9e); this is the pragmatic baseline.
//   - Stripe Checkout is a server-side redirect — no frame or script embed needed.
//   - Google OAuth is a top-level navigation redirect — no CSP entry needed.
//   - connect-src wss: covers Supabase Realtime if ever enabled.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' js.stripe.com",
  "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
  "font-src 'self' fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mapbox.com https://events.mapbox.com https://api.deepl.com https://api-free.deepl.com https://api.stripe.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  // Prevent browsers from inferring a different MIME type
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Block clickjacking — redundant with frame-ancestors in CSP but belt-and-suspenders
  { key: "X-Frame-Options", value: "DENY" },
  // Enable built-in XSS auditor in older browsers (no-op in modern ones)
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Strict HSTS (Vercel also sets this, but be explicit)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  // Only send origin on cross-origin, no path
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser features we don't need
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig = {
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
        // Apply to all routes
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
