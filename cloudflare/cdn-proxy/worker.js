/**
 * Layover Legends — Photos CDN proxy
 *
 * Cloudflare Worker that fronts Supabase Storage's `/storage/v1/object/public/photos/*`
 * route. Caches every variant for 1 year at the edge, freeing the origin from serving
 * repeat reads. Variants are content-addressed (filename includes ratio + size + format),
 * so they never change in place — safe to cache forever.
 *
 * Deploy:
 *   1. cd cloudflare/cdn-proxy
 *   2. npx wrangler login
 *   3. npx wrangler secret put SUPABASE_PROJECT_REF
 *      (paste your Supabase project ref, e.g. "idgobxvhbhdymfsfmhae")
 *   4. npx wrangler deploy
 *   5. Add a custom domain in Cloudflare dashboard:
 *        Workers & Pages → cdn-proxy → Settings → Triggers → Custom Domains
 *        → "cdn.layover-legends.com"
 *      (Cloudflare auto-creates the DNS record.)
 *   6. Set NEXT_PUBLIC_PHOTOS_CDN_URL=https://cdn.layover-legends.com in Vercel.
 *      App will use it for variant URLs; falls back to direct Supabase URL if unset.
 *
 * After deploy: ~95% of image requests hit the Cloudflare edge cache instead
 * of going to Supabase, dropping egress bills + serving images in <50ms globally.
 */

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url = new URL(request.url);
    // Only proxy /photos/* to Supabase. Everything else 404s.
    const match = url.pathname.match(/^\/photos\/(.+)$/);
    if (!match) {
      return new Response("Not found", { status: 404 });
    }

    const objectPath = match[1];
    // Reject path traversal / queries
    if (objectPath.includes("..") || objectPath.length > 256) {
      return new Response("Bad request", { status: 400 });
    }

    const projectRef = env.SUPABASE_PROJECT_REF;
    if (!projectRef) {
      return new Response("Misconfigured: SUPABASE_PROJECT_REF not set", { status: 500 });
    }

    const originUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/photos/${objectPath}`;

    // Cloudflare's Cache API
    const cache = caches.default;
    const cacheKey = new Request(originUrl, { method: "GET" });

    let response = await cache.match(cacheKey);
    if (!response) {
      response = await fetch(originUrl, {
        cf: {
          // Tell Cloudflare to cache aggressively at the edge
          cacheEverything: true,
          cacheTtl: 31536000,
        },
      });

      if (!response.ok) {
        // Don't cache errors
        return new Response(`Origin returned ${response.status}`, { status: response.status });
      }

      // Clone + force long cache headers so browsers + CDNs both cache forever
      response = new Response(response.body, response);
      response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
      response.headers.set("X-Cdn-Cache", "MISS");
      // CORS for any origin (public read-only image bucket)
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
      response.headers.set("Timing-Allow-Origin", "*");

      // Stash in edge cache
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    } else {
      // Annotate cached responses
      response = new Response(response.body, response);
      response.headers.set("X-Cdn-Cache", "HIT");
    }

    return response;
  },
};
