import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import redirectData from "@/lib/generated/redirects.json";

// ── Static redirect map ───────────────────────────────────────────────────────
// Built at deploy time by `scripts/build-redirects.ts` (prebuild hook).
// Imported as a module so it is bundled into the Edge worker at build time —
// zero per-request DB cost, O(1) lookup per request.

type RedirectRow = { entity_type: string; old_slug: string; new_slug: string };

const redirectMap = new Map<string, string>(
  (redirectData as RedirectRow[]).map((r) => [
    `${r.entity_type}:${r.old_slug}`,
    r.new_slug,
  ]),
);

// ── URL prefix → entity_type ──────────────────────────────────────────────────
const PREFIX_TO_ENTITY: Record<string, string> = {
  "/stops/":  "destination",
  "/tours/":  "tour",
  "/shop/":   "addon",
  "/blog/":   "article",
};

// ── Middleware ────────────────────────────────────────────────────────────────
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  for (const [prefix, entityType] of Object.entries(PREFIX_TO_ENTITY)) {
    if (!pathname.startsWith(prefix)) continue;

    // Extract the first path segment after the prefix (the slug).
    const rest = pathname.slice(prefix.length);
    const oldSlug = rest.split("/")[0];
    if (!oldSlug) break;

    const newSlug = redirectMap.get(`${entityType}:${oldSlug}`);
    if (newSlug) {
      const newUrl = req.nextUrl.clone();
      // Preserve any sub-path or query string after the slug segment.
      newUrl.pathname = `${prefix}${newSlug}${rest.slice(oldSlug.length)}`;
      return NextResponse.redirect(newUrl, { status: 301 });
    }

    // Each request matches at most one prefix — stop iterating.
    break;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/stops/:path*", "/tours/:path*", "/shop/:path*", "/blog/:path*"],
};
