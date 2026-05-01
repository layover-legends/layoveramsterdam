---
description: SEO improvements — metadata, structured data, sitemap, performance
---

# SEO: $ARGUMENTS

Layover travelers Google "things to do at Schiphol" while they wait. We
need to be on page 1. SEO compounds — every public page we add is an
asset.

## Per-page metadata

Every public page exports `metadata`:

```ts
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page-specific title — Layover Amsterdam",
  description: "150-character compelling summary using the keyword once.",
  alternates: { canonical: "https://layover-legends.com/<path>" },
  openGraph: {
    title: "OG-specific title",
    description: "OG description",
    url: "https://layover-legends.com/<path>",
    type: "website",
    images: [{ url: "https://…/og.jpg", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};
```

For dynamic routes, export `generateMetadata({ params })`.

## Sitemap

`app/sitemap.ts`:

```ts
import { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();
  const { data: dests } = await supabase
    .from("destinations")
    .select("slug, updated_at")
    .eq("is_active", true);
  return [
    { url: "https://layover-legends.com/", lastModified: new Date(), priority: 1 },
    { url: "https://layover-legends.com/tours", lastModified: new Date(), priority: 0.9 },
    ...(dests ?? []).map((d) => ({
      url: `https://layover-legends.com/stops/${d.slug}`,
      lastModified: d.updated_at ? new Date(d.updated_at) : new Date(),
      priority: 0.7,
    })),
  ];
}
```

## robots.txt

`app/robots.ts`:

```ts
export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/account/", "/auth/", "/api/"] }],
    sitemap: "https://layover-legends.com/sitemap.xml",
  };
}
```

## Structured data (JSON-LD)

For destination detail pages, embed `TouristAttraction` schema:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "TouristAttraction",
      name: dest.name,
      description: dest.description,
      address: { "@type": "PostalAddress", addressLocality: "Amsterdam", addressCountry: "NL", streetAddress: dest.area },
      geo: dest.latitude && dest.longitude
        ? { "@type": "GeoCoordinates", latitude: dest.latitude, longitude: dest.longitude }
        : undefined,
      image: dest.primary_photo_url,
      isAccessibleForFree: !dest.requires_booking,
    }),
  }}
/>
```

For tours: `TouristTrip`. For homepage: `Organization`.

## On-page essentials

- Single `<h1>` per page, descriptive (not just "Welcome")
- Logical heading order (no skipping h2 → h4)
- `alt` text on every `<Image>` — describe the content, not "image of …"
- Internal links use `<Link>` so prefetching works
- Avoid `target="_blank"` on internal links

## Performance (SEO ranking factor)

- Largest Contentful Paint < 2.5 s on mobile 3G
- Cumulative Layout Shift < 0.1 (always set `width`/`height` on images)
- First Input Delay / Interaction to Next Paint < 100 ms
- Lighthouse Performance score > 90

Run `npx lighthouse https://layover-legends.com --view` periodically.

## URL hygiene

- Slugs are lowercase, hyphens, ASCII (we already have a `slugify()` SQL fn)
- Stable URLs — when renaming, redirect old → new with `next.config.js`
  `redirects()` for at least 90 days
- Trailing slash convention: pick one and stick with it (Next default: no trailing slash)

## Content moves the needle

- Each destination detail page is a unique landing page — write 200+ words
  of original copy, not just our bullet description
- Build city-guide cluster pages: "Amsterdam in 4 hours", "What to do at
  Schiphol on a layover", "Free things to do in Amsterdam"
- Internal-link from cluster pages to individual destinations

## Hard rules

- Never block search engines with `<meta name="robots" content="noindex">`
  on a page that should rank
- Never use lorem ipsum on production
- Never duplicate `<title>` across pages
- Never hide text with `display: none` to game keyword density
