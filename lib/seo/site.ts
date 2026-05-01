export const SITE = {
  url: "https://layover-legends.com",
  name: "LayoverAmsterdam",
  twitter: "@layoveramsterdam",
  locale: "en_US",
  /** Default OG image – served by the dynamic /og route */
  defaultOgImage: "https://layover-legends.com/og",
} as const;

export function canonicalFor(path: string): string {
  // path can be relative ("/blog/some-slug") or already absolute.
  if (path.startsWith("http")) return path;
  return new URL(path, SITE.url).toString();
}

/** Build the URL for the dynamic OG image route */
export function ogImageFor(opts: { title?: string; subtitle?: string } = {}): string {
  const p = new URLSearchParams();
  if (opts.title) p.set("title", opts.title);
  if (opts.subtitle) p.set("subtitle", opts.subtitle);
  const qs = p.toString();
  return `${SITE.url}/og${qs ? `?${qs}` : ""}`;
}

/** Build hreflang alternates for a given path (used in generateMetadata). */
export function langAlternates(path: string): Record<string, string> {
  // Inline the codes to keep this file dependency-free.
  const codes = ["en", "fr", "nl", "de", "es", "it", "pt", "zh"] as const;
  return Object.fromEntries(codes.map((c) => [c, `${SITE.url}${path}?lang=${c}`]));
}
