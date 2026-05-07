# Layover Legends — Photos CDN Proxy

Cloudflare Worker that fronts Supabase Storage's public `photos` bucket.
Caches every variant for 1 year at the edge → ~95% cache hit rate, ~50ms
global delivery, near-zero egress from Supabase.

## Why

Without this Worker, every photo render goes:

```
browser → Supabase Storage (Frankfurt)
```

Supabase charges egress per GB ($0.09/GB after the 250GB Pro tier cap).
At launch scale that's pennies, but it scales linearly with traffic.

With the Worker:

```
browser → Cloudflare edge cache (HIT 95% of time)
                              ↓ (MISS — first hit only)
                       Supabase Storage
```

Cloudflare bandwidth is unlimited and free on the Workers free plan
(100,000 requests/day, then $5/mo for 10M).

## Deploy steps

```bash
cd cloudflare/cdn-proxy

# 1. Authenticate
npx wrangler login

# 2. Set the Supabase project ref as a secret
npx wrangler secret put SUPABASE_PROJECT_REF
# When prompted, paste: idgobxvhbhdymfsfmhae

# 3. Deploy
npx wrangler deploy
# This pushes worker.js to Cloudflare. You'll get a *.workers.dev URL — that
# works but isn't pretty. Continue to step 4 for the production hostname.

# 4. Bind the custom domain
#    Cloudflare dashboard → Workers & Pages → layover-legends-cdn-proxy
#      → Settings → Triggers → Custom Domains
#      → Add "cdn.layover-legends.com"
#    Cloudflare auto-creates the DNS records. Wait ~30s for propagation.

# 5. Verify
curl -I https://cdn.layover-legends.com/photos/<photoId>/16x9-1200.webp
# Should return 200 with `cache-control: public, max-age=31536000, immutable`
# and `x-cdn-cache: MISS` on first hit, `HIT` on second.

# 6. Tell the app to use the CDN
#    In Vercel project settings → Environment Variables, add:
#      NEXT_PUBLIC_PHOTOS_CDN_URL = https://cdn.layover-legends.com
#    Then redeploy. After deploy, all variant URLs use the CDN.
```

## Architecture

The Worker is **read-only**. Writes (uploads, deletes) still go directly
to Supabase via the admin client — they don't pass through Cloudflare.
This is intentional: image edits should bypass the CDN to avoid stale
data, while reads cache aggressively because variants are immutable
(content-addressed filenames).

## Rolling back

If anything goes wrong, unset `NEXT_PUBLIC_PHOTOS_CDN_URL` in Vercel and
redeploy. The app falls back to direct Supabase URLs immediately. The
Worker can stay deployed without affecting anything.

## Costs

- Cloudflare Workers free plan: 100k req/day, then $5/mo for 10M.
- Storage egress saved: every cache hit avoids Supabase egress.
- DNS: free on Cloudflare.

For Layover Legends scale (~1000 visitors/day × 5 image renders), the
free plan covers everything indefinitely.
